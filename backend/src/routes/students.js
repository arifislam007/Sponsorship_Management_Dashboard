import { Router } from 'express';
import { query } from '../db.js';

export const studentsRouter = Router();
const FEATURED_STUDENT_LIMIT = 4;

async function getFeaturedStudentCount(excludeStudentId = null) {
  const result = await query(
    `SELECT COUNT(*)::int AS count
     FROM students
     WHERE is_featured = true
       ${excludeStudentId ? 'AND id <> $1' : ''}`,
    excludeStudentId ? [excludeStudentId] : []
  );

  return result.rows[0]?.count || 0;
}

export async function listStudents(req, res, next) {
  try {
    const sponsoredFilter = String(req.query.sponsored || 'all').toLowerCase();

    const whereClause =
      sponsoredFilter === 'sponsored'
        ? 'WHERE is_sponsored = true'
        : sponsoredFilter === 'unsponsored'
          ? 'WHERE is_sponsored = false'
          : '';

    const result = await query(
      `SELECT
         s.id,
         s.name,
         s.class,
         s.age,
         s.bio,
         s.photo_url,
         s.is_featured,
         s.is_sponsored,
         COALESCE(json_agg(json_build_object('donor_id', d.id, 'donor_name', d.name)) FILTER (WHERE d.id IS NOT NULL), '[]') AS sponsors
       FROM students s
       LEFT JOIN sponsorships sp ON sp.student_id = s.id AND sp.status = 'Active'
       LEFT JOIN donors d ON d.id = sp.donor_id
       ${whereClause}
       GROUP BY s.id, s.name, s.class, s.age, s.bio, s.photo_url, s.is_featured, s.is_sponsored
       ORDER BY s.id ASC`
    );

    const rows = result.rows.map((r) => ({
      ...r,
      sponsors: Array.isArray(r.sponsors) ? r.sponsors : JSON.parse(r.sponsors || '[]'),
    }));

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

studentsRouter.get('/', listStudents);

studentsRouter.post('/', async (req, res, next) => {
  try {
    const { name, class: studentClass, age, bio, photo_url, is_sponsored, is_featured } = req.body;
    const parsedAge = Number(age);

    if (!name || !studentClass || Number.isNaN(parsedAge) || parsedAge <= 0) {
      return res.status(400).json({ message: 'name, class and valid age are required.' });
    }

    const featuredRequested = Boolean(is_featured);
    if (featuredRequested) {
      const featuredCount = await getFeaturedStudentCount();
      if (featuredCount >= FEATURED_STUDENT_LIMIT) {
        return res.status(400).json({
          message: `Only ${FEATURED_STUDENT_LIMIT} students can be featured at a time.`,
        });
      }
    }

    const result = await query(
      `INSERT INTO students (name, class, age, bio, photo_url, is_sponsored, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, class, age, bio, photo_url, is_featured, is_sponsored`,
      [name, studentClass, parsedAge, bio || null, photo_url || null, Boolean(is_sponsored), featuredRequested]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

studentsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, class: studentClass, age, bio, photo_url, is_sponsored, is_featured } = req.body;
    const parsedId = Number(id);
    const parsedAge = Number(age);

    if (!name || !studentClass || Number.isNaN(parsedAge) || parsedAge <= 0) {
      return res.status(400).json({ message: 'name, class and valid age are required.' });
    }

    const currentCount = await getFeaturedStudentCount(parsedId);
    const featuredRequested = Boolean(is_featured);
    if (featuredRequested && currentCount >= FEATURED_STUDENT_LIMIT) {
      return res.status(400).json({
        message: `Only ${FEATURED_STUDENT_LIMIT} students can be featured at a time.`,
      });
    }

    const result = await query(
      `UPDATE students
       SET name = $1, class = $2, age = $3, bio = $4, photo_url = $5, is_sponsored = $6, is_featured = $7
       WHERE id = $8
       RETURNING id, name, class, age, bio, photo_url, is_featured, is_sponsored`,
      [name, studentClass, parsedAge, bio || null, photo_url || null, Boolean(is_sponsored), featuredRequested, parsedId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

studentsRouter.patch('/:id/feature', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsedId = Number(id);
    const { is_featured } = req.body;

    const result = await query('SELECT id, is_featured FROM students WHERE id = $1', [parsedId]);
    const student = result.rows[0];

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const featuredRequested = Boolean(is_featured);
    if (featuredRequested && !student.is_featured) {
      const featuredCount = await getFeaturedStudentCount(parsedId);
      if (featuredCount >= FEATURED_STUDENT_LIMIT) {
        return res.status(400).json({
          message: `Only ${FEATURED_STUDENT_LIMIT} students can be featured at a time.`,
        });
      }
    }

    const updated = await query(
      `UPDATE students
       SET is_featured = $1
       WHERE id = $2
       RETURNING id, name, class, age, bio, photo_url, is_featured, is_sponsored`,
      [featuredRequested, parsedId]
    );

    return res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
});
