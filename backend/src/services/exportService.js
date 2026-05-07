import PDFDocument from 'pdfkit';
import { query } from '../db.js';

function toMonthWindow(year, month) {
  // Use local dates instead of UTC to avoid timezone issues
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Format as YYYY-MM-DD
  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

export async function getDonorStatementRows({ donorId, month, year }) {
  const { startDate, endDate } = toMonthWindow(year, month);

  const params = [startDate, endDate];
  let donorFilter = '';

  if (donorId) {
    params.push(donorId);
    donorFilter = `AND s.donor_id = $${params.length}`;
  }

  const result = await query(
    `SELECT
       s.id AS sponsorship_id,
       d.id AS donor_id,
       d.name AS donor_name,
       d.email AS donor_email,
       st.name AS student_name,
       s.start_date,
       s.end_date,
       s.amount::float8 AS amount,
       s.status
     FROM sponsorships s
     JOIN donors d ON d.id = s.donor_id
     JOIN students st ON st.id = s.student_id
     WHERE s.start_date <= $2::date
       AND (s.end_date IS NULL OR s.end_date >= $1::date)
       ${donorFilter}
     ORDER BY d.name, st.name`,
    params
  );

  return result.rows;
}

export function buildStatementCsv(rows) {
  const header = [
    'sponsorship_id',
    'donor_id',
    'donor_name',
    'donor_email',
    'student_name',
    'start_date',
    'end_date',
    'amount',
    'status',
  ];

  const csvRows = rows.map((row) => [
    row.sponsorship_id,
    row.donor_id,
    row.donor_name,
    row.donor_email,
    row.student_name,
    row.start_date,
    row.end_date ?? '',
    row.amount,
    row.status,
  ]);

  const escaped = [header, ...csvRows].map((columns) =>
    columns
      .map((value) => {
        const stringValue = String(value ?? '');
        return /[",\n]/.test(stringValue)
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      })
      .join(',')
  );

  return `${escaped.join('\n')}\n`;
}

export function buildStatementPdf({ rows, month, year }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Sombhabona Foundation Donor Statement', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#444').text(`Period: ${String(month).padStart(2, '0')}/${year}`);
    doc.moveDown(0.3);
    doc.fillColor('#111').fontSize(11).text('বঞ্চিত শিশুও আগামীর সম্ভাবনা');
    doc.moveDown(1.2);

    if (!rows.length) {
      doc.fontSize(11).text('No sponsorship transactions found for the selected period.');
      doc.end();
      return;
    }

    const tableHeader = 'Donor | Student | Amount | Status | Start - End';
    doc.fontSize(11).text(tableHeader, { underline: true });
    doc.moveDown(0.6);

    rows.forEach((row) => {
      const line = `${row.donor_name} | ${row.student_name} | ${row.amount} | ${row.status} | ${row.start_date} - ${row.end_date ?? 'Ongoing'}`;
      doc.fontSize(10).text(line);
      doc.moveDown(0.3);
    });

    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    doc.moveDown(0.8);
    doc.fontSize(11).text(`Total Amount: ${total.toFixed(2)}`);

    doc.end();
  });
}
