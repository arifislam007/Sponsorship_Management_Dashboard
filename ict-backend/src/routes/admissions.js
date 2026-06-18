import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const integerFields = new Set([
  'student_id',
  'total_family_members',
  'number_of_earning_members',
  'school_going_children',
  'recent_medical_visits',
  'hours_attended',
]);

const numericFields = new Set([
  'total_monthly_family_income',
  'applicant_monthly_income',
  'monthly_expenses',
  'house_rent',
  'monthly_meals',
]);

function normalizeAdmissionValue(fieldName, value) {
  if (value === '') return null;
  if (integerFields.has(fieldName)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (numericFields.has(fieldName)) {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (fieldName === 'admission_date' || fieldName === 'date_of_birth') {
    return value || null;
  }
  return value;
}

function buildAdmissionPayload(fields, allowed) {
  const cols = [];
  const params = [];
  const placeholders = [];

  allowed.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
      const value = normalizeAdmissionValue(fieldName, fields[fieldName]);
      if (value !== undefined) {
        cols.push(fieldName);
        params.push(value);
        placeholders.push(`$${params.length}`);
      }
    }
  });

  return { cols, params, placeholders };
}

// Get all admissions
router.get('/admissions', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, s.student_name, s.email AS student_email
       FROM ict_admissions a
       LEFT JOIN ict_students s ON a.student_id = s.id
       ORDER BY a.created_at DESC`
    );
    res.json({ admissions: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get admission by ID
router.get('/admissions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, s.student_name, s.email AS student_email
       FROM ict_admissions a
       LEFT JOIN ict_students s ON a.student_id = s.id
       WHERE a.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }
    res.json({ admission: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Create new admission application
router.post('/admissions', async (req, res, next) => {
  try {
    // Accept all form fields from the new detailed admission form
    const fields = req.body || {};
    if (!fields.full_name) {
      return res.status(400).json({ message: 'full_name is required.' });
    }

    // Build insert columns and values dynamically for safety and flexibility
      const allowed = [
        'student_id','full_name','email','father_name','mother_name','guardian_name','emergency_contact','occupational_status','date_of_birth','gender','marital_status','nid_number','brc_number','current_address','current_district','current_police_station','current_union','current_post_office','current_post_code','current_village','permanent_address','permanent_district','permanent_police_station','permanent_union','permanent_post_office','permanent_post_code','permanent_village','religion','tribe','education','pwd','disability_type','total_family_members','source_of_income','number_of_earning_members','total_monthly_family_income','applicant_monthly_income','school_going_children','family_healthcare_source','recent_medical_visits','monthly_expenses','house_rent','monthly_meals','financial_status','has_savings','has_bank_account','social_security','training_institute','admission_date','course','batch','preferred_shift','registration_id','referral_source','prior_technical_skills','prior_skills_details','certification_status','training_duration','dropout_status','hours_attended','dropout_reason','competency','improvement_areas','remarks','trainee_signature','office_signature','profile_image','admission_status','admission_notes'
      ];

    const { cols, params, placeholders } = buildAdmissionPayload(fields, allowed);

    // Ensure admission_status defaults to 'pending' if not provided
    if (!cols.includes('admission_status')) {
      cols.push('admission_status');
      params.push('pending');
      placeholders.push(`$${params.length}`);
    }

    const sql = `INSERT INTO ict_admissions (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`;
    const result = await query(sql, params);
    res.status(201).json({ admission: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update/edit an admission
router.patch('/admissions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body || {};

    const allowed = [
      'student_id','full_name','email','father_name','mother_name','guardian_name','emergency_contact','occupational_status','date_of_birth','gender','marital_status','nid_number','brc_number','current_address','current_district','current_police_station','current_union','current_post_office','current_post_code','current_village','permanent_address','permanent_district','permanent_police_station','permanent_union','permanent_post_office','permanent_post_code','permanent_village','religion','tribe','education','pwd','disability_type','total_family_members','source_of_income','number_of_earning_members','total_monthly_family_income','applicant_monthly_income','school_going_children','family_healthcare_source','recent_medical_visits','monthly_expenses','house_rent','monthly_meals','financial_status','has_savings','has_bank_account','social_security','training_institute','admission_date','course','batch','preferred_shift','registration_id','referral_source','prior_technical_skills','prior_skills_details','certification_status','training_duration','dropout_status','hours_attended','dropout_reason','competency','improvement_areas','remarks','trainee_signature','office_signature','admission_status','admission_notes'
    ];

    const sets = [];
    const params = [];
    allowed.forEach((fieldName) => {
      if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
        const value = normalizeAdmissionValue(fieldName, fields[fieldName]);
        if (value !== undefined) {
          params.push(value);
          sets.push(`${fieldName} = $${params.length}`);
        }
      }
    });

    if (sets.length === 0) return res.status(400).json({ message: 'No editable fields provided' });

    params.push(id);
    const sql = `UPDATE ict_admissions SET ${sets.join(',')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING *`;
    const result = await query(sql, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admission not found' });
    res.json({ admission: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete an admission
router.delete('/admissions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`DELETE FROM ict_admissions WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admission not found' });
    res.json({ deleted: true, admission: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Process an admission into a student profile (admin action)
router.post('/admissions/:id/process', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Fetch the admission
    const adm = await query(`SELECT * FROM ict_admissions WHERE id = $1`, [id]);
    if (adm.rows.length === 0) return res.status(404).json({ error: 'Admission not found' });
    const admission = adm.rows[0];

    // Insert into ict_students with only the required fields
    const cols = ['student_name', 'phone', 'course'];
    const params = [admission.full_name, admission.phone || null, admission.course || null];
    const placeholders = ['$1', '$2', '$3'];

    const studentSql = `INSERT INTO ict_students (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`;
    const studentRes = await query(studentSql, params);
    const student = studentRes.rows[0];

    // Update admission to link to student and mark processed/approved
    await query(`UPDATE ict_admissions SET student_id = $1, admission_status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, [student.id, 'processed', id]);

    res.json({ processed: true, student, admission: { ...admission, student_id: student.id, admission_status: 'processed' } });
  } catch (error) {
    next(error);
  }
});

  // List earnings for a student profile
  router.get('/students/:id/earnings', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT id, student_id, earning_source, amount::float8 AS amount, earning_date, notes, created_at, updated_at
         FROM ict_student_earnings
         WHERE student_id = $1
         ORDER BY earning_date DESC, created_at DESC`,
        [id]
      );

      res.json({ earnings: result.rows });
    } catch (error) {
      next(error);
    }
  });

  // Add an earning statement for a student profile
  router.post('/students/:id/earnings', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { earning_source, amount, earning_date, notes } = req.body || {};
      const parsedAmount = Number(amount);

      if (!earning_source || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'earning_source and valid amount are required.' });
      }

      const studentResult = await query('SELECT id FROM ict_students WHERE id = $1', [id]);
      if (studentResult.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found.' });
      }

      const result = await query(
        `INSERT INTO ict_student_earnings (student_id, earning_source, amount, earning_date, notes)
         VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5)
         RETURNING id, student_id, earning_source, amount::float8 AS amount, earning_date, notes, created_at, updated_at`,
        [id, earning_source, parsedAmount, earning_date || null, notes || null]
      );

      res.status(201).json({ earning: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

// Update admission status
router.patch('/admissions/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admission_status, admission_notes } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(admission_status)) {
      return res.status(400).json({ message: 'Invalid admission_status.' });
    }

    const result = await query(
      `UPDATE ict_admissions
       SET admission_status = $2,
           admission_notes = COALESCE($3, admission_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, admission_status, admission_notes]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    res.json({ admission: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
