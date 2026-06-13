const db = require("../config/db"); // Adjust paths based on your environment configurations

// 1. Get all schedules with related Depot and Route data labels
exports.getAllSchedules = async (req, res) => {
  const query = `
    SELECT s.*, d.depot_name, r.route_name 
    FROM schedules s
    LEFT JOIN depots d ON s.depot_id = d.depot_id
    LEFT JOIN routes r ON s.route_id = r.route_id
    ORDER BY s.schedule_date DESC, s.departure_time ASC
  `;
  try {
    const [rows] = await db.execute(query);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch master schedule records: " + error.message });
  }
};

// 2. Fetch unique schedule types for the dynamic dropdown registry
exports.getDistinctTypes = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT DISTINCT schedule_type FROM schedules WHERE schedule_type IS NOT NULL");
    const types = rows.map(r => r.schedule_type);
    res.status(200).json(types);
  } catch (error) {
    res.status(500).json({ error: "Failed to load distinct schedule variations." });
  }
};

// 3. Create a brand new schedule node mapping
exports.createSchedule = async (req, res) => {
  const { depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status } = req.body;
  const query = `
    INSERT INTO schedules (depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  try {
    await db.execute(query, [
      depot_id || null, 
      route_id || null, 
      schedule_code, 
      schedule_date || null, 
      schedule_type || null, 
      departure_time || null, 
      expected_arrival_time || null, 
      status || 'Scheduled'
    ]);
    res.status(201).json({ message: "Operational transit schedule created successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Execution matrix compilation failed: " + error.message });
  }
};

// 4. Update an existing log instance parameters
exports.updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status } = req.body;
  const query = `
    UPDATE schedules 
    SET depot_id = ?, route_id = ?, schedule_code = ?, schedule_date = ?, schedule_type = ?, departure_time = ?, expected_arrival_time = ?, status = ?
    WHERE schedule_id = ?
  `;
  try {
    await db.execute(query, [
      depot_id || null, 
      route_id || null, 
      schedule_code, 
      schedule_date || null, 
      schedule_type || null, 
      departure_time || null, 
      expected_arrival_time || null, 
      status, 
      id
    ]);
    res.status(200).json({ message: "Schedule structural metrics updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Updating operational schedule properties failed: " + error.message });
  }
};

// 5. Purge a record permanently
exports.deleteSchedule = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM schedules WHERE schedule_id = ?", [id]);
    res.status(200).json({ message: "Selected scheduling block dropped from registers." });
  } catch (error) {
    res.status(500).json({ error: "Failed to drop entry block structural references: " + error.message });
  }
};