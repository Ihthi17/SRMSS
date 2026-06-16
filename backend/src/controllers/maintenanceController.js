const db = require("../config/db");

// ============================================================================
// STATUS WORKFLOW VALIDATION
// ============================================================================

// Valid status transitions: from → allowed next states
const STATUS_TRANSITIONS = {
  "Scheduled":    ["In Progress", "Completed"],
  "In Progress":  ["Completed"],
  "Completed":    []   // final state, no backwards transitions
};

const VALID_MAINTENANCE_TYPES = [
  "Routine", "Oil Change", "Tire Replacement", "Brake Service",
  "Engine Repair", "Electrical", "Suspension", "Other"
];

const VALID_STATUSES = ["Scheduled", "In Progress", "Completed"];

/**
 * Validates if a status transition is allowed
 * @param {string} from - Current status
 * @param {string} to - Desired status
 * @returns {boolean} - True if transition is valid
 */
function isValidTransition(from, to) {
  // No change is allowed
  if (!from || from === to) return true;
  
  const allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Generates a descriptive error message for invalid status transitions
 * @param {string} from - Current status
 * @param {string} to - Desired status
 * @returns {string} - Error message
 */
function getTransitionErrorMessage(from, to) {
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (allowed.length === 0) {
    return `Cannot transition from '${from}' - this is a final state.`;
  }
  return `Invalid status transition: cannot move from '${from}' to '${to}'. ` +
         `Allowed transitions from '${from}': ${allowed.join(", ")}`;
}

/**
 * Validates all maintenance record inputs
 * @param {object} data - Request body data
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {object} - { valid: boolean, errors: object }
 */
function validateMaintenanceData(data, isUpdate = false) {
  const errors = {};

  // Required fields for create
  if (!isUpdate) {
    if (!data.vehicle_id) errors.vehicle_id = "vehicle_id is required";
    if (!data.maintenance_type) errors.maintenance_type = "maintenance_type is required";
    if (!data.maintenance_date) errors.maintenance_date = "maintenance_date is required";
    if (!data.maintenance_time) errors.maintenance_time = "maintenance_time is required";
    if (data.cost === undefined) errors.cost = "cost is required";
    if (!data.maintenance_status) errors.maintenance_status = "maintenance_status is required";
  }

  // Validate maintenance_type enum
  if (data.maintenance_type && !VALID_MAINTENANCE_TYPES.includes(data.maintenance_type)) {
    errors.maintenance_type = `Must be one of: ${VALID_MAINTENANCE_TYPES.join(", ")}`;
  }

  // Validate maintenance_status enum
  if (data.maintenance_status && !VALID_STATUSES.includes(data.maintenance_status)) {
    errors.maintenance_status = `Must be one of: ${VALID_STATUSES.join(", ")}`;
  }

  // Validate cost >= 0
  if (data.cost !== undefined && parseFloat(data.cost) < 0) {
    errors.cost = "Must be a non-negative decimal value";
  }

  // Validate date format (YYYY-MM-DD)
  if (data.maintenance_date && !isValidDateFormat(data.maintenance_date)) {
    errors.maintenance_date = "Must be in ISO 8601 format (YYYY-MM-DD)";
  }

  // Validate time format (HH:MM:SS)
  if (data.maintenance_time && !isValidTimeFormat(data.maintenance_time)) {
    errors.maintenance_time = "Must be in HH:MM:SS format";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates ISO 8601 date format
 * @param {string} date - Date string
 * @returns {boolean}
 */
function isValidDateFormat(date) {
  if (!date || typeof date !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  
  // Additional check: verify it's a valid date
  const dateObj = new Date(date + 'T00:00:00Z');
  return dateObj instanceof Date && !isNaN(dateObj);
}

/**
 * Validates HH:MM:SS time format
 * @param {string} time - Time string
 * @returns {boolean}
 */
function isValidTimeFormat(time) {
  if (!time || typeof time !== 'string') return false;
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return regex.test(time);
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

// 1. CREATE
exports.createMaintenanceRecord = async (req, res) => {
  const {
    vehicle_id, maintenance_type, maintenance_date, maintenance_time,
    description, cost, performed_by, maintenance_status, next_maintenance_date
  } = req.body;

  // Validate input
  const validation = validateMaintenanceData(req.body, false);
  if (!validation.valid) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.errors
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Validate vehicle exists
    const [vehicleRows] = await connection.query(
      "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?",
      [vehicle_id]
    );
    if (vehicleRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        error: "Vehicle not found",
        message: `No vehicle exists with vehicle_id ${vehicle_id}`
      });
    }

    // Insert maintenance record
    const [result] = await connection.query(
      `INSERT INTO maintenance_records
        (vehicle_id, maintenance_type, maintenance_date, maintenance_time, description, 
         cost, performed_by, maintenance_status, next_maintenance_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id, maintenance_type, maintenance_date, maintenance_time,
        description || null, parseFloat(cost), performed_by || null,
        maintenance_status, next_maintenance_date || null
      ]
    );

    const maintenanceId = result.insertId;

    // Generate alert if status is Completed (corrective maintenance)
    if (maintenance_status === "Completed") {
      await connection.query(
        `INSERT INTO maintenance_alerts
          (vehicle_id, alert_type, alert_message, is_resolved)
         VALUES (?, 'Corrective Maintenance Completed', ?, 1)`,
        [vehicle_id, `Maintenance record ${maintenanceId} completed for vehicle ${vehicle_id}`]
      );
    }

    await connection.commit();
    
    return res.status(201).json({
      message: "Maintenance record created successfully",
      maintenanceId: maintenanceId
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ createMaintenanceRecord Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to create maintenance record"
    });
  } finally {
    connection.release();
  }
};

// 2. READ ALL — with optional filters and sorting
exports.getAllMaintenanceRecords = async (req, res) => {
  try {
    const {
      vehicle_id,
      maintenance_status,
      maintenance_type,
      start_date,
      end_date,
      page = 1,
      limit = 50,
      sort = "maintenance_date"
    } = req.query;

    // Build WHERE clause
    let sql = `
      SELECT mr.*, v.registration_number
      FROM maintenance_records mr
      LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (vehicle_id) {
      sql += " AND mr.vehicle_id = ?";
      params.push(vehicle_id);
    }
    if (maintenance_status) {
      sql += " AND mr.maintenance_status = ?";
      params.push(maintenance_status);
    }
    if (maintenance_type) {
      sql += " AND mr.maintenance_type = ?";
      params.push(maintenance_type);
    }
    if (start_date) {
      sql += " AND mr.maintenance_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      sql += " AND mr.maintenance_date <= ?";
      params.push(end_date);
    }

    // Add sorting (default: date descending)
    sql += " ORDER BY mr.maintenance_date DESC, mr.maintenance_time DESC";

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const [rows] = await db.query(sql, params);

    return res.status(200).json({
      data: rows,
      page: parseInt(page),
      limit: parseInt(limit),
      total: rows.length
    });
  } catch (error) {
    console.error("❌ getAllMaintenanceRecords Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve maintenance records"
    });
  }
};

// 3. READ SINGLE — with 404 handling
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

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Maintenance record not found",
        message: `No maintenance record exists with maintenance_id ${maintenance_id}`
      });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("❌ getMaintenanceRecordById Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve maintenance record"
    });
  }
};

