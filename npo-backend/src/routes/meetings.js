import { Router } from 'express';
import { query } from '../db.js';
import pool from '../db.js';
import { getApprovalSummary, openNewApprovalRequest } from './approvals.js';

export const meetingsRouter = Router();

const APPROVABLE_TYPE = 'meeting_minutes';

async function replaceAttendees(client, meetingId, attendees) {
  await client.query(`DELETE FROM npo_meeting_attendees WHERE meeting_id = $1`, [meetingId]);
  for (const a of attendees || []) {
    if (!a.attendee_name_snapshot?.trim()) continue;
    await client.query(
      `INSERT INTO npo_meeting_attendees (meeting_id, attendee_type, board_member_id, member_id, attendee_name_snapshot, signature_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [meetingId, a.attendee_type, a.board_member_id || null, a.member_id || null, a.attendee_name_snapshot.trim(), a.signature_snapshot || null]
    );
  }
}

meetingsRouter.get('/meetings', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT id, meeting_type, meeting_date, meeting_time, venue, next_meeting_date,
              (pdf_data IS NOT NULL) AS has_pdf, created_at
       FROM npo_meetings ORDER BY meeting_date DESC, id DESC`
    );
    const withApproval = await Promise.all(
      r.rows.map(async m => ({ ...m, approval: await getApprovalSummary(APPROVABLE_TYPE, m.id) }))
    );
    res.json(withApproval);
  } catch (err) { next(err); }
});

meetingsRouter.get('/meetings/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const m = await query(
      `SELECT id, meeting_type, meeting_date, meeting_time, venue, agenda, minutes_resolutions,
              next_meeting_date, (pdf_data IS NOT NULL) AS has_pdf, created_at
       FROM npo_meetings WHERE id = $1`,
      [id]
    );
    if (m.rows.length === 0) return res.status(404).json({ message: 'Meeting not found' });
    const attendees = await query(
      `SELECT id, attendee_type, board_member_id, member_id, attendee_name_snapshot, signature_snapshot
       FROM npo_meeting_attendees WHERE meeting_id = $1 ORDER BY attendee_name_snapshot`,
      [id]
    );
    res.json({ ...m.rows[0], attendees: attendees.rows, approval: await getApprovalSummary(APPROVABLE_TYPE, id) });
  } catch (err) { next(err); }
});

meetingsRouter.get('/meetings/:id/pdf', async (req, res, next) => {
  try {
    const r = await query(`SELECT pdf_data, meeting_type, meeting_date FROM npo_meetings WHERE id = $1`, [Number(req.params.id)]);
    if (r.rows.length === 0 || !r.rows[0].pdf_data) return res.status(404).json({ message: 'PDF not found' });
    const { pdf_data, meeting_type, meeting_date } = r.rows[0];
    const dateStr = new Date(meeting_date).toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="npo-meeting-${meeting_type}-${dateStr}.pdf"`);
    res.send(pdf_data);
  } catch (err) { next(err); }
});

meetingsRouter.post('/meetings', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      meeting_type, meeting_date, meeting_time, venue, agenda,
      minutes_resolutions, next_meeting_date, pdf_base64, attendees,
    } = req.body || {};
    if (!['agm', 'regular'].includes(meeting_type)) return res.status(400).json({ message: 'meeting_type must be agm or regular' });
    if (!meeting_date) return res.status(400).json({ message: 'meeting_date is required' });

    await client.query('BEGIN');
    const pdfBuffer = pdf_base64 ? Buffer.from(pdf_base64, 'base64') : null;
    const ins = await client.query(
      `INSERT INTO npo_meetings
         (meeting_type, meeting_date, meeting_time, venue, agenda, minutes_resolutions, next_meeting_date, pdf_data, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [meeting_type, meeting_date, meeting_time || null, venue || null, agenda || null,
        minutes_resolutions || null, next_meeting_date || null, pdfBuffer, req.user?.userId || null]
    );
    const meetingId = ins.rows[0].id;
    await replaceAttendees(client, meetingId, attendees);
    await client.query('COMMIT');
    await openNewApprovalRequest(APPROVABLE_TYPE, meetingId, req.user?.userId);
    res.status(201).json({ id: meetingId, approval: await getApprovalSummary(APPROVABLE_TYPE, meetingId) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

meetingsRouter.put('/meetings/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const {
      meeting_type, meeting_date, meeting_time, venue, agenda,
      minutes_resolutions, next_meeting_date, pdf_base64, attendees,
    } = req.body || {};

    await client.query('BEGIN');
    const pdfBuffer = pdf_base64 ? Buffer.from(pdf_base64, 'base64') : null;
    const sets = [
      'meeting_type=$1', 'meeting_date=$2', 'meeting_time=$3', 'venue=$4', 'agenda=$5',
      'minutes_resolutions=$6', 'next_meeting_date=$7', 'updated_at=CURRENT_TIMESTAMP',
    ];
    const params = [meeting_type, meeting_date, meeting_time || null, venue || null, agenda || null,
      minutes_resolutions || null, next_meeting_date || null];
    if (pdfBuffer) {
      sets.push(`pdf_data=$${params.length + 1}`);
      params.push(pdfBuffer);
    }
    params.push(id);
    const r = await client.query(
      `UPDATE npo_meetings SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING id`,
      params
    );
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Meeting not found' });
    }
    await replaceAttendees(client, id, attendees);
    await client.query('COMMIT');

    // Editing the minutes invalidates any open approval run — same
    // principle as constitution chapters: close it out and start a fresh
    // board_review pass. The old request is left as historical record.
    await query(
      `UPDATE npo_approval_requests SET stage = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE approvable_type = $1 AND approvable_id = $2 AND stage IN ('board_review','member_vote')`,
      [APPROVABLE_TYPE, id]
    );
    await openNewApprovalRequest(APPROVABLE_TYPE, id, req.user?.userId);

    res.json({ id, approval: await getApprovalSummary(APPROVABLE_TYPE, id) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

meetingsRouter.delete('/meetings/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM npo_meetings WHERE id = $1`, [Number(req.params.id)]);
    res.status(204).end();
  } catch (err) { next(err); }
});
