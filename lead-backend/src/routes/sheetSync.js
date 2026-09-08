import { Router } from 'express';
import { query } from '../db.js';
import { bulkInsertLeads } from './leads.js';
import { fetchSheetRows, extractSpreadsheetId, getServiceAccountEmail } from '../googleSheets.js';

export const sheetSyncRouter = Router();

sheetSyncRouter.get('/config', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM lead_sheet_config ORDER BY id DESC LIMIT 1');
    res.json({
      config: r.rows[0] || null,
      service_account_email: getServiceAccountEmail(),
    });
  } catch (err) { next(err); }
});

sheetSyncRouter.put('/config', async (req, res, next) => {
  try {
    const { spreadsheet_id, sheet_name } = req.body;
    if (!spreadsheet_id?.trim()) return res.status(400).json({ message: 'Spreadsheet URL or ID is required' });

    const id = extractSpreadsheetId(spreadsheet_id);
    const name = sheet_name?.trim() || 'Sheet1';

    const existing = await query('SELECT id FROM lead_sheet_config ORDER BY id DESC LIMIT 1');
    const r = existing.rows.length
      ? await query(
          `UPDATE lead_sheet_config SET spreadsheet_id=$1, sheet_name=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,
          [id, name, existing.rows[0].id]
        )
      : await query(
          `INSERT INTO lead_sheet_config (spreadsheet_id, sheet_name) VALUES ($1, $2) RETURNING *`,
          [id, name]
        );

    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Header alias matching, mirroring BulkLeadUploadModal's Excel parser ───────

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function getValue(row, aliases) {
  for (const alias of aliases) {
    const match = Object.entries(row).find(([key]) => normalizeHeader(key) === normalizeHeader(alias));
    if (match) return match[1];
  }
  return undefined;
}

sheetSyncRouter.post('/sync', async (req, res, next) => {
  try {
    const configResult = await query('SELECT * FROM lead_sheet_config ORDER BY id DESC LIMIT 1');
    const cfg = configResult.rows[0];
    if (!cfg) return res.status(400).json({ message: 'No Google Sheet configured yet' });

    const sheetRows = await fetchSheetRows(cfg.spreadsheet_id, cfg.sheet_name);
    if (!sheetRows.length) {
      return res.json({ created: 0, failed: 0, errors: [], message: 'Sheet has no data rows' });
    }

    const coursesResult = await query('SELECT id, name FROM lead_courses');
    const courses = coursesResult.rows;

    const parsed = sheetRows.map(row => {
      const courseName = String(getValue(row, ['course']) ?? '').trim();
      const course = courses.find(c => c.name.toLowerCase() === courseName.toLowerCase());
      return {
        full_name: String(getValue(row, ['name', 'full_name']) ?? '').trim(),
        phone: String(getValue(row, ['phone', 'mobile']) ?? '').trim(),
        email: String(getValue(row, ['email']) ?? '').trim() || undefined,
        course_id: course?.id,
        source: String(getValue(row, ['source']) ?? 'Other').trim() || 'Other',
        reference_name: String(getValue(row, ['reference_name', 'reference', 'referee']) ?? '').trim() || undefined,
        notes: String(getValue(row, ['notes']) ?? '').trim() || undefined,
      };
    });

    const result = await bulkInsertLeads(parsed);

    await query('UPDATE lead_sheet_config SET last_synced_at=CURRENT_TIMESTAMP WHERE id=$1', [cfg.id]);

    res.json(result);
  } catch (err) { next(err); }
});
