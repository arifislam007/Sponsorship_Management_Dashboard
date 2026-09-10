import { query } from '../db.js';
import { sendDirectEmail } from './notificationService.js';

const REMINDER_WINDOW_DAYS = 30;
const ADMIN_NOTIFY_EMAIL = 'sombhabona@gmail.com';

function buildDonorReminderHtml({ donorName, studentName, endDate, amount }) {
  const formattedDate = new Date(endDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr>
        <td style="background:linear-gradient(135deg,#14856E 0%,#0d6b59 100%);padding:28px 36px;text-align:center">
          <h1 style="margin:0;font-size:20px;color:#ffffff">Sombhabona Foundation</h1>
          <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.5px">Sponsorship Ending Soon</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 36px">
          <p>Dear ${donorName},</p>
          <p>This is a reminder that your sponsorship for <strong>${studentName}</strong> is scheduled to end on
             <strong>${formattedDate}</strong>.</p>
          <p>Monthly contribution: <strong>৳${Number(amount).toLocaleString()}</strong></p>
          <p>If you would like to continue supporting ${studentName}, please contact us to renew the sponsorship.
             If you have already arranged a renewal, you can disregard this message.</p>
          <p>Thank you for your continued generosity and support.</p>
          <p>— Sombhabona Foundation</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 36px;text-align:center">
          <p style="margin:0;font-size:12px;color:#6b7280">📞 01737243447 &nbsp;·&nbsp; 📍 756 West Sewrapara, Mirpur, Dhaka &nbsp;·&nbsp; ✉️ info@sombhabona.org</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildAdminSummaryHtml(rows) {
  const items = rows.map(r => `<li>${r.donor_name} → ${r.student_name} — ends ${new Date(r.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (৳${Number(r.amount).toLocaleString()}/mo)</li>`).join('');
  return `<div style="font-family:Arial,sans-serif;color:#1f2937">
    <p>The following active sponsorships are ending within the next ${REMINDER_WINDOW_DAYS} days:</p>
    <ul>${items}</ul>
    <p style="color:#6b7280;font-size:13px">Use the "Send Reminder" button on the Sponsorships page to notify a donor directly.</p>
  </div>`;
}

// ── Manual, on-demand: staff clicks "Send Reminder" for one sponsorship ───────
export async function sendManualExpiryReminder(sponsorshipId) {
  const result = await query(
    `SELECT s.id, s.end_date, s.amount::float8 AS amount, d.name AS donor_name, d.email AS donor_email, st.name AS student_name
     FROM sponsorships s
     JOIN donors d ON d.id = s.donor_id
     JOIN students st ON st.id = s.student_id
     WHERE s.id = $1`,
    [sponsorshipId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Sponsorship not found');
    err.status = 404;
    throw err;
  }
  const sp = result.rows[0];
  if (!sp.end_date) {
    const err = new Error('This sponsorship has no end date set, so a reminder cannot be sent.');
    err.status = 400;
    throw err;
  }

  await sendDirectEmail(
    sp.donor_email,
    `Your sponsorship for ${sp.student_name} is ending soon`,
    buildDonorReminderHtml({ donorName: sp.donor_name, studentName: sp.student_name, endDate: sp.end_date, amount: sp.amount })
  );

  return sp;
}

// ── Automatic: once per calendar month, email a summary to the admin inbox ────
async function getLastSummaryMonth() {
  const r = await query('SELECT sponsorship_summary_last_sent_month FROM notification_config WHERE id = 1');
  return r.rows[0]?.sponsorship_summary_last_sent_month || null;
}

async function setLastSummaryMonth(yearMonth) {
  await query('UPDATE notification_config SET sponsorship_summary_last_sent_month = $1 WHERE id = 1', [yearMonth]);
}

export async function sendMonthlyExpirySummaryIfDue() {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const lastSent = await getLastSummaryMonth();
    if (lastSent === currentMonth) return; // already sent this month

    const result = await query(
      `SELECT s.id, s.end_date, s.amount::float8 AS amount, d.name AS donor_name, st.name AS student_name
       FROM sponsorships s
       JOIN donors d ON d.id = s.donor_id
       JOIN students st ON st.id = s.student_id
       WHERE s.status = 'Active'
         AND s.end_date IS NOT NULL
         AND s.end_date <= CURRENT_DATE + INTERVAL '${REMINDER_WINDOW_DAYS} days'
         AND s.end_date >= CURRENT_DATE
       ORDER BY s.end_date ASC`
    );

    if (result.rows.length > 0) {
      await sendDirectEmail(
        ADMIN_NOTIFY_EMAIL,
        `Monthly sponsorship expiry summary — ${result.rows.length} ending within ${REMINDER_WINDOW_DAYS} days`,
        buildAdminSummaryHtml(result.rows)
      );
      console.log(`[sponsorship-expiry] Monthly summary sent (${result.rows.length} sponsorship(s)).`);
    } else {
      console.log('[sponsorship-expiry] Monthly summary check: nothing ending soon.');
    }

    await setLastSummaryMonth(currentMonth);
  } catch (err) {
    console.error('[sponsorship-expiry] Error sending monthly summary:', err);
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startSponsorshipExpirySummaryScheduler() {
  // Check shortly after startup (catches a month change missed while the server was down),
  // then re-check daily — sendMonthlyExpirySummaryIfDue() only actually sends once per month.
  setTimeout(sendMonthlyExpirySummaryIfDue, 30 * 1000);
  setInterval(sendMonthlyExpirySummaryIfDue, ONE_DAY_MS);
  console.log('[sponsorship-expiry] Monthly summary scheduler started.');
}
