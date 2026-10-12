import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { portalAuthMiddleware, signPortalToken } from '../middleware/portalAuth.js';
import { castVote } from './approvals.js';

export const portalAuthRouter = Router();

// Public — no auth required to attempt login, same as the staff /auth/login.
portalAuthRouter.post('/portal/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'username and password are required' });

    // A person could plausibly hold both a general-member and an executive-
    // board record; if a username collides across both tables, the board
    // identity wins since it carries more voting rights.
    const board = await query(
      `SELECT id, full_name, portal_password_hash FROM npo_board_members
       WHERE portal_username = $1 AND is_active = true`,
      [username]
    );
    if (board.rows.length > 0 && board.rows[0].portal_password_hash) {
      const match = await bcrypt.compare(password, board.rows[0].portal_password_hash);
      if (match) {
        const token = signPortalToken('board', board.rows[0].id);
        return res.json({ token, voterType: 'board', fullName: board.rows[0].full_name });
      }
    }

    const member = await query(
      `SELECT id, full_name, portal_password_hash FROM npo_members
       WHERE portal_username = $1 AND status = 'active'`,
      [username]
    );
    if (member.rows.length > 0 && member.rows[0].portal_password_hash) {
      const match = await bcrypt.compare(password, member.rows[0].portal_password_hash);
      if (match) {
        const token = signPortalToken('member', member.rows[0].id);
        return res.json({ token, voterType: 'member', fullName: member.rows[0].full_name });
      }
    }

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) { next(err); }
});

portalAuthRouter.get('/portal/me', portalAuthMiddleware, async (req, res, next) => {
  try {
    const { voterType, voterId } = req.portalVoter;
    const table = voterType === 'board' ? 'npo_board_members' : 'npo_members';
    const extra = voterType === 'board' ? ', board_type, position_title' : '';
    const r = await query(`SELECT id, full_name${extra} FROM ${table} WHERE id = $1`, [voterId]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Profile not found' });
    res.json({ voterType, ...r.rows[0] });
  } catch (err) { next(err); }
});

portalAuthRouter.get('/portal/pending-approvals', portalAuthMiddleware, async (req, res, next) => {
  try {
    const { voterType, voterId } = req.portalVoter;
    const stage = voterType === 'board' ? 'board_review' : 'member_vote';
    const r = await query(
      `SELECT r.id AS request_id, r.approvable_type, r.approvable_id, r.stage, r.created_at,
              c.title AS chapter_title, c.chapter_label, c.part, c.content AS chapter_content,
              mt.meeting_type, mt.meeting_date, mt.venue, mt.agenda, mt.minutes_resolutions
       FROM npo_approval_requests r
       LEFT JOIN npo_constitution_chapters c
         ON r.approvable_type = 'constitution_chapter' AND c.id = r.approvable_id
       LEFT JOIN npo_meetings mt
         ON r.approvable_type = 'meeting_minutes' AND mt.id = r.approvable_id
       WHERE r.stage = $1
         AND NOT EXISTS (
           SELECT 1 FROM npo_approval_votes v
           WHERE v.approval_request_id = r.id AND v.stage = $1 AND v.voter_type = $2 AND v.voter_id = $3
         )
       ORDER BY r.created_at`,
      [stage, voterType, voterId]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

portalAuthRouter.post('/portal/pending-approvals/:requestId/vote', portalAuthMiddleware, async (req, res, next) => {
  try {
    const { decision } = req.body || {};
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'decision must be approve or reject' });
    const { voterType, voterId } = req.portalVoter;
    const stage = await castVote(Number(req.params.requestId), voterType, voterId, decision);
    res.status(201).json({ stage });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});
