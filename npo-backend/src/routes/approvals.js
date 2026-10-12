import { Router } from 'express';
import { query } from '../db.js';

export const approvalsRouter = Router();

// ── Shared engine helpers (also used by portalAuth.js) ─────────────────────

export async function getActiveExecutiveBoardCount() {
  const r = await query(`SELECT COUNT(*)::int AS count FROM npo_board_members WHERE board_type = 'executive' AND is_active = true`);
  return r.rows[0].count;
}

export async function getActiveGeneralMemberCount() {
  const r = await query(`SELECT COUNT(*)::int AS count FROM npo_members WHERE status = 'active'`);
  return r.rows[0].count;
}

async function voteCounts(requestId, stage) {
  const r = await query(
    `SELECT decision, COUNT(*)::int AS count FROM npo_approval_votes
     WHERE approval_request_id = $1 AND stage = $2 GROUP BY decision`,
    [requestId, stage]
  );
  const counts = { approve: 0, reject: 0 };
  r.rows.forEach(row => { counts[row.decision] = row.count; });
  return counts;
}

// Recomputes whether a request should transition stage based on current
// vote tallies and current active board/member counts (never snapshotted —
// membership can change between votes, so the threshold is always live).
export async function recomputeTransition(requestId) {
  const reqRow = await query(`SELECT * FROM npo_approval_requests WHERE id = $1`, [requestId]);
  if (reqRow.rows.length === 0) return null;
  const request = reqRow.rows[0];

  if (request.stage === 'board_review') {
    const [counts, total] = await Promise.all([voteCounts(requestId, 'board_review'), getActiveExecutiveBoardCount()]);
    const required = Math.floor(total / 2) + 1;
    let nextStage = request.stage;
    if (total > 0 && counts.approve >= required) nextStage = 'member_vote';
    else if (total > 0 && counts.reject >= required) nextStage = 'rejected';
    if (nextStage !== request.stage) {
      await query(`UPDATE npo_approval_requests SET stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [nextStage, requestId]);
    }
    return nextStage;
  }

  if (request.stage === 'member_vote') {
    const [counts, total] = await Promise.all([voteCounts(requestId, 'member_vote'), getActiveGeneralMemberCount()]);
    const required = Math.ceil((total * 2) / 3);
    let nextStage = request.stage;
    if (total > 0 && counts.approve >= required) nextStage = 'approved';
    else if (total > 0 && counts.reject > total - required) nextStage = 'rejected';
    if (nextStage !== request.stage) {
      await query(`UPDATE npo_approval_requests SET stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [nextStage, requestId]);
    }
    return nextStage;
  }

  return request.stage;
}

export async function getApprovalSummary(approvableType, approvableId) {
  const reqRow = await query(
    `SELECT * FROM npo_approval_requests WHERE approvable_type = $1 AND approvable_id = $2
     ORDER BY id DESC LIMIT 1`,
    [approvableType, approvableId]
  );
  if (reqRow.rows.length === 0) return null;
  const request = reqRow.rows[0];

  const [boardCounts, memberCounts, boardTotal, memberTotal] = await Promise.all([
    voteCounts(request.id, 'board_review'),
    voteCounts(request.id, 'member_vote'),
    getActiveExecutiveBoardCount(),
    getActiveGeneralMemberCount(),
  ]);

  return {
    request_id: request.id,
    stage: request.stage,
    board_approve_count: boardCounts.approve,
    board_reject_count: boardCounts.reject,
    board_required: Math.floor(boardTotal / 2) + 1,
    member_approve_count: memberCounts.approve,
    member_reject_count: memberCounts.reject,
    member_required: Math.ceil((memberTotal * 2) / 3),
  };
}

export async function openNewApprovalRequest(approvableType, approvableId, createdBy) {
  const existing = await query(
    `SELECT id FROM npo_approval_requests WHERE approvable_type = $1 AND approvable_id = $2
       AND stage IN ('board_review','member_vote')`,
    [approvableType, approvableId]
  );
  if (existing.rows.length > 0) return existing.rows[0];
  const r = await query(
    `INSERT INTO npo_approval_requests (approvable_type, approvable_id, stage, created_by)
     VALUES ($1,$2,'board_review',$3) RETURNING *`,
    [approvableType, approvableId, createdBy || null]
  );
  return r.rows[0];
}

