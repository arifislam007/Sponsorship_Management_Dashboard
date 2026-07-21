import { Router } from 'express';
import { pool } from '../db.js';
import { generateLetterPDF } from '../services/pdfService.js';

export const acknowledgmentsRouter = Router();

acknowledgmentsRouter.post('/', async (req, res, next) => {
  try {
    const { student_id, donor_id, template_name, subject, content, is_public, donor_name } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'content is required' });
    }

    let pdfBuffer = null;
    try {
      pdfBuffer = await generateLetterPDF(content, { donorName: donor_name || 'Unknown' });
    } catch (pdfError) {
      console.error('PDF generation warning (continuing):', pdfError);
    }

    const result = await pool.query(
      `INSERT INTO acknowledgment_letters (student_id, donor_id, template_name, subject, content, is_public, created_by, pdf_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, student_id, donor_id, template_name, subject, content, is_public, created_by, created_at, updated_at`,
      [
        student_id ? Number(student_id) : null,
        donor_id ? Number(donor_id) : null,
        template_name || null,
        subject || null,
        content,
        !!is_public,
        req.user?.userId || null,
        pdfBuffer,
      ]
    );

    res.status(201).json({
      letter: result.rows[0],
      pdf_url: pdfBuffer ? `/api/v1/letters/${result.rows[0].id}/pdf` : null,
    });
  } catch (error) {
    next(error);
  }
});

acknowledgmentsRouter.get('/', async (req, res, next) => {
  try {
    const { student_id, donor_id, template_name, public_only } = req.query;

    const clauses = [];
    const params = [];

    if (student_id) {
      params.push(Number(student_id));
      clauses.push(`student_id = $${params.length}`);
    }

    if (donor_id) {
      params.push(Number(donor_id));
      clauses.push(`donor_id = $${params.length}`);
    }

    if (template_name) {
      params.push(String(template_name));
      clauses.push(`template_name = $${params.length}`);
    }

    if (public_only === 'true') {
      clauses.push(`is_public = true`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, student_id, donor_id, template_name, subject, content, is_public, created_by, created_at, updated_at,
              (pdf_data IS NOT NULL) AS has_pdf
       FROM acknowledgment_letters ${where} ORDER BY created_at DESC`,
      params
    );
    res.json({ letters: result.rows });
  } catch (error) {
    next(error);
  }
});

acknowledgmentsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `SELECT id, student_id, donor_id, template_name, subject, content, is_public, created_by, created_at, updated_at,
              (pdf_data IS NOT NULL) AS has_pdf
       FROM acknowledgment_letters WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Letter not found' });
    res.json({ letter: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

acknowledgmentsRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      'SELECT pdf_data, template_name FROM acknowledgment_letters WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Letter not found' });

    const { pdf_data } = result.rows[0];
    if (!pdf_data) return res.status(404).json({ message: 'PDF not available for this letter' });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="acknowledgment-${id}.pdf"`);
    res.send(pdf_data);
  } catch (error) {
    next(error);
  }
});

export default acknowledgmentsRouter;
