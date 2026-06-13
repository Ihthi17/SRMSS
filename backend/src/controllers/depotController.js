const db = require('../config/db'); // This now imports the promise-wrapped pool

exports.getAllDepots = async (req, res) => {
  try {
    // Destructuring [rows] works perfectly with pool.promise()
    const [rows] = await db.query('SELECT * FROM depots ORDER BY depot_id DESC');
    
    // Send back a clean array
    res.json(rows); 
  } catch (error) {
    console.error("Database query crash:", error);
    res.status(500).json({ error: "Database failure: " + error.message });
  }
};
// Create new depot infrastructure log
exports.createDepot = async (req, res) => {
  const { depot_name, location, contact_person, contact_phone, email, address } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO depots (depot_name, location, contact_person, contact_phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
      [depot_name, location, contact_person, contact_phone, email, address]
    );
    res.status(201).json({ message: 'Depot registered successfully', depot_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an existing depot profile
exports.updateDepot = async (req, res) => {
  const { id } = req.params;
  const { depot_name, location, contact_person, contact_phone, email, address } = req.body;
  try {
    await db.query(
      'UPDATE depots SET depot_name = ?, location = ?, contact_person = ?, contact_phone = ?, email = ?, address = ? WHERE depot_id = ?',
      [depot_name, location, contact_person, contact_phone, email, address, id]
    );
    res.json({ message: 'Depot information updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a depot entry
exports.deleteDepot = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM depots WHERE depot_id = ?', [id]);
    res.json({ message: 'Depot configuration removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Cannot delete depot. Check if it contains active vehicles or users.' });
  }
};