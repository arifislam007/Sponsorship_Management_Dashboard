import { Router } from 'express';
import { query } from '../db.js';

export const monitoringRouter = Router();

const MONITORING_ITEMS = [
  { key: 'student_attendance_90',       label: 'শিক্ষার্থীদের উপস্থিতি (৯০% বা তার বেশি)' },
  { key: 'teacher_on_time',             label: 'শিক্ষক সময়মতো উপস্থিত' },
  { key: 'syllabus_followed',           label: 'সিলেবাস অনুযায়ী পাঠদান' },
  { key: 'homework_given_evaluated',    label: 'বাড়ির কাজ দেওয়া ও মূল্যায়ন' },
  { key: 'student_participation',       label: 'শিক্ষার্থীদের পাঠে অংশগ্রহণ' },
  { key: 'language_practice',           label: 'বাংলা ও ইংরেজি ভাষায় কথা বলার অভ্যাস' },
  { key: 'math_progress',              label: 'গণিত চর্চার অগ্রগতি' },
  { key: 'classroom_clean',            label: 'শ্রেণিকক্ষ পরিচ্ছন্ন' },
  { key: 'teacher_student_relation',   label: 'শিক্ষক-শিক্ষার্থী সম্পর্ক ভালো' },
  { key: 'learning_materials',         label: 'শিক্ষাসামগ্রী ব্যবহার' },
  { key: 'weak_students_support',      label: 'দুর্বল শিক্ষার্থীদের সহায়তা' },
  { key: 'talented_students_encouraged', label: 'মেধাবী শিক্ষার্থীদের উৎসাহ প্রদান' },
  { key: 'parent_communication',       label: 'অভিভাবকের সঙ্গে যোগাযোগ' },
  { key: 'classroom_environment',      label: 'শ্রেণিকক্ষের পরিবেশ সুন্দর' },
];

function calcRating(pct) {
  if (pct >= 90) return 'চমৎকার (৯০–১০০%)';
  if (pct >= 80) return 'ভালো (৮০–৮৯%)';
  if (pct >= 70) return 'সন্তোষজনক (৭০–৭৯%)';
  return 'উন্নতি প্রয়োজন (৭০%-এর নিচে)';
}

monitoringRouter.get('/', async (req, res, next) => {
  try {
    const { status, class_id, from_date, to_date, limit = 50, offset = 0 } = req.query;
    const params = [];
    const clauses = [];

    if (status)    { params.push(status);         clauses.push(`f.status = $${params.length}`); }
    if (class_id)  { params.push(Number(class_id)); clauses.push(`f.class_id = $${params.length}`); }
    if (from_date) { params.push(from_date);      clauses.push(`f.monitoring_date >= $${params.length}`); }
    if (to_date)   { params.push(to_date);        clauses.push(`f.monitoring_date <= $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countR = await query(`SELECT COUNT(*)::int AS total FROM sc_monitoring_forms f ${where}`, params);
    params.push(Number(limit), Number(offset));
    const r = await query(
      `SELECT f.* FROM sc_monitoring_forms f ${where}
       ORDER BY f.monitoring_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: r.rows, total: countR.rows[0].total });
  } catch (err) { next(err); }
});

monitoringRouter.get('/:id', async (req, res, next) => {
  try {
    const [formR, itemsR] = await Promise.all([
      query(`SELECT * FROM sc_monitoring_forms WHERE id=$1`, [Number(req.params.id)]),
      query(`SELECT * FROM sc_monitoring_items WHERE form_id=$1 ORDER BY id`, [Number(req.params.id)]),
    ]);
    if (!formR.rows.length) return res.status(404).json({ message: 'Form not found' });

    // Fill in any missing items (so frontend always gets all 14)
    const savedKeys = new Set(itemsR.rows.map(i => i.item_key));
    const allItems = MONITORING_ITEMS.map(mi => {
      const saved = itemsR.rows.find(i => i.item_key === mi.key);
      return saved || { form_id: Number(req.params.id), item_key: mi.key, item_label: mi.label, response: null, comment: null };
    });

    res.json({ ...formR.rows[0], items: allItems });
  } catch (err) { next(err); }
});

monitoringRouter.post('/', async (req, res, next) => {
  try {
    const { monitoring_date, class_id, class_name, branch, class_teacher, observer_name } = req.body;
    if (!observer_name?.trim()) return res.status(400).json({ message: 'Observer name is required' });
    if (!monitoring_date) return res.status(400).json({ message: 'Date is required' });

    const last = await query(`SELECT form_code FROM sc_monitoring_forms ORDER BY id DESC LIMIT 1`);
    let seq = 1;
    if (last.rows.length) { const m = last.rows[0].form_code?.match(/(\d+)$/); if (m) seq = parseInt(m[1], 10) + 1; }
    const form_code = `MON-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(seq).padStart(4, '0')}`;

    const created_by = req.user?.username || 'System';
    const r = await query(
      `INSERT INTO sc_monitoring_forms
         (form_code, monitoring_date, class_id, class_name, branch, class_teacher, observer_name, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [form_code, monitoring_date, class_id || null, class_name || null,
       branch || null, class_teacher || null, observer_name.trim(), created_by]
    );
    const form = r.rows[0];

    // Insert default items
    for (const mi of MONITORING_ITEMS) {
      await query(
        `INSERT INTO sc_monitoring_items (form_id, item_key, item_label) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [form.id, mi.key, mi.label]
      );
    }

    res.status(201).json(form);
  } catch (err) { next(err); }
});

monitoringRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      monitoring_date, class_id, class_name, branch, class_teacher, observer_name,
      good_points, improvement_areas, next_week_actions, items,
    } = req.body;

    // Update items and compute score
    let yes_count = 0;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.response === true) yes_count++;
        await query(
          `INSERT INTO sc_monitoring_items (form_id, item_key, item_label, response, comment)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (form_id, item_key)
           DO UPDATE SET response=$4, comment=$5`,
          [id, item.item_key, item.item_label, item.response, item.comment || null]
        );
      }
    } else {
      const r = await query(`SELECT COUNT(*) FILTER (WHERE response=true)::int AS y FROM sc_monitoring_items WHERE form_id=$1`, [id]);
      yes_count = r.rows[0]?.y ?? 0;
    }

    const total_items = MONITORING_ITEMS.length;
    const score_percent = Math.round((yes_count / total_items) * 100);
    const overall_rating = calcRating(score_percent);

    const r = await query(
      `UPDATE sc_monitoring_forms SET
         monitoring_date=$1, class_id=$2, class_name=$3, branch=$4, class_teacher=$5,
         observer_name=$6, good_points=$7, improvement_areas=$8, next_week_actions=$9,
         yes_count=$10, score_percent=$11, overall_rating=$12, updated_at=CURRENT_TIMESTAMP
       WHERE id=$13 RETURNING *`,
      [monitoring_date, class_id || null, class_name || null, branch || null, class_teacher || null,
       observer_name, good_points || null, improvement_areas || null, next_week_actions || null,
       yes_count, score_percent, overall_rating, id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Form not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

monitoringRouter.post('/:id/submit', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const r = await query(
      `UPDATE sc_monitoring_forms SET status='Submitted', submitted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND status='Draft' RETURNING *`,
      [id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Form not found or already submitted' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

monitoringRouter.delete('/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM sc_monitoring_forms WHERE id=$1 AND status='Draft'`, [Number(req.params.id)]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// Reports
monitoringRouter.get('/reports/by-class', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT class_name, COUNT(*)::int AS total_forms,
              COUNT(*) FILTER (WHERE status='Submitted')::int AS submitted,
              ROUND(AVG(score_percent), 1) AS avg_score
       FROM sc_monitoring_forms
       GROUP BY class_name ORDER BY class_name`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

monitoringRouter.get('/reports/by-observer', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT observer_name, COUNT(*)::int AS total_forms,
              COUNT(*) FILTER (WHERE status='Submitted')::int AS submitted,
              ROUND(AVG(score_percent), 1) AS avg_score
       FROM sc_monitoring_forms
       GROUP BY observer_name ORDER BY observer_name`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

// Evaluation analysis: overall summary stats
monitoringRouter.get('/reports/summary', async (req, res, next) => {
  try {
    const { from_date, to_date, class_id } = req.query;
    const params = []; const conds = [];
    if (from_date) { params.push(from_date); conds.push(`monitoring_date >= $${params.length}`); }
    if (to_date)   { params.push(to_date);   conds.push(`monitoring_date <= $${params.length}`); }
    if (class_id)  { params.push(Number(class_id)); conds.push(`class_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [sumR, classR] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status='Submitted')::int AS submitted,
                    ROUND(AVG(score_percent),1) AS avg_score,
                    ROUND(MIN(score_percent),1) AS min_score,
                    ROUND(MAX(score_percent),1) AS max_score
             FROM sc_monitoring_forms ${where}`, params),
      query(`SELECT class_name,
                    ROUND(AVG(score_percent),1) AS avg_score,
                    COUNT(*)::int AS total
             FROM sc_monitoring_forms ${where}
             GROUP BY class_name ORDER BY avg_score DESC NULLS LAST`, params),
    ]);
    res.json({
      ...sumR.rows[0],
      by_class: classR.rows,
    });
  } catch (err) { next(err); }
});

// Evaluation analysis: per-item YES/NO breakdown
monitoringRouter.get('/reports/by-item', async (req, res, next) => {
  try {
    const { from_date, to_date, class_id } = req.query;
    const params = []; const conds = ['f.status = \'Submitted\''];
    if (from_date) { params.push(from_date); conds.push(`f.monitoring_date >= $${params.length}`); }
    if (to_date)   { params.push(to_date);   conds.push(`f.monitoring_date <= $${params.length}`); }
    if (class_id)  { params.push(Number(class_id)); conds.push(`f.class_id = $${params.length}`); }
    const where = `WHERE ${conds.join(' AND ')}`;

    const r = await query(`
      SELECT i.item_key, i.item_label,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE i.response = true)::int  AS yes_count,
             COUNT(*) FILTER (WHERE i.response = false)::int AS no_count,
             ROUND(COUNT(*) FILTER (WHERE i.response = true)::DECIMAL / NULLIF(COUNT(*),0) * 100, 1) AS yes_rate
      FROM sc_monitoring_items i
      JOIN sc_monitoring_forms f ON f.id = i.form_id
      ${where}
      GROUP BY i.item_key, i.item_label
      ORDER BY yes_rate ASC NULLS LAST
    `, params);
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});
