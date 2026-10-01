import { Router } from 'express';
import { pool } from '../db.js';

export const receiptsRouter = Router();

// A donation entry covers a month range (from_month – to_month, inclusive)
// at a given monthly rate, so its contribution to the total is months ×
// amount — not just `amount` on its own (mirrors the frontend's
// donationMonthsCount/donationLineTotal in Accounting.tsx).
function donationMonthsCount(entry) {
  if (!entry.from_month || !entry.to_month) return 0;
  const [fy, fm] = entry.from_month.split('-').map(Number);
  const [ty, tm] = entry.to_month.split('-').map(Number);
  const diff = (ty - fy) * 12 + (tm - fm) + 1;
  return diff > 0 ? diff : 0;
}

async function nextReceiptNo() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `MR-${ym}-`;
  const result = await pool.query(
    `SELECT receipt_no FROM money_receipts WHERE receipt_no LIKE $1 ORDER BY receipt_no DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const last = result.rows[0]?.receipt_no;
  const seq = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

receiptsRouter.post('/', async (req, res, next) => {
  try {
    const {
      sponsorship_id, donor_id, received_from, student_name,
      amount, amount_words, payment_method, reference_no,
      received_by_name, received_by_designation, date, month, pdf_base64,
      donations,
    } = req.body;

    if (!received_from?.trim()) return res.status(400).json({ message: 'Received From is required' });
    if (!payment_method) return res.status(400).json({ message: 'Payment method is required' });
    if (!date) return res.status(400).json({ message: 'Date is required' });

    // When itemized donation entries are given, they're the source of truth
    // for the total — don't trust a client-computed `amount` for those.
    // Each entry's contribution is months-covered × monthly rate.
    const donationEntries = Array.isArray(donations)
      ? donations.filter(d => d && Number(d.amount) > 0 && donationMonthsCount(d) > 0)
      : [];
    const computedAmount = donationEntries.length
      ? donationEntries.reduce((sum, d) => sum + Number(d.amount) * donationMonthsCount(d), 0)
      : Number(amount);

    if (!computedAmount || computedAmount <= 0) return res.status(400).json({ message: 'A valid amount is required' });

    const receipt_no = await nextReceiptNo();
    const pdfBuffer = pdf_base64 ? Buffer.from(pdf_base64, 'base64') : null;

    const result = await pool.query(
      `INSERT INTO money_receipts
         (receipt_no, sponsorship_id, donor_id, received_from, student_name, amount, amount_words,
          payment_method, reference_no, received_by_name, received_by_designation, date, month, donations, pdf_data, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id, receipt_no, sponsorship_id, donor_id, received_from, student_name, amount::float8,
                 amount_words, payment_method, reference_no, received_by_name, received_by_designation, date, month, donations, created_at`,
      [
        receipt_no, sponsorship_id || null, donor_id || null, received_from.trim(), student_name?.trim() || null,
        computedAmount, amount_words, payment_method, reference_no?.trim() || null,
        received_by_name?.trim() || null, received_by_designation?.trim() || null, date, month || null,
        JSON.stringify(donationEntries), pdfBuffer, req.user?.userId || null,
      ]
    );

    res.status(201).json({ receipt: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

receiptsRouter.get('/', async (req, res, next) => {
  try {
    const { sponsorship_id, donor_id, from, to } = req.query;
    const clauses = [];
    const params = [];

    if (sponsorship_id) { params.push(Number(sponsorship_id)); clauses.push(`sponsorship_id = $${params.length}`); }
    if (donor_id)        { params.push(Number(donor_id));       clauses.push(`donor_id = $${params.length}`); }
    if (from)            { params.push(from);                   clauses.push(`date >= $${params.length}`); }
    if (to)              { params.push(to);                     clauses.push(`date <= $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, receipt_no, sponsorship_id, donor_id, received_from, student_name, amount::float8,
              amount_words, payment_method, reference_no, received_by_name, received_by_designation, date, month, donations, created_at,
              (pdf_data IS NOT NULL) AS has_pdf
       FROM money_receipts ${where} ORDER BY created_at DESC`,
      params
    );
    res.json({ receipts: result.rows });
  } catch (error) {
    next(error);
  }
});

receiptsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `SELECT id, receipt_no, sponsorship_id, donor_id, received_from, student_name, amount::float8,
              amount_words, payment_method, reference_no, received_by_name, received_by_designation, date, month, donations, created_at,
              (pdf_data IS NOT NULL) AS has_pdf
       FROM money_receipts WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Receipt not found' });
    res.json({ receipt: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

receiptsRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query('SELECT pdf_data, receipt_no FROM money_receipts WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Receipt not found' });

    const { pdf_data, receipt_no } = result.rows[0];
    if (!pdf_data) return res.status(404).json({ message: 'PDF not available for this receipt' });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="receipt-${receipt_no}.pdf"`);
    res.send(pdf_data);
  } catch (error) {
    next(error);
  }
});

export default receiptsRouter;
