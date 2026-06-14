const db = require("../config/db");

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
    res.status(200).json(rows); // Raw array for React state management
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

// 3. Create a brand new schedule node mapping with Conflict Validation
exports.createSchedule = async (req, res) => {
  const { depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status } = req.body;

  // AUTOMATED CONFLICT DETECTION
  if (route_id && schedule_date && departure_time && expected_arrival_time) {
    const conflictQuery = `
      SELECT * FROM schedules 
      WHERE route_id = ? 
        AND schedule_date = ? 
        AND status NOT IN ('Cancelled', 'Completed')
        AND (
          (departure_time <= ? AND expected_arrival_time >= ?) OR
          (departure_time <= ? AND expected_arrival_time >= ?) OR
          (? <= departure_time AND ? >= expected_arrival_time)
        )
    `;
    try {
      const [conflicts] = await db.execute(conflictQuery, [
        route_id, schedule_date, 
        departure_time, departure_time,
        expected_arrival_time, expected_arrival_time,
        departure_time, expected_arrival_time
      ]);

      if (conflicts.length > 0) {
        return res.status(400).json({ 
          error: `Overlap Error: Route timeline conflicts with schedule block [${conflicts[0].schedule_code}] running at that time.` 
        });
      }
    } catch (err) {
      return res.status(500).json({ error: "Conflict structural analysis failed: " + err.message });
    }
  }

  const query = `
    INSERT INTO schedules (depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  try {
    await db.execute(query, [
      depot_id || null, route_id || null, schedule_code, schedule_date || null, 
      schedule_type || null, departure_time || null, expected_arrival_time || null, status || 'Scheduled'
    ]);
    res.status(201).json({ message: "Operational transit schedule created successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Execution matrix compilation failed: " + error.message });
  }
};

// 4. Update an existing log instance parameters with Overlap Guards
exports.updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status } = req.body;

  if (route_id && schedule_date && departure_time && expected_arrival_time) {
    const conflictQuery = `
      SELECT * FROM schedules 
      WHERE route_id = ? 
        AND schedule_date = ? 
        AND schedule_id != ?
        AND status NOT IN ('Cancelled', 'Completed')
        AND (
          (departure_time <= ? AND expected_arrival_time >= ?) OR
          (departure_time <= ? AND expected_arrival_time >= ?) OR
          (? <= departure_time AND ? >= expected_arrival_time)
        )
    `;
    try {
      const [conflicts] = await db.execute(conflictQuery, [
        route_id, schedule_date, id,
        departure_time, departure_time, expected_arrival_time, expected_arrival_time, departure_time, expected_arrival_time
      ]);

      if (conflicts.length > 0) {
        return res.status(400).json({ 
          error: `Adjustment Refused: Timeline conflicts with schedule configuration block [${conflicts[0].schedule_code}].` 
        });
      }
    } catch (err) {
      return res.status(500).json({ error: "Conflict validation matrix analysis failed." });
    }
  }

  const query = `
    UPDATE schedules 
    SET depot_id = ?, route_id = ?, schedule_code = ?, schedule_date = ?, schedule_type = ?, departure_time = ?, expected_arrival_time = ?, status = ?
    WHERE schedule_id = ?
  `;
  try {
    await db.execute(query, [
      depot_id || null, route_id || null, schedule_code, schedule_date || null, 
      schedule_type || null, departure_time || null, expected_arrival_time || null, status, id
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