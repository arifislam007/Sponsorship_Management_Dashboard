import { Router } from 'express';
import pool, { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Get all inventory categories
router.get('/inventory/categories', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, prefix FROM ict_inventory_categories ORDER BY name ASC`
    );
    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
});

// Add a new inventory category
router.post('/inventory/categories', async (req, res, next) => {
  try {
    const { name, prefix } = req.body || {};

    if (!name || !prefix) {
      return res.status(400).json({ message: 'name and prefix are required.' });
    }

    const result = await query(
      `INSERT INTO ict_inventory_categories (name, prefix)
       VALUES ($1, $2)
       RETURNING id, name, prefix`,
      [name.trim(), prefix.trim().toUpperCase()]
    );

    res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A category with this name already exists.' });
    }
    next(error);
  }
});

// Get employees for the "Assign To" picker (read-only lookup against the shared HR table)
router.get('/inventory/employees', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, employee_code, full_name FROM hr_employees WHERE NOT is_deleted ORDER BY full_name ASC`
    );
    res.json({ employees: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get all inventory items
router.get('/inventory', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT i.id, i.serial_no, i.brand, i.device_serial_no, i.cpu, i.ram, i.ssd, i.hdd,
              i.quantity::float8 AS quantity, i.unit, i.location, i.notes, i.is_active,
              i.purchase_date, i.vendor_name, i.warranty_period,
              i.assigned_to, i.assigned_employee_id,
              i.created_at, i.updated_at,
              c.id AS category_id, c.name AS category_name, c.prefix AS category_prefix
       FROM ict_inventory i
       LEFT JOIN ict_inventory_categories c ON c.id = i.category_id
       ORDER BY i.created_at DESC`
    );
    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create new inventory item - serial number is generated server-side from the category's prefix
router.post('/inventory', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { category_id, brand, cpu, ram, ssd, hdd, device_serial_no, quantity, unit, location, notes, purchase_date, vendor_name, warranty_period, assigned_to, assigned_employee_id } = req.body || {};

    if (!category_id) {
      return res.status(400).json({ message: 'category_id is required.' });
    }

    const parsedQuantity = quantity === undefined || quantity === '' ? 1 : Number(quantity);
    if (Number.isNaN(parsedQuantity)) {
      return res.status(400).json({ message: 'quantity must be a number.' });
    }

    await client.query('BEGIN');

    const categoryResult = await client.query(
      `SELECT id, name, prefix FROM ict_inventory_categories WHERE id = $1`,
      [category_id]
    );
    if (categoryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid category.' });
    }
    const category = categoryResult.rows[0];

    const counterResult = await client.query(
      `INSERT INTO ict_inventory_serial_counters (prefix, last_number)
       VALUES ($1, 1)
       ON CONFLICT (prefix) DO UPDATE SET last_number = ict_inventory_serial_counters.last_number + 1
       RETURNING last_number`,
      [category.prefix]
    );
    const serialNo = `${category.prefix}-${String(counterResult.rows[0].last_number).padStart(2, '0')}`;

    const insertResult = await client.query(
      `INSERT INTO ict_inventory (category_id, serial_no, brand, cpu, ram, ssd, hdd, device_serial_no, quantity, unit, location, notes, purchase_date, vendor_name, warranty_period, assigned_to, assigned_employee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id, serial_no, brand, device_serial_no, cpu, ram, ssd, hdd, quantity::float8 AS quantity, unit, location, notes, is_active, purchase_date, vendor_name, warranty_period, assigned_to, assigned_employee_id, created_at, updated_at, category_id`,
      [category_id, serialNo, brand || null, cpu || null, ram || null, ssd || null, hdd || null, device_serial_no || null, parsedQuantity, unit || null, location || null, notes || null, purchase_date || null, vendor_name || null, warranty_period || null, assigned_to || null, assigned_employee_id || null]
    );

    await client.query('COMMIT');

    res.status(201).json({ item: { ...insertResult.rows[0], category_name: category.name, category_prefix: category.prefix } });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Update inventory item (category/serial number are not changeable after creation)
router.put('/inventory/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { brand, cpu, ram, ssd, hdd, device_serial_no, quantity, unit, location, notes, purchase_date, vendor_name, warranty_period, assigned_to, assigned_employee_id } = req.body || {};

    const result = await query(
      `UPDATE ict_inventory
       SET brand = COALESCE($2, brand),
           cpu = COALESCE($3, cpu),
           ram = COALESCE($4, ram),
           ssd = COALESCE($5, ssd),
           hdd = COALESCE($6, hdd),
           device_serial_no = COALESCE($7, device_serial_no),
           quantity = COALESCE($8, quantity),
           unit = COALESCE($9, unit),
           location = COALESCE($10, location),
           notes = COALESCE($11, notes),
           purchase_date = COALESCE($12, purchase_date),
           vendor_name = COALESCE($13, vendor_name),
           warranty_period = COALESCE($14, warranty_period),
           assigned_to = $15,
           assigned_employee_id = $16,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, serial_no, brand, device_serial_no, cpu, ram, ssd, hdd, quantity::float8 AS quantity, unit, location, notes, is_active, purchase_date, vendor_name, warranty_period, assigned_to, assigned_employee_id, created_at, updated_at, category_id`,
      [id, brand, cpu, ram, ssd, hdd, device_serial_no, quantity === undefined || quantity === '' ? null : Number(quantity), unit, location, notes, purchase_date || null, vendor_name || null, warranty_period || null, assigned_to || null, assigned_employee_id || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Enable/disable inventory item - available to any user with ICT access
router.patch('/inventory/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body || {};

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active must be a boolean.' });
    }

    const result = await query(
      `UPDATE ict_inventory
       SET is_active = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, serial_no, device_serial_no, cpu, ram, ssd, hdd, quantity::float8 AS quantity, unit, location, notes, is_active, created_at, updated_at, category_id`,
      [id, is_active]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete inventory item - admin role only
router.delete('/inventory/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`DELETE FROM ict_inventory WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