async function castVote(requestId, voterType, voterId, decision) {
  const reqRow = await query(`SELECT * FROM npo_approval_requests WHERE id = $1`, [requestId]);
  if (reqRow.rows.length === 0) throw Object.assign(new Error('Approval request not found'), { status: 404 });
  const request = reqRow.rows[0];
  if (!['board_review', 'member_vote'].includes(request.stage)) {
    throw Object.assign(new Error('This request is already finalized'), { status: 409 });
  }
  if (request.stage !== (voterType === 'board' ? 'board_review' : 'member_vote')) {
    throw Object.assign(new Error('Not eligible to vote at the current stage'), { status: 403 });
  }

  if (voterType === 'board') {
    const b = await query(`SELECT id FROM npo_board_members WHERE id = $1 AND board_type = 'executive' AND is_active = true`, [voterId]);
    if (b.rows.length === 0) throw Object.assign(new Error('Voter is not an active executive board member'), { status: 403 });
  } else {
    const m = await query(`SELECT id FROM npo_members WHERE id = $1 AND status = 'active'`, [voterId]);
    if (m.rows.length === 0) throw Object.assign(new Error('Voter is not an active general member'), { status: 403 });
  }

  await query(
    `INSERT INTO npo_approval_votes (approval_request_id, stage, voter_type, voter_id, decision)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (approval_request_id, stage, voter_type, voter_id)
     DO UPDATE SET decision = EXCLUDED.decision, voted_at = CURRENT_TIMESTAMP`,
    [requestId, request.stage, voterType, voterId, decision]
  );

  return recomputeTransition(requestId);
}

async function listVotes(requestId) {
  const r = await query(
    `SELECT v.stage, v.voter_type, v.voter_id, v.decision, v.voted_at,
            COALESCE(b.full_name, m.full_name) AS voter_name
     FROM npo_approval_votes v
     LEFT JOIN npo_board_members b ON v.voter_type = 'board' AND b.id = v.voter_id
     LEFT JOIN npo_members m ON v.voter_type = 'member' AND m.id = v.voter_id
     WHERE v.approval_request_id = $1
     ORDER BY v.voted_at`,
    [requestId]
  );
  return r.rows;
}

// ── Routes ───────────────────────────────────────────────────────────────

approvalsRouter.get('/approvals/:requestId/votes', async (req, res, next) => {
  try {
    res.json(await listVotes(Number(req.params.requestId)));
  } catch (err) { next(err); }
});

approvalsRouter.get('/approvable/:type/:id/approval', async (req, res, next) => {
  try {
    const summary = await getApprovalSummary(req.params.type, Number(req.params.id));
    res.json(summary);
  } catch (err) { next(err); }
});

approvalsRouter.post('/approvable/:type/:id/approval', async (req, res, next) => {
  try {
    const request = await openNewApprovalRequest(req.params.type, Number(req.params.id), req.user?.userId);
    res.status(201).json(request);
  } catch (err) { next(err); }
});

approvalsRouter.post('/approvals/:requestId/votes', async (req, res, next) => {
  try {
    const { voter_type, voter_id, decision } = req.body || {};
    if (!['board', 'member'].includes(voter_type)) return res.status(400).json({ message: 'voter_type must be board or member' });
    if (!voter_id) return res.status(400).json({ message: 'voter_id is required' });
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'decision must be approve or reject' });
    const stage = await castVote(Number(req.params.requestId), voter_type, Number(voter_id), decision);
    res.status(201).json({ stage });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});

approvalsRouter.delete('/approvals/:requestId/votes/:voterType/:voterId', async (req, res, next) => {
  try {
    const requestId = Number(req.params.requestId);
    const { voterType, voterId } = req.params;
    const reqRow = await query(`SELECT stage FROM npo_approval_requests WHERE id = $1`, [requestId]);
    if (reqRow.rows.length === 0) return res.status(404).json({ message: 'Approval request not found' });
    await query(
      `DELETE FROM npo_approval_votes WHERE approval_request_id = $1 AND voter_type = $2 AND voter_id = $3`,
      [requestId, voterType, Number(voterId)]
    );
    const stage = await recomputeTransition(requestId);
    res.json({ stage });
  } catch (err) { next(err); }
});

approvalsRouter.patch('/approvals/:requestId/stage', async (req, res, next) => {
  try {
    const { stage } = req.body || {};
    if (!['board_review', 'member_vote', 'approved', 'rejected'].includes(stage)) {
      return res.status(400).json({ message: 'Invalid stage' });
    }
    const r = await query(
      `UPDATE npo_approval_requests SET stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [stage, Number(req.params.requestId)]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Approval request not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

export { castVote };
