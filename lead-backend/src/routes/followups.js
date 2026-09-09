import { Router } from 'express';
import { query } from '../db.js';

export const followupsRouter = Router();

followupsRouter.get('/', async (req, res, next) => {
  try {
    const { lead_id, due_before, date, status, limit = 100, offset = 0 } = req.query;
    const params = [];
    const clauses = ['1=1'];

    if (lead_id)    { params.push(Number(lead_id)); clauses.push(`f.lead_id = $${params.length}`); }
    if (due_before) { params.push(due_before);       clauses.push(`f.next_followup_date <= $${params.length}`); }
    if (date)       { params.push(date);             clauses.push(`f.followup_date = $${params.length}`); }
    if (status)     { params.push(status);           clauses.push(`l.status = $${params.length}`); }

    const where = `WHERE ${clauses.join(' AND ')}`;
    params.push(Math.min(Number(limit), 200), Math.max(Number(offset), 0));

    const result = await query(
      `SELECT f.*, l.full_name AS lead_name, l.phone AS lead_phone, l.status AS lead_status
       FROM lead_followups f
       JOIN lead_leads l ON l.id = f.lead_id
       ${where}
       ORDER BY f.followup_date DESC, f.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

const MAX_FOLLOWUP_ATTEMPTS = 5;

followupsRouter.post('/', async (req, res, next) => {
  try {
    const { lead_id, followup_date, method, outcome, next_followup_date, created_by, new_status, new_course_id } = req.body;
    if (!lead_id) return res.status(400).json({ message: 'lead_id is required' });

    const countResult = await query('SELECT COUNT(*)::int AS cnt FROM lead_followups WHERE lead_id=$1', [Number(lead_id)]);
    const attemptNumber = countResult.rows[0].cnt + 1;
    if (attemptNumber > MAX_FOLLOWUP_ATTEMPTS) {
      return res.status(400).json({ message: `Maximum of ${MAX_FOLLOWUP_ATTEMPTS} follow-up attempts reached for this lead` });
    }

    const r = await query(
      `INSERT INTO lead_followups (lead_id, attempt_number, followup_date, method, outcome, next_followup_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [Number(lead_id), attemptNumber, followup_date || new Date().toISOString().slice(0, 10), method || 'Call',
       outcome?.trim() || null, next_followup_date || null, created_by?.trim() || null]
    );

    if (new_status) {
      await query(`UPDATE lead_leads SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [new_status, Number(lead_id)]);
    }
    if (new_course_id) {
      await query(`UPDATE lead_leads SET course_id=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [Number(new_course_id), Number(lead_id)]);
    }

    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

followupsRouter.put('/:id', async (req, res, next) => {
  try {
    const { followup_date, method, outcome, next_followup_date, created_by } = req.body;
    const r = await query(
      `UPDATE lead_followups SET followup_date=$1, method=$2, outcome=$3, next_followup_date=$4, created_by=$5
       WHERE id=$6 RETURNING *`,
      [followup_date, method, outcome?.trim() || null, next_followup_date || null, created_by?.trim() || null, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Follow-up not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

followupsRouter.delete('/:id', async (req, res, next) => {
  try {
    const r = await query('DELETE FROM lead_followups WHERE id=$1', [Number(req.params.id)]);
    if (!r.rowCount) return res.status(404).json({ message: 'Follow-up not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});
