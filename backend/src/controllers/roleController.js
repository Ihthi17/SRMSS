const db = require('../config/db');

// Ensure role_permissions table exists (idempotent)
const ensurePermissionsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      role_id INT NOT NULL,
      page_key VARCHAR(100) NOT NULL,
      UNIQUE KEY uq_role_page (role_id, page_key),
      FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM roles ORDER BY role_id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new role
exports.createRole = async (req, res) => {
  const { role_name, description } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO roles (role_name, description) VALUES (?, ?)',
      [role_name.toUpperCase(), description]
    );
    res.status(201).json({ message: 'Role created successfully', role_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a role
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { role_name, description } = req.body;
  try {
    await db.query(
      'UPDATE roles SET role_name = ?, description = ? WHERE role_id = ?',
      [role_name.toUpperCase(), description, id]
    );
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get permissions for a specific role
exports.getRolePermissions = async (req, res) => {
  const { id } = req.params;
  try {
    await ensurePermissionsTable();
    const [rows] = await db.query(
      'SELECT page_key FROM role_permissions WHERE role_id = ?',
      [id]
    );
    res.json({ role_id: parseInt(id), permissions: rows.map(r => r.page_key) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Set permissions for a role (replaces existing set entirely)
exports.updateRolePermissions = async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body; // array of page_key strings
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'permissions must be an array of page keys' });
  }
  const connection = await db.getConnection();
  try {
    await ensurePermissionsTable();
    await connection.beginTransaction();
    // Remove existing
    await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    // Insert new
    if (permissions.length > 0) {
      const values = permissions.map(p => [parseInt(id), p]);
      await connection.query(
        'INSERT INTO role_permissions (role_id, page_key) VALUES ?',
        [values]
      );
    }
    await connection.commit();
    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Get permissions for a role by role_id — used by auth flow to embed in token storage
exports.getPermissionsByRoleId = async (role_id) => {
  await ensurePermissionsTable();
  const [rows] = await db.query(
    'SELECT page_key FROM role_permissions WHERE role_id = ?',
    [role_id]
  );
  return rows.map(r => r.page_key);
};