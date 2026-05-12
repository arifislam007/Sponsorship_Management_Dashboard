import { Router } from 'express';
import { pool } from '../db.js';
import { generateLetterPDF, getLetterPDFPath } from '../services/pdfService.js';
import { promises as fs } from 'fs';

export const acknowledgmentsRouter = Router();

// Create a new acknowledgment letter
acknowledgmentsRouter.post('/', async (req, res, next) => {
  try {
    const { student_id, donor_id, template_name, subject, content, is_public, donor_name } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'content is required' });
    }

    // Generate PDF
    let pdf_filename = null;
    try {
      const pdfResult = await generateLetterPDF(content, {
        donorName: donor_name || 'Unknown',
        letterId: null,
      });
      pdf_filename = pdfResult.filename;
    } catch (pdfError) {
      console.error('PDF generation warning (continuing with letter save):', pdfError);
      // Continue even if PDF generation fails
    }

    const result = await pool.query(
      `INSERT INTO acknowledgment_letters (student_id, donor_id, template_name, subject, content, is_public, created_by, pdf_filename)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        student_id ? Number(student_id) : null,
        donor_id ? Number(donor_id) : null,
        template_name || null,
        subject || null,
        content,
        !!is_public,
        req.user?.userId || null,
        pdf_filename,
      ]
    );

    res.status(201).json({ 
      letter: result.rows[0],
      pdf_url: pdf_filename ? `/api/v1/letters/pdf/${pdf_filename}` : null
    });
  } catch (error) {
    next(error);
  }
});

// List letters with optional filters
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
      params.push(true);
      clauses.push(`is_public = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const result = await pool.query(`SELECT * FROM acknowledgment_letters ${where} ORDER BY created_at DESC`, params);
    res.json({ letters: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get a single letter by id
acknowledgmentsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query('SELECT * FROM acknowledgment_letters WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Letter not found' });
    res.json({ letter: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Download PDF for a letter
acknowledgmentsRouter.get('/pdf/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Validate filename format to prevent directory traversal
    if (!filename.match(/^letter-[a-z0-9-]+\.pdf$/)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    const filepath = await getLetterPDFPath(filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ message: 'PDF file not found' });
    }

    res.download(filepath, filename);
  } catch (error) {
    next(error);
  }
});

export default acknowledgmentsRouter;
