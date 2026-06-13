const db = require('../config/db');

// 1. CREATE a new stop
exports.createStop = async (req, res) => {
  const { route_id, stop_sequence, stop_name, latitude, longitude, distance_from_start, estimated_arrival_time } = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO route_stops 
      (route_id, stop_sequence, stop_name, latitude, longitude, distance_from_start, estimated_arrival_time) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [route_id, stop_sequence, stop_name, latitude, longitude, distance_from_start, estimated_arrival_time]
    );
    res.status(201).json({ success: true, message: 'Stop added successfully', stop_id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. READ all stops for a specific route
exports.getStopsByRoute = async (req, res) => {
  const { routeId } = req.params;
  try {
    const [stops] = await db.execute(
      `SELECT * FROM route_stops WHERE route_id = ? ORDER BY stop_sequence ASC`,
      [routeId]
    );
    res.json({ success: true, data: stops });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. UPDATE an existing stop
exports.updateStop = async (req, res) => {
  const { id } = req.params;
  const { stop_sequence, stop_name, latitude, longitude, distance_from_start, estimated_arrival_time } = req.body;
  try {
    await db.execute(
      `UPDATE route_stops 
       SET stop_sequence = ?, stop_name = ?, latitude = ?, longitude = ?, distance_from_start = ?, estimated_arrival_time = ? 
       WHERE stop_id = ?`,
      [stop_sequence, stop_name, latitude, longitude, distance_from_start, estimated_arrival_time, id]
    );
    res.json({ success: true, message: 'Stop updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. DELETE a stop
exports.deleteStop = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM route_stops WHERE stop_id = ?', [id]);
    res.json({ success: true, message: 'Stop deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};