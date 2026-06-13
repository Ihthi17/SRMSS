const db = require('../config/db');
const bcrypt = require('bcrypt');

// Get all users with relational Role and Depot descriptors
exports.getAllUsers = async (req, res) => {
  try {
    const queryStr = `
      SELECT 
        u.user_id, u.username, u.email, u.first_name, u.last_name, 
        u.phone_number, u.is_active, u.role_id, u.depot_id,
        r.role_name, d.depot_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN depots d ON u.depot_id = d.depot_id
      ORDER BY u.user_id DESC
    `;
    const [rows] = await db.query(queryStr);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create user profile (with secure hash parameters matching database field lengths)
exports.createUser = async (req, res) => {
  const { username, email, password, first_name, last_name, phone_number, role_id, depot_id } = req.body;
  try {
    // Generate secure crypt-hash text block for data fields matching your database length
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password || 'default123', saltRounds);

    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone_number, role_id, depot_id, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [username, email, password_hash, first_name, last_name, phone_number, role_id, depot_id]
    );

    res.status(201).json({ message: 'User account provisioned successfully', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// controller/userController.js (Update user settings profile data rows)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, password, first_name, last_name, phone_number, role_id, depot_id, is_active } = req.body;

  try {
    // 🌟 Normalize the status to a 1 or 0 value for MySQL tinyint
    const activeStatus = is_active === true || parseInt(is_active) === 1 ? 1 : 0;

    let updateQuery = `
      UPDATE users 
      SET username = ?, email = ?, first_name = ?, last_name = ?, phone_number = ?, role_id = ?, depot_id = ?, is_active = ?
    `;
    let queryParams = [username, email, first_name, last_name, phone_number, role_id, depot_id, activeStatus];

    if (password && password.trim() !== "") {
      const saltRounds = 10;
      const new_hash = await bcrypt.hash(password, saltRounds);
      updateQuery += `, password_hash = ? `;
      queryParams.push(new_hash);
    }

    updateQuery += ` WHERE user_id = ?`;
    queryParams.push(id);

    await db.query(updateQuery, queryParams);
    res.json({ message: 'User account status or metadata updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user execution logic
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE user_id = ?', [id]);
    res.json({ message: 'User deleted safely.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};