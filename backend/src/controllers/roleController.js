const db = require('../config/db');

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