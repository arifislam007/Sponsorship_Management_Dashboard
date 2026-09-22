import { query } from '../db.js';

export async function recalcProjectProgress(projectId) {
  await query(
    `UPDATE pm_projects SET
       progress = (
         SELECT CASE WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(COUNT(*) FILTER (WHERE status = 'Completed') * 100.0 / COUNT(*))
                END
         FROM pm_tasks WHERE project_id = $1
       ),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [projectId]
  );
}

export async function notifyUser(userId, eventType, title, body, url, whatsappText) {
  const secret = process.env.INTERNAL_SECRET;
  if (!secret || !userId) return;
  try {
    await fetch('http://backend:8000/api/v1/notifications/internal/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ userId, eventType, title, body, url, whatsappText }),
    });
  } catch { /* non-fatal */ }
}

function fmtDueDate(dueDate) {
  if (!dueDate) return 'No due date set';
  return new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// WhatsApp-specific message for a new task assignment — richer/greeting-style
// formatting than the generic title/body used by email/web-push/Telegram.
export function buildTaskAssignedWhatsAppText(assigneeName, taskName, dueDate) {
  return [
    `Dear ${assigneeName || 'Team Member'},`,
    '',
    'You have been assigned the following task:',
    `1. *${taskName}* — Due: ${fmtDueDate(dueDate)}`,
    '',
    'Thanks By',
    '*Sombhabona Portal*',
  ].join('\n');
}

// Resolve a project's manager to their login user id, using the same
// linked_user_id / email-match resolution HR's attendance module uses —
// pm_projects.project_manager_id is an HR employee id, not a login user id.
export async function resolveProjectManagerUserId(projectId) {
  const r = await query(
    `SELECT COALESCE(e.linked_user_id, u.id) AS user_id
     FROM pm_projects p
     JOIN hr_employees e ON e.id = p.project_manager_id
     LEFT JOIN users u ON LOWER(u.email) = LOWER(e.email)
     WHERE p.id = $1 AND NOT e.is_deleted`,
    [projectId]
  );
  return r.rows[0]?.user_id || null;
}

// Notify the project manager that a task changed, skipping a self-notification
// if the manager is the one who made the edit.
export async function notifyManagerOfTaskUpdate(projectId, task, changedFields, actorUserId, actorUsername) {
  if (!changedFields.length) return;
  try {
    const pmUserId = await resolveProjectManagerUserId(projectId);
    if (pmUserId && pmUserId !== actorUserId) {
      await notifyUser(
        pmUserId, 'task_updated',
        `Task Updated: ${task.name}`,
        `${actorUsername || 'Someone'} updated "${task.name}": ${changedFields.join(', ')}`,
        '/dashboard/projects'
      );
    }
  } catch { /* non-fatal */ }
}
