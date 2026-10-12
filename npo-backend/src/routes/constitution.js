import { Router } from 'express';
import { query } from '../db.js';
import { getApprovalSummary, openNewApprovalRequest } from './approvals.js';

export const constitutionRouter = Router();

const APPROVABLE_TYPE = 'constitution_chapter';

constitutionRouter.get('/constitution', async (req, res, next) => {
  try {
    const chapters = await query(`SELECT * FROM npo_constitution_chapters ORDER BY sort_order, id`);
    const withApproval = await Promise.all(
      chapters.rows.map(async c => ({ ...c, approval: await getApprovalSummary(APPROVABLE_TYPE, c.id) }))
    );
    res.json(withApproval);
  } catch (err) { next(err); }
});

constitutionRouter.post('/constitution', async (req, res, next) => {
  try {
    const { part, chapter_label, title, content, sort_order } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ message: 'title is required' });
    const r = await query(
      `INSERT INTO npo_constitution_chapters (part, chapter_label, title, content, sort_order, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [part || null, chapter_label || null, title.trim(), content || null, sort_order || 0, req.user?.userId || null]
    );
    const chapter = r.rows[0];
    await openNewApprovalRequest(APPROVABLE_TYPE, chapter.id, req.user?.userId);
    res.status(201).json({ ...chapter, approval: await getApprovalSummary(APPROVABLE_TYPE, chapter.id) });
  } catch (err) { next(err); }
});

constitutionRouter.put('/constitution/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { part, chapter_label, title, content, sort_order } = req.body || {};
    const r = await query(
      `UPDATE npo_constitution_chapters SET
         part=$1, chapter_label=$2, title=$3, content=$4, sort_order=$5, updated_at=CURRENT_TIMESTAMP
       WHERE id=$6 RETURNING *`,
      [part || null, chapter_label || null, title?.trim(), content || null, sort_order || 0, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Chapter not found' });

    // Editing the text invalidates any open approval run — close it out and
    // start a fresh board_review pass, same principle as the previous
    // single-stage flow ("an edit must be re-approved"), now expressed as a
    // new pipeline run rather than a status flip. The old request is left
    // as-is (historical record), not deleted.
    await query(
      `UPDATE npo_approval_requests SET stage = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE approvable_type = $1 AND approvable_id = $2 AND stage IN ('board_review','member_vote')`,
      [APPROVABLE_TYPE, id]
    );
    await openNewApprovalRequest(APPROVABLE_TYPE, id, req.user?.userId);

    res.json({ ...r.rows[0], approval: await getApprovalSummary(APPROVABLE_TYPE, id) });
  } catch (err) { next(err); }
});

constitutionRouter.delete('/constitution/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM npo_constitution_chapters WHERE id = $1`, [Number(req.params.id)]);
    res.status(204).end();
  } catch (err) { next(err); }
});
