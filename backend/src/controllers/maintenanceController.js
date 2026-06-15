const db = require("../config/db");

// Valid status transitions: from → allowed next states
const STATUS_TRANSITIONS = {
  "Scheduled":    ["In Progress", "Completed"],
  "In Progress":  ["Completed"],
  "Completed":    []   // final state
};

function isValidTransition(from, to) {
  if (!from || from === to) return true; // same state is treated as no change
  const allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// 1. CREATE
exports.createMaintenanceRecord = async (req, res) => {
  const {
    vehicle_id, maintenance_type, maintenance_date, maintenance_time,
    description, cost, performed_by, maintenance_status, next_maintenance_date
  } = req.body;

  if (!vehicle_id || !maintenance_type || !maintenance_date || !maintenance_time || cost === undefined || !maintenance_status) {
    return res.status(400).json({ message: "Missing required maintenance record fields." });
  }

  const validTypes = ["Routine", "Oil Change", "Tire Replacement", "Brake Service", "Engine Repair", "Electrical", "Suspension", "Other"];
  if (!validTypes.includes(maintenance_type)) {
    return res.status(400).json({ message: `Invalid maintenance_type. Must be one of: ${validTypes.join(", ")}` });
  }

  const validStatuses = ["Scheduled", "In Progress", "Completed"];
  if (!validStatuses.includes(maintenance_status)) {
    return res.status(400).json({ message: "Invalid maintenance_status. Must be Scheduled, In Progress, or Completed." });
  }
  if (parseFloat(cost) < 0) {
    return res.status(400).json({ message: "cost must be non-negative." });
  }

  try {
    // Validate vehicle exists
    const [vehicleRows] = await db.query("SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?", [vehicle_id]);
    if (vehicleRows.length === 0) return res.status(404).json({ message: "Referenced vehicle_id does not exist." });

    const [result] = await db.query(
      `INSERT INTO maintenance_records
         (vehicle_id, maintenance_type, maintenance_date, maintenance_time, description, cost, performed_by, maintenance_status, next_maintenance_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id, maintenance_type, maintenance_date, maintenance_time,
        description || null, parseFloat(cost), performed_by || null,
        maintenance_status, next_maintenance_date || null
      ]
    );

    return res.status(201).json({
      message: "Maintenance record created successfully.",
      maintenanceId: result.insertId
    });
  } catch (error) {
    console.error("❌ createMaintenanceRecord Error:", error);
    return res.status(500).json({ message: "Internal server error creating maintenance record." });
  }
};

// 2. READ ALL — with optional filters
exports.getAllMaintenanceRecords = async (req, res) => {
  try {
    const { vehicle_id, maintenance_status, maintenance_type, start_date, end_date, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT mr.*, v.registration_number
      FROM maintenance_records mr
      LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id)         { sql += " AND mr.vehicle_id = ?";         params.push(vehicle_id); }
    if (maintenance_status) { sql += " AND mr.maintenance_status = ?"; params.push(maintenance_status); }
    if (maintenance_type)   { sql += " AND mr.maintenance_type = ?";   params.push(maintenance_type); }
    if (start_date)         { sql += " AND mr.maintenance_date >= ?";  params.push(start_date); }
    if (end_date)           { sql += " AND mr.maintenance_date <= ?";  params.push(end_date); }

    sql += " ORDER BY mr.maintenance_date DESC, mr.maintenance_time DESC";
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const [rows] = await db.query(sql, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("❌ getAllMaintenanceRecords Error:", error);
    return res.status(500).json({ message: "Internal server error retrieving maintenance records." });
  }
};

// 3. READ SINGLE
exports.getMaintenanceRecordById = async (req, res) => {
  try {
    const { maintenance_id } = req.params;
    const [rows] = await db.query(
      `SELECT mr.*, v.registration_number
       FROM maintenance_records mr
       LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
       WHERE mr.maintenance_id = ?`,
      [maintenance_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Maintenance record not found." });
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("❌ getMaintenanceRecordById Error:", error);
    return res.status(500).json({ message: "Internal server error retrieving maintenance record." });
  }
};

// 4. UPDATE — enforce status workflow
exports.updateMaintenanceRecord = async (req, res) => {
  const { maintenance_id } = req.params;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ message: "No fields provided to update." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT * FROM maintenance_records WHERE maintenance_id = ?", [maintenance_id]
    );
    if (existing.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Maintenance record not found." });
    }

    const current = existing[0];

    // Validate status transition if status is being changed
    if (fields.maintenance_status && fields.maintenance_status !== current.maintenance_status) {
      if (!isValidTransition(current.maintenance_status, fields.maintenance_status)) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          message: `Invalid status transition: cannot move from '${current.maintenance_status}' to '${fields.maintenance_status}'.`
        });
      }
    }

    if (fields.cost !== undefined && parseFloat(fields.cost) < 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: "cost must be non-negative." });
    }

    const keys = [];
    const values = [];
    for (const [k, v] of Object.entries(fields)) {
      if (k !== "maintenance_id" && k !== "created_at") {
        keys.push(`${k} = ?`);
        values.push(v);
      }
    }
    values.push(maintenance_id);

    await connection.query(`UPDATE maintenance_records SET ${keys.join(", ")} WHERE maintenance_id = ?`, values);

    // When status transitions to Completed: generate a resolved alert
    const newStatus = fields.maintenance_status;
    if (newStatus === "Completed" && current.maintenance_status !== "Completed") {
      await connection.query(
        `INSERT INTO maintenance_alerts (vehicle_id, alert_type, alert_message, is_resolved)
         VALUES (?, 'Corrective Maintenance Completed', ?, 1)`,
        [current.vehicle_id, `Maintenance record ${maintenance_id} marked as Completed for vehicle ${current.vehicle_id}`]
      );
    }

    await connection.commit();
    return res.status(200).json({ message: "Maintenance record updated successfully." });
  } catch (error) {
    await connection.rollback();
    console.error("❌ updateMaintenanceRecord Error:", error);
    return res.status(500).json({ message: "Internal server error updating maintenance record." });
  } finally {
    connection.release();
  }
};

// 5. DELETE — cascade deletes related alerts
exports.deleteMaintenanceRecord = async (req, res) => {
  try {
    const { maintenance_id } = req.params;
    const [result] = await db.query("DELETE FROM maintenance_records WHERE maintenance_id = ?", [maintenance_id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Maintenance record not found." });
    return res.status(200).json({ message: "Maintenance record deleted successfully." });
  } catch (error) {
    console.error("❌ deleteMaintenanceRecord Error:", error);
    return res.status(500).json({ message: "Internal server error deleting maintenance record." });
  }
};

// 6. SUMMARY REPORT
exports.getMaintenanceSummaryReport = async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date } = req.query;

    let where = "WHERE 1=1";
    const params = [];
    if (vehicle_id)  { where += " AND vehicle_id = ?";        params.push(vehicle_id); }
    if (start_date)  { where += " AND maintenance_date >= ?"; params.push(start_date); }
    if (end_date)    { where += " AND maintenance_date <= ?"; params.push(end_date); }

    const [summary] = await db.query(
      `SELECT
         SUM(cost) AS total_cost,
         COUNT(*) AS total_count,
         SUM(CASE WHEN maintenance_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
         SUM(CASE WHEN maintenance_status = 'Scheduled' THEN 1 ELSE 0 END) AS scheduled_count,
         AVG(cost) AS avg_cost
       FROM maintenance_records ${where}`,
      params
    );

    const [byType] = await db.query(
      `SELECT maintenance_type, COUNT(*) AS count, SUM(cost) AS total_cost
       FROM maintenance_records ${where}
       GROUP BY maintenance_type`,
      params
    );

    const [trend] = await db.query(
      `SELECT maintenance_date, maintenance_type, cost, maintenance_status
       FROM maintenance_records ${where}
       ORDER BY maintenance_date DESC`,
      params
    );

    return res.status(200).json({
      summary: {
        ...summary[0],
        completion_rate: summary[0].total_count > 0
          ? parseFloat((summary[0].completed_count / summary[0].total_count).toFixed(2))
          : 0
      },
      byType,
      trend
    });
  } catch (error) {
    console.error("❌ getMaintenanceSummaryReport Error:", error);
    return res.status(500).json({ message: "Internal server error generating maintenance report." });
  }
};
