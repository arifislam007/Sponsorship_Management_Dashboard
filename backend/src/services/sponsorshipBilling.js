import { query } from '../db.js';

async function recalculateLedgerBalances() {
  await query(`
    WITH running AS (
      SELECT
        id,
        SUM(CASE WHEN type = 'Credit' THEN amount ELSE -amount END)
          OVER (ORDER BY date ASC, id ASC ROWS UNBOUNDED PRECEDING) AS running_balance
      FROM accounting_ledger
    )
    UPDATE accounting_ledger l
    SET closing_balance = r.running_balance
    FROM running r
    WHERE l.id = r.id
  `);
}

export async function generateSponsorshipLedgerEntries() {
  try {
    const sponsorshipsResult = await query(`
      SELECT
        s.id,
        s.amount::float8 AS amount,
        s.start_date,
        d.name AS donor_name,
        st.name AS student_name
      FROM sponsorships s
      JOIN donors  d  ON d.id  = s.donor_id
      JOIN students st ON st.id = s.student_id
      WHERE s.status = 'Active'
        AND s.period = 'continuous'
      ORDER BY s.id ASC
    `);

    if (sponsorshipsResult.rows.length === 0) return;

    let anyInserted = false;

    for (const sp of sponsorshipsResult.rows) {
      const start = new Date(sp.start_date);
      const now   = new Date();

      // First day of start month (UTC)
      let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      // First day of current month (UTC)
      const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      while (cursor <= currentMonth) {
        const mm        = String(cursor.getUTCMonth() + 1).padStart(2, '0');
        const yearMonth = `${cursor.getUTCFullYear()}-${mm}`;
        const voucherRef = `AUTO-SP-${sp.id}-${yearMonth}`;
        const entryDate  = `${yearMonth}-01`;

        const existing = await query(
          'SELECT id FROM accounting_ledger WHERE voucher_ref = $1',
          [voucherRef]
        );

        if (existing.rows.length === 0) {
          await query(
            `INSERT INTO accounting_ledger
               (date, voucher_ref, particulars, category, type, amount, closing_balance)
             VALUES ($1, $2, $3, 'Sponsorship', 'Credit', $4, 0)
             ON CONFLICT (voucher_ref) DO NOTHING`,
            [
              entryDate,
              voucherRef,
              `Monthly sponsorship – ${sp.donor_name} → ${sp.student_name}`,
              sp.amount,
            ]
          );
          anyInserted = true;
          console.log(`[billing] Created ${voucherRef}`);
        }

        // advance to next month
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      }
    }

    if (anyInserted) {
      await recalculateLedgerBalances();
      console.log('[billing] Ledger balances recalculated.');
    }
  } catch (err) {
    console.error('[billing] Error generating sponsorship ledger entries:', err);
  }
}

// Schedule to run once per day (ms)
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startBillingScheduler() {
  // Run immediately on startup to catch any missed months
  generateSponsorshipLedgerEntries();

  // Then repeat every 24 hours
  setInterval(generateSponsorshipLedgerEntries, ONE_DAY_MS);
  console.log('[billing] Scheduler started (runs daily).');
}
