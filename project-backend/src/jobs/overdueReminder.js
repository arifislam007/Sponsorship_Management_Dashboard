import cron from 'node-cron';
import { query } from '../db.js';
import { notifyUser } from '../lib/taskHelpers.js';

// Runs once daily and reminds each assignee about tasks due tomorrow that
// aren't done yet — gives them a day's notice before the task goes overdue.
async function sendDueSoonReminders() {
  try {
    const result = await query(
      `SELECT t.id, t.name, t.due_date, t.assigned_user_id, p.name AS project_name
       FROM pm_tasks t
       JOIN pm_projects p ON p.id = t.project_id
       WHERE t.due_date = CURRENT_DATE + INTERVAL '1 day'
         AND t.status != 'Completed'
         AND t.assigned_user_id IS NOT NULL`
    );

    for (const task of result.rows) {
      await notifyUser(
        task.assigned_user_id, 'task_due_soon',
        'Task Due Tomorrow',
        `"${task.name}" (${task.project_name}) is due tomorrow.`,
        '/dashboard/projects'
      );
    }

    if (result.rows.length) {
      console.log(`[overdue-reminder] sent ${result.rows.length} due-tomorrow reminder(s)`);
    }
  } catch (err) {
    console.error('[overdue-reminder] failed:', err.message);
  }
}

export function startOverdueReminderJob() {
  // 08:00 every day, Asia/Dhaka.
  cron.schedule('0 8 * * *', sendDueSoonReminders, { timezone: 'Asia/Dhaka' });
}
