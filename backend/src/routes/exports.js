import { Router } from 'express';
import {
  buildStatementCsv,
  buildStatementPdf,
  getDonorStatementRows,
} from '../services/exportService.js';

export const exportsRouter = Router();

exportsRouter.post('/donor-statement', async (req, res, next) => {
  try {
    const { donor_id, month, year, format } = req.body;

    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({ message: 'month must be between 1 and 12.' });
    }

    if (!parsedYear || parsedYear < 2000 || parsedYear > 2100) {
      return res.status(400).json({ message: 'year must be between 2000 and 2100.' });
    }

    if (format !== 'csv' && format !== 'pdf') {
      return res.status(400).json({ message: 'format must be csv or pdf.' });
    }

    const rows = await getDonorStatementRows({
      donorId: donor_id ? Number(donor_id) : undefined,
      month: parsedMonth,
      year: parsedYear,
    });

    const fileName = `donor-statement-${parsedYear}-${String(parsedMonth).padStart(2, '0')}.${format}`;

    if (format === 'csv') {
      const csv = buildStatementCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).send(csv);
    }

    const pdfBuffer = await buildStatementPdf({ rows, month: parsedMonth, year: parsedYear });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});
