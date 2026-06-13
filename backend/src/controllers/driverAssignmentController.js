const db = require("../config/db");

// ==========================================
// 1. DATASETS FOR SELECTION DROPDOWNS
// ==========================================

// Fetch drivers directly from the drivers table to fix empty selectors
exports.getDriversForSelection = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT driver_id, first_name, last_name, license_number 
      FROM drivers 
      ORDER BY first_name ASC
    `);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error fetching drivers for dropdown:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Fetch schedules with joined route codes/names for descriptive template selection
exports.getSchedulesForSelection = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.schedule_id, s.schedule_code, r.route_name, s.departure_time 
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.route_id
      ORDER BY s.schedule_code ASC
    `);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error fetching schedules for dropdown:", error);
    return res.status(500).json({ error: error.message });
  }
};


// ==========================================
// 2. CORE ASSIGNMENT ROSTER CRUD METHODS
// ==========================================

// Fixed to match srmss.sql schema (Using 'vehicles' table instead of non-existent 'buses')
exports.getAllAssignments = async (req, res) => {
  try {
    const queryStr = `
      SELECT 
        da.assignment_id, 
        da.schedule_id, 
        da.driver_id, 
        da.assignment_date, 
        da.shift_start_time, 
        da.shift_end_time, 
        da.status, 
        CONCAT(dr.first_name, ' ', dr.last_name) AS driver_name,
        r.route_name,
        v.registration_number AS bus_number
      FROM driver_assignments da 
      LEFT JOIN drivers dr ON da.driver_id = dr.driver_id 
      LEFT JOIN schedules s ON da.schedule_id = s.schedule_id 
      LEFT JOIN routes r ON s.route_id = r.route_id
      LEFT JOIN vehicle_assignments va ON s.schedule_id = va.schedule_id
      LEFT JOIN vehicles v ON va.vehicle_id = v.vehicle_id
      ORDER BY da.assignment_date DESC, da.shift_start_time ASC;
    `;
    const [rows] = await db.query(queryStr);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error fetching assignments:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Provision / Create a driver assignment with conflict checking
exports.createAssignment = async (req, res) => {
  const { schedule_id, driver_id, assignment_date, shift_start_time, shift_end_time, status } = req.body;
  
  if (!driver_id || !schedule_id || !assignment_date || !shift_start_time || !shift_end_time) {
    return res.status(400).json({ error: "Missing required fields for shift dispatch configuration." });
  }

  try {
    // Waterproof Overlap Engine: Checks if another shift overlaps these targeted hours
    const conflictCheck = `
      SELECT assignment_id FROM driver_assignments 
      WHERE driver_id = ? 
        AND assignment_date = ? 
        AND status != 'Cancelled'
        AND ? < shift_end_time 
        AND ? > shift_start_time
    `;
    
    const [conflicts] = await db.query(conflictCheck, [
      driver_id, 
      assignment_date, 
      shift_start_time, 
      shift_end_time
    ]);
    
    if (conflicts.length > 0) {
      return res.status(400).json({ error: "Driver scheduling collision: This pilot is already booked on an overlapping timeline shift." });
    }

    const [result] = await db.query(
      `INSERT INTO driver_assignments (schedule_id, driver_id, assignment_date, shift_start_time, shift_end_time, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [schedule_id, driver_id, assignment_date, shift_start_time, shift_end_time, status || "Assigned"]
    );

    return res.status(201).json({ 
      message: "Driver assignment logged successfully", 
      assignment_id: result.insertId 
    });
  } catch (error) {
    console.error("❌ Error creating assignment:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Update an existing assignment row with validation safety tracking checks
exports.updateAssignment = async (req, res) => {
  const { id } = req.params;
  const { schedule_id, driver_id, assignment_date, shift_start_time, shift_end_time, status } = req.body;
  
  if (!driver_id || !schedule_id || !assignment_date || !shift_start_time || !shift_end_time) {
    return res.status(400).json({ error: "Missing required properties to alter shift frame." });
  }

  try {
    const conflictCheck = `
      SELECT assignment_id FROM driver_assignments 
      WHERE driver_id = ? 
        AND assignment_date = ? 
        AND assignment_id != ?
        AND status != 'Cancelled'
        AND ? < shift_end_time 
        AND ? > shift_start_time
    `;
    
    const [conflicts] = await db.query(conflictCheck, [
      driver_id, 
      assignment_date, 
      id,
      shift_start_time, 
      shift_end_time
    ]);
    
    if (conflicts.length > 0) {
      return res.status(400).json({ error: "Timeline collision: Modifying this entry causes a shift overlap conflict with another assignment." });
    }

    const updateQuery = `
      UPDATE driver_assignments 
      SET schedule_id = ?, driver_id = ?, assignment_date = ?, shift_start_time = ?, shift_end_time = ?, status = ?
      WHERE assignment_id = ?
    `;
    
    const [result] = await db.query(updateQuery, [
      schedule_id, 
      driver_id, 
      assignment_date, 
      shift_start_time, 
      shift_end_time, 
      status, 
      id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Target assignment shift row not found." });
    }

    return res.json({ message: "Driver assignment details updated successfully." });
  } catch (error) {
    console.error("❌ Error updating assignment:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Terminate / Delete an assignment entry permanently
exports.deleteAssignment = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM driver_assignments WHERE assignment_id = ?", [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Target row already discarded or non-existent." });
    }
    
    return res.json({ message: "Assignment discarded safely." });
  } catch (error) {
    console.error("❌ Error deleting assignment:", error);
    return res.status(500).json({ error: error.message });
  }
};