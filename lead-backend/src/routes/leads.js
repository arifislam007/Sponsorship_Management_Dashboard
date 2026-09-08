import { Router } from 'express';
import { query } from '../db.js';

export const leadsRouter = Router();

const STATUSES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Admitted', 'Lost'];

// ── List ──────────────────────────────────────────────────────────────────────

leadsRouter.get('/', async (req, res, next) => {
  try {
    const {
      status, course_id, source, search,
      limit = 50, offset = 0,
    } = req.query;

    const params = [];
    const clauses = ['1=1'];

    if (status)    { params.push(status);         clauses.push(`l.status = $${params.length}`); }
    if (course_id) { params.push(Number(course_id)); clauses.push(`l.course_id = $${params.length}`); }
    if (source)    { params.push(source);         clauses.push(`l.source = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(l.full_name ILIKE $${params.length} OR l.phone ILIKE $${params.length} OR l.email ILIKE $${params.length})`);
    }

    const where = `WHERE ${clauses.join(' AND ')}`;

    const countResult = await query(`SELECT COUNT(*)::int AS total FROM lead_leads l ${where}`, params);

    params.push(Math.min(Number(limit), 200), Math.max(Number(offset), 0));

    const result = await query(
      `SELECT l.*, c.name AS course_name
       FROM lead_leads l
       LEFT JOIN lead_courses c ON c.id = l.course_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) { next(err); }
});

// ── Detail ────────────────────────────────────────────────────────────────────

leadsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [leadResult, followupsResult] = await Promise.all([
      query(
        `SELECT l.*, c.name AS course_name
         FROM lead_leads l
         LEFT JOIN lead_courses c ON c.id = l.course_id
         WHERE l.id = $1`,
        [id]
      ),
      query(
        `SELECT * FROM lead_followups WHERE lead_id = $1 ORDER BY followup_date DESC, id DESC`,
        [id]
      ),
    ]);
    if (!leadResult.rows.length) return res.status(404).json({ message: 'Lead not found' });
    res.json({ ...leadResult.rows[0], followups: followupsResult.rows });
  } catch (err) { next(err); }
});

// ── Create ────────────────────────────────────────────────────────────────────

function validateLead(body) {
  if (!body.full_name?.trim()) return 'Full name is required';
  if (!body.phone?.trim()) return 'Phone is required';
  if (body.status && !STATUSES.includes(body.status)) return `Invalid status: ${body.status}`;
  return null;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

// Shared by the Excel bulk-upload route and the Google Sheets sync route.
// Skips rows whose phone number (digits-only match) or email (case-insensitive
// match) already belongs to an existing lead, so re-syncing/re-uploading the
// same source doesn't create duplicate leads every time.
export async function bulkInsertLeads(rows) {
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const err = validateLead(row);
    if (err) { errors.push({ row: i + 1, message: err }); continue; }
    try {
      const normalizedPhone = normalizePhone(row.phone);
      const email = row.email?.trim() || null;
      const existing = await query(
        `SELECT id FROM lead_leads
         WHERE regexp_replace(phone, '\\D', '', 'g') = $1
            OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
         LIMIT 1`,
        [normalizedPhone, email]
      );
      if (existing.rows.length) { skipped++; continue; }

      const rowSource = row.source?.trim() || 'Other';
      await query(
        `INSERT INTO lead_leads (full_name, phone, email, course_id, source, status, notes, reference_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [row.full_name.trim(), row.phone.trim(), email, row.course_id || null,
         rowSource, row.status || 'New', row.notes?.trim() || null,
         rowSource === 'Reference' ? (row.reference_name?.trim() || null) : null]
      );
      created++;
    } catch (e) {
      errors.push({ row: i + 1, message: e.message });
    }
  }

  return { created, skipped, failed: errors.length, errors };
}

leadsRouter.post('/', async (req, res, next) => {
  try {
    const err = validateLead(req.body);
    if (err) return res.status(400).json({ message: err });
    const {
      full_name, phone, email, gender, address, course_id, source,
      status, assigned_to, notes, admission_date, batch, reference_name,
    } = req.body;
    const r = await query(
      `INSERT INTO lead_leads
         (full_name, phone, email, gender, address, course_id, source, status, assigned_to, notes, admission_date, batch, reference_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [full_name.trim(), phone.trim(), email?.trim() || null, gender || null, address?.trim() || null,
       course_id || null, source?.trim() || 'Other', status || 'New', assigned_to?.trim() || null,
       notes?.trim() || null, admission_date || null, batch?.trim() || null,
       source === 'Reference' ? (reference_name?.trim() || null) : null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Bulk create (Excel import) ───────────────────────────────────────────────

leadsRouter.post('/bulk', async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body?.rows;
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ message: 'No rows provided' });

    const result = await bulkInsertLeads(rows);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// ── Update ────────────────────────────────────────────────────────────────────

leadsRouter.put('/:id', async (req, res, next) => {
  try {
    const err = validateLead(req.body);
    if (err) return res.status(400).json({ message: err });
    const {
      full_name, phone, email, gender, address, course_id, source,
      status, assigned_to, notes, admission_date, batch, reference_name,
    } = req.body;
    const r = await query(
      `UPDATE lead_leads SET
         full_name=$1, phone=$2, email=$3, gender=$4, address=$5, course_id=$6, source=$7,
         status=$8, assigned_to=$9, notes=$10, admission_date=$11, batch=$12, reference_name=$13, updated_at=CURRENT_TIMESTAMP
       WHERE id=$14 RETURNING *`,
      [full_name.trim(), phone.trim(), email?.trim() || null, gender || null, address?.trim() || null,
       course_id || null, source?.trim() || 'Other', status || 'New', assigned_to?.trim() || null,
       notes?.trim() || null, admission_date || null, batch?.trim() || null,
       source === 'Reference' ? (reference_name?.trim() || null) : null, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Lead not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Delete ────────────────────────────────────────────────────────────────────

leadsRouter.delete('/:id', async (req, res, next) => {
  try {
    const r = await query('DELETE FROM lead_leads WHERE id=$1', [Number(req.params.id)]);
    if (!r.rowCount) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});
