import pg from 'pg';
import bcryptjs from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://sombhabona_user:sombhabona_secure_password_2026@db:5432/sombhabona'
});

async function seedAdmin() {
  try {
    const passwordHash = await bcryptjs.hash('password', 10);
    
    // Insert admin user
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['admin', 'admin@example.com', passwordHash, 'Administrator', true]
    );
    
    const userId = userResult.rows[0].id;
    
    // Get admin role
    const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin']);
    const roleId = roleResult.rows[0].id;
    
    // Assign role
    await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
    
    console.log('Admin user created successfully');
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      console.log('Admin user already exists');
    } else {
      console.error('Error:', error);
    }
  } finally {
    await pool.end();
  }
}

seedAdmin();