// 4. UPDATE — enforce status workflow with clear error messages
exports.updateMaintenanceRecord = async (req, res) => {
  const { maintenance_id } = req.params;
  const fields = req.body;

  if (!maintenance_id) {
    return res.status(400).json({
      error: "Invalid request",
      message: "maintenance_id is required"
    });
  }

  if (!fields || Object.keys(fields).length === 0) {
    return res.status(400).json({
      error: "Validation failed",
      details: { body: "At least one field must be provided for update" }
    });
  }

  // Validate provided fields
  const validation = validateMaintenanceData(fields, true);
  if (!validation.valid) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.errors
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch existing record
    const [existing] = await connection.query(
      "SELECT * FROM maintenance_records WHERE maintenance_id = ?",
      [maintenance_id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        error: "Maintenance record not found",
        message: `No maintenance record exists with maintenance_id ${maintenance_id}`
      });
    }

    const current = existing[0];

    // Validate status transition if status is being changed
    if (fields.maintenance_status && fields.maintenance_status !== current.maintenance_status) {
      if (!isValidTransition(current.maintenance_status, fields.maintenance_status)) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          error: "Invalid status transition",
          message: getTransitionErrorMessage(current.maintenance_status, fields.maintenance_status),
          currentStatus: current.maintenance_status,
          requestedStatus: fields.maintenance_status
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(fields)) {
      if (key !== "maintenance_id" && key !== "created_at" && key !== "updated_at") {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        error: "No updatable fields provided",
        message: "Cannot update system fields (maintenance_id, created_at, updated_at)"
      });
    }

    updateValues.push(maintenance_id);

    // Execute update
    await connection.query(
      `UPDATE maintenance_records SET ${updateFields.join(", ")} WHERE maintenance_id = ?`,
      updateValues
    );

    // Generate alert if status transitions to Completed
    const newStatus = fields.maintenance_status;
    if (newStatus === "Completed" && current.maintenance_status !== "Completed") {
      await connection.query(
        `INSERT INTO maintenance_alerts
          (vehicle_id, alert_type, alert_message, is_resolved)
         VALUES (?, 'Corrective Maintenance Completed', ?, 1)`,
        [current.vehicle_id, `Maintenance record ${maintenance_id} transitioned to Completed for vehicle ${current.vehicle_id}`]
      );
    }

    await connection.commit();

    return res.status(200).json({
      message: "Maintenance record updated successfully",
      maintenanceId: maintenance_id,
      newStatus: newStatus || current.maintenance_status
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ updateMaintenanceRecord Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update maintenance record"
    });
  } finally {
    connection.release();
  }
};

