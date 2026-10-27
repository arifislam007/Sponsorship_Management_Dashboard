import { Router } from 'express';
import { query } from '../db.js';

export const routineRouter = Router();

// Teacher name/designation/phone are resolved live via a direct JOIN against
// hr_employees — school-backend and hr-backend share the same Postgres
// database, so this is a normal cross-table JOIN, not a cross-service call.
const SELECT_SQL = `
  SELECT rp.id, rp.class_id, rp.day_of_week, rp.period_number, rp.period_span, rp.start_time, rp.end_time,
         rp.subject_ids,
         COALESCE((SELECT array_agg(sub.name ORDER BY sub.name) FROM sc_subjects sub WHERE sub.id = ANY(rp.subject_ids)), ARRAY[]::VARCHAR[]) AS subject_names,
         rp.teacher_employee_id, e.full_name AS teacher_name, e.mobile AS teacher_phone, des.title AS teacher_designation,
         rp.classroom_id, COALESCE(cr.name, defcr.name) AS classroom_name,
         COALESCE(cr.capacity, defcr.capacity) AS classroom_capacity,
         rp.created_at, rp.updated_at
  FROM sc_routine_periods rp
  LEFT JOIN hr_employees e ON e.id = rp.teacher_employee_id
  LEFT JOIN hr_designations des ON des.id = e.designation_id
  LEFT JOIN sc_classrooms cr ON cr.id = rp.classroom_id
  LEFT JOIN sc_classes c ON c.id = rp.class_id
  LEFT JOIN sc_classrooms defcr ON defcr.id = c.classroom_id
`;

routineRouter.get('/', async (req, res, next) => {
  try {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ message: 'classId is required' });
    const r = await query(
      `${SELECT_SQL} WHERE rp.class_id = $1 ORDER BY rp.day_of_week, rp.period_number`,
      [Number(classId)]
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

routineRouter.get('/school', async (req, res, next) => {
  try {
    const r = await query(
      `${SELECT_SQL} WHERE c.is_active ORDER BY rp.class_id, rp.day_of_week, rp.period_number`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

// Upsert one (class, day, period) slot, optionally spanning several
// consecutive periods as one merged "cluster" block (e.g. a 2-hour class).
// Conflict checks compare period RANGES (period_number .. period_number +
// period_span - 1), not just an exact period match, so a double period
// correctly blocks a teacher/classroom/same-class slot anywhere inside it.
routineRouter.put('/slot', async (req, res, next) => {
  try {
    const {
      class_id, day_of_week, period_number, period_span, start_time, end_time,
      subject_ids, teacher_employee_id, classroom_id,
    } = req.body || {};
    if (!class_id || !day_of_week || !period_number) {
      return res.status(400).json({ message: 'class_id, day_of_week and period_number are required' });
    }
    const span = Math.max(1, Number(period_span) || 1);
    const rangeEnd = Number(period_number) + span - 1;
    // Range-overlap test shared by every check below: two spans [a,b] and
    // [c,d] overlap iff a <= d AND c <= b.
    const overlapClause = `rp.period_number <= $3 AND (rp.period_number + rp.period_span - 1) >= $4`;

    // Morning and Day classes run at different clock times, so a teacher or
    // room "busy" in one shift doesn't conflict with the other shift even at
    // the same nominal period number — conflicts are scoped to classes in
    // the same shift as the class being edited.
    const shiftClause = `c.shift = (SELECT shift FROM sc_classes WHERE id = $5)`;

    if (teacher_employee_id) {
      const conflict = await query(
        `SELECT rp.id, c.name AS class_name FROM sc_routine_periods rp
         JOIN sc_classes c ON c.id = rp.class_id
         WHERE rp.teacher_employee_id = $1 AND rp.day_of_week = $2 AND rp.class_id <> $5 AND ${shiftClause} AND ${overlapClause}`,
        [Number(teacher_employee_id), Number(day_of_week), rangeEnd, Number(period_number), Number(class_id)]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({ message: `Teacher is already scheduled for ${conflict.rows[0].class_name} at this period` });
      }
    }
    if (classroom_id) {
      const conflict = await query(
        `SELECT rp.id, c.name AS class_name FROM sc_routine_periods rp
         JOIN sc_classes c ON c.id = rp.class_id
         WHERE rp.classroom_id = $1 AND rp.day_of_week = $2 AND rp.class_id <> $5 AND ${shiftClause} AND ${overlapClause}`,
        [Number(classroom_id), Number(day_of_week), rangeEnd, Number(period_number), Number(class_id)]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({ message: `This classroom is already booked by ${conflict.rows[0].class_name} at this period` });
      }
    }
    {
      // Any other entry in the same class/day whose own span covers part of
      // this range blocks the placement — covers both "this span reaches
      // into an occupied period" and "this period is inside someone else's
      // existing cluster" (checked even when span === 1, since a plain
      // single-period slot can still land inside another entry's cluster).
      const selfOverlap = await query(
        `SELECT id FROM sc_routine_periods rp
         WHERE rp.class_id = $1 AND rp.day_of_week = $2 AND rp.period_number <> $3
           AND rp.period_number <= $4 AND (rp.period_number + rp.period_span - 1) >= $3`,
        [Number(class_id), Number(day_of_week), Number(period_number), rangeEnd]
      );
      if (selfOverlap.rows.length > 0) {
        return res.status(409).json({ message: span > 1 ? `Periods ${Number(period_number) + 1}–${rangeEnd} already have an entry — clear them first` : 'This period is already covered by another entry\'s span — clear it first' });
      }
    }

    const subjectIdList = Array.isArray(subject_ids) ? subject_ids.map(Number).filter(Boolean) : [];
    const r = await query(
      `INSERT INTO sc_routine_periods (class_id, day_of_week, period_number, period_span, start_time, end_time, subject_ids, teacher_employee_id, classroom_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (class_id, day_of_week, period_number) DO UPDATE SET
         period_span = EXCLUDED.period_span,
         start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
         subject_ids = EXCLUDED.subject_ids, teacher_employee_id = EXCLUDED.teacher_employee_id,
         classroom_id = EXCLUDED.classroom_id, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [Number(class_id), Number(day_of_week), Number(period_number), span, start_time || null, end_time || null,
        subjectIdList, teacher_employee_id ? Number(teacher_employee_id) : null,
        classroom_id ? Number(classroom_id) : null]
    );
    const full = await query(`${SELECT_SQL} WHERE rp.id = $1`, [r.rows[0].id]);
    res.json(full.rows[0]);
  } catch (err) { next(err); }
});

routineRouter.delete('/slot/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM sc_routine_periods WHERE id = $1`, [Number(req.params.id)]);
    res.status(204).end();
  } catch (err) { next(err); }
});
