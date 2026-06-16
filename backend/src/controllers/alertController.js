const db = require("../config/db");

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Format alert message based on alert type
 * @param {string} alertType - The type of alert
 * @param {number} vehicleId - The vehicle ID
 * @param {object} additionalData - Additional context for message formatting
 * @returns {string} Formatted alert message
 */
function formatAlertMessage(alertType, vehicleId, additionalData = {}) {
  const baseMessage = `Vehicle ${vehicleId}`;
  
  switch (alertType) {
    case "Scheduled Maintenance Due":
      return `${baseMessage} is due for scheduled maintenance`;
    case "Corrective Maintenance Completed":
      return `${baseMessage} corrective maintenance has been completed`;
    case "Overdue Maintenance":
      return `${baseMessage} is overdue for scheduled maintenance`;
    case "Fuel Efficiency Warning":
      return `${baseMessage} fuel efficiency has dropped below average`;
    default:
      return `${baseMessage} maintenance alert: ${alertType}`;
  }
}

/**
 * Build WHERE clause filters for alerts query
 * @param {object} filters - Query parameters object
 * @returns {object} Object with { whereClause, params }
 */
function buildAlertFilters(filters) {
  const whereConditions = [];
  const params = [];

  if (filters.vehicle_id) {
    whereConditions.push("ma.vehicle_id = ?");
    params.push(filters.vehicle_id);
  }

  if (filters.is_resolved !== undefined && filters.is_resolved !== "") {
    whereConditions.push("ma.is_resolved = ?");
    const isResolved = filters.is_resolved === "true" || filters.is_resolved === "1" ? 1 : 0;
    params.push(isResolved);
  }

  if (filters.alert_type) {
    whereConditions.push("ma.alert_type = ?");
    params.push(filters.alert_type);
  }

  if (filters.start_date) {
    whereConditions.push("DATE(ma.created_at) >= ?");
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    whereConditions.push("DATE(ma.created_at) <= ?");
    params.push(filters.end_date);
  }

  const whereClause = whereConditions.length > 0 
    ? "WHERE " + whereConditions.join(" AND ") 
    : "";

  return { whereClause, params };
}

// ========================================
// CONTROLLER EXPORTS
// ========================================

/**
 * GET ALL ALERTS — filters: vehicle_id, is_resolved, alert_type, date range
 * If no vehicle_id provided, returns all unresolved alerts for fleet
 */
exports.getAllAlerts = async (req, res) => {
  try {
    const { vehicle_id, is_resolved, alert_type, start_date, end_date } = req.query;

    // Build filters using helper function
    const filters = { vehicle_id, is_resolved, alert_type, start_date, end_date };
    
    // If no vehicle_id provided and no is_resolved filter, default to unresolved
    if (!vehicle_id && (is_resolved === undefined || is_resolved === "")) {
      filters.is_resolved = "false";
    }

    const { whereClause, params } = buildAlertFilters(filters);

    const sql = `
      SELECT ma.*, v.registration_number
      FROM maintenance_alerts ma
      LEFT JOIN vehicles v ON ma.vehicle_id = v.vehicle_id
      ${whereClause}
      ORDER BY ma.created_at DESC
    `;

    const [rows] = await db.query(sql, params);

    const unresolvedCount = rows.filter(r => !r.is_resolved).length;
    return res.status(200).json({ 
      data: rows, 
      total: rows.length, 
      unresolvedCount 
    });
  } catch (error) {
    console.error("Error in getAllAlerts:", error);
    return res.status(500).json({ error: "Failed to retrieve maintenance alerts." });
  }
};

/**
 * GET ALERTS BY VEHICLE — Return alerts for specific vehicle_id, sorted by created_at
 */
exports.getAlertsByVehicle = async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { is_resolved, alert_type, start_date, end_date } = req.query;

    if (!vehicle_id) {
      return res.status(400).json({ error: "vehicle_id is required as a path parameter." });
    }

    // Verify vehicle exists
    const [vehicleCheck] = await db.query(
      "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?",
      [vehicle_id]
    );
    if (vehicleCheck.length === 0) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    // Build filters using helper function
    const filters = { vehicle_id, is_resolved, alert_type, start_date, end_date };
    const { whereClause, params } = buildAlertFilters(filters);

    const sql = `
      SELECT ma.*, v.registration_number
      FROM maintenance_alerts ma
      LEFT JOIN vehicles v ON ma.vehicle_id = v.vehicle_id
      ${whereClause}
      ORDER BY ma.created_at DESC
    `;

    const [rows] = await db.query(sql, params);

    return res.status(200).json({ 
      data: rows, 
      total: rows.length,
      vehicleId: parseInt(vehicle_id)
    });
  } catch (error) {
    console.error("Error in getAlertsByVehicle:", error);
    return res.status(500).json({ error: "Failed to retrieve vehicle alerts." });
  }
};

/**
 * UPDATE ALERT RESOLUTION STATUS
 */
exports.updateAlertStatus = async (req, res) => {
  try {
    const { alert_id } = req.params;
    const { is_resolved } = req.body;

    if (is_resolved === undefined) {
      return res.status(400).json({ error: "is_resolved field is required." });
    }

    // Validate alert exists
    const [existing] = await db.query(
      "SELECT alert_id FROM maintenance_alerts WHERE alert_id = ?",
      [alert_id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Alert not found." });
    }

    // Update alert status
    await db.query(
      "UPDATE maintenance_alerts SET is_resolved = ? WHERE alert_id = ?",
      [is_resolved ? 1 : 0, alert_id]
    );

    const statusText = is_resolved ? "resolved" : "unresolved";
    return res.status(200).json({ 
      message: `Alert marked as ${statusText}.`,
      alertId: parseInt(alert_id),
      isResolved: is_resolved
    });
  } catch (error) {
    console.error("Error in updateAlertStatus:", error);
    return res.status(500).json({ error: "Failed to update alert status." });
  }
};

/**
 * CREATE ALERT — internal use; also exposed via POST /api/alerts
 * Internal method called by other controllers (fuel and maintenance)
 */
exports.createAlert = async (req, res) => {
  try {
    const { vehicle_id, alert_type, alert_message, is_resolved } = req.body;

    // Validate required fields
    if (!vehicle_id || !alert_type) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: {
          vehicle_id: !vehicle_id ? "vehicle_id is required" : undefined,
          alert_type: !alert_type ? "alert_type is required" : undefined
        }
      });
    }

    // Verify vehicle exists
    const [vehicleCheck] = await db.query(
      "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?",
      [vehicle_id]
    );
    if (vehicleCheck.length === 0) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    // Format message if not provided
    const formattedMessage = alert_message || formatAlertMessage(alert_type, vehicle_id);

    // Insert alert
    const [result] = await db.query(
      "INSERT INTO maintenance_alerts (vehicle_id, alert_type, alert_message, is_resolved) VALUES (?, ?, ?, ?)",
      [vehicle_id, alert_type, formattedMessage, is_resolved ? 1 : 0]
    );

    return res.status(201).json({ 
      message: "Alert created successfully.",
      alertId: result.insertId,
      vehicleId: parseInt(vehicle_id),
      alertType: alert_type
    });
  } catch (error) {
    console.error("Error in createAlert:", error);
    return res.status(500).json({ error: "Failed to create alert." });
  }
};