// 5. DELETE — cascade deletes related alerts via database FK
exports.deleteMaintenanceRecord = async (req, res) => {
  const { maintenance_id } = req.params;

  if (!maintenance_id) {
    return res.status(400).json({
      error: "Invalid request",
      message: "maintenance_id is required"
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Check if record exists
    const [existing] = await connection.query(
      "SELECT maintenance_id FROM maintenance_records WHERE maintenance_id = ?",
      [maintenance_id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        error: "Maintenance record not found",
        message: `No maintenance record exists with maintenance_id ${maintenance_id}`
      });
    }

    // Delete maintenance record
    // Cascade delete of related maintenance_alerts happens via database FK
    // (maintenance_alerts.vehicle_id is FK with ON DELETE CASCADE)
    // However, alerts are tied to vehicle_id not maintenance_id, so we manually delete alerts
    // that were generated from this maintenance record
    await connection.query(
      `DELETE FROM maintenance_alerts 
       WHERE vehicle_id = (SELECT vehicle_id FROM maintenance_records WHERE maintenance_id = ?)
       AND alert_message LIKE ?`,
      [maintenance_id, `Maintenance record ${maintenance_id}%`]
    );

    // Delete the maintenance record
    const [result] = await connection.query(
      "DELETE FROM maintenance_records WHERE maintenance_id = ?",
      [maintenance_id]
    );

    await connection.commit();

    return res.status(200).json({
      message: "Maintenance record and associated alerts deleted successfully",
      maintenanceId: maintenance_id,
      rowsAffected: result.affectedRows
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ deleteMaintenanceRecord Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete maintenance record"
    });
  } finally {
    connection.release();
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
