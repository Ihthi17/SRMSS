const db = require("../config/db");

// Helper: fetch the most recent odometer reading for a vehicle (excluding current record on update)
async function getPreviousOdometer(vehicleId, excludeFuelId = null, connection = db) {
  let sql = "SELECT MAX(odometer_reading) AS max_odometer FROM fuel_records WHERE vehicle_id = ?";
  const params = [vehicleId];
  if (excludeFuelId) {
    sql += " AND fuel_id != ?";
    params.push(excludeFuelId);
  }
  const [rows] = await connection.query(sql, params);
  return rows[0]?.max_odometer ?? null;
}

// Helper: calculate fuel efficiency (km / litre). Returns null if no previous reading.
function calcEfficiency(currentOdo, previousOdo, quantity) {
  if (previousOdo === null || previousOdo === undefined) return null;
  const distance = parseFloat(currentOdo) - parseFloat(previousOdo);
  if (distance <= 0 || parseFloat(quantity) <= 0) return null;
  return parseFloat((distance / parseFloat(quantity)).toFixed(2));
}

// 1. CREATE — log a new fuel transaction
exports.createFuelRecord = async (req, res) => {
  const {
    vehicle_id, trip_id, fuel_quantity, fuel_cost,
    fuel_type, fuel_date, fuel_time, odometer_reading
  } = req.body;

  if (!vehicle_id || !fuel_quantity || fuel_cost === undefined || !fuel_type || !fuel_date || !fuel_time || !odometer_reading) {
    return res.status(400).json({ message: "Missing required fuel record fields." });
  }
  if (parseFloat(fuel_quantity) <= 0) {
    return res.status(400).json({ message: "fuel_quantity must be greater than zero." });
  }
  if (parseFloat(fuel_cost) < 0) {
    return res.status(400).json({ message: "fuel_cost must be non-negative." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Validate trip exists if provided
    if (trip_id) {
      const [tripRows] = await connection.query("SELECT trip_id FROM trips WHERE trip_id = ?", [trip_id]);
      if (tripRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: "Referenced trip_id does not exist." });
      }
    }

    // Validate vehicle exists
    const [vehicleRows] = await connection.query("SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?", [vehicle_id]);
    if (vehicleRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Referenced vehicle_id does not exist." });
    }

    // Odometer monotonicity check
    const prevOdo = await getPreviousOdometer(vehicle_id, null, connection);
    if (prevOdo !== null && parseFloat(odometer_reading) < parseFloat(prevOdo)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        message: `odometer_reading cannot be less than the previous reading (${prevOdo}).`
      });
    }

    const fuelEfficiency = calcEfficiency(odometer_reading, prevOdo, fuel_quantity);

    const [result] = await connection.query(
      `INSERT INTO fuel_records
         (vehicle_id, trip_id, fuel_quantity, fuel_cost, fuel_type, fuel_date, fuel_time, odometer_reading, fuel_efficiency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id, trip_id || null,
        parseFloat(fuel_quantity), parseFloat(fuel_cost),
        fuel_type, fuel_date, fuel_time,
        parseFloat(odometer_reading), fuelEfficiency
      ]
    );

    // Alert: check if maintenance is overdue for this vehicle
    const today = new Date().toISOString().split("T")[0];
    const [alertCheck] = await connection.query(
      `SELECT next_maintenance_date FROM maintenance_records
       WHERE vehicle_id = ? AND maintenance_status = 'Completed'
       ORDER BY maintenance_date DESC LIMIT 1`,
      [vehicle_id]
    );
    if (alertCheck.length > 0 && alertCheck[0].next_maintenance_date) {
      const nextDate = alertCheck[0].next_maintenance_date.toISOString
        ? alertCheck[0].next_maintenance_date.toISOString().split("T")[0]
        : String(alertCheck[0].next_maintenance_date).split("T")[0];
      if (today >= nextDate) {
        await connection.query(
          `INSERT INTO maintenance_alerts (vehicle_id, alert_type, alert_message, is_resolved)
           VALUES (?, 'Scheduled Maintenance Due', ?, 0)`,
          [vehicle_id, `Vehicle ${vehicle_id} is due for scheduled maintenance`]
        );
      }
    }

    await connection.commit();
    return res.status(201).json({
      message: "Fuel record created successfully.",
      fuelId: result.insertId,
      fuelEfficiency
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ createFuelRecord Error:", error);
    return res.status(500).json({ message: "Internal server error creating fuel record." });
  } finally {
    connection.release();
  }
};

// 2. READ ALL — with optional filters
exports.getAllFuelRecords = async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date, fuel_type, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT fr.*, v.registration_number
      FROM fuel_records fr
      LEFT JOIN vehicles v ON fr.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id) { sql += " AND fr.vehicle_id = ?"; params.push(vehicle_id); }
    if (start_date) { sql += " AND fr.fuel_date >= ?"; params.push(start_date); }
    if (end_date)   { sql += " AND fr.fuel_date <= ?"; params.push(end_date); }
    if (fuel_type)  { sql += " AND fr.fuel_type = ?"; params.push(fuel_type); }

    sql += " ORDER BY fr.fuel_date DESC, fr.fuel_time DESC";

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const [rows] = await db.query(sql, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("❌ getAllFuelRecords Error:", error);
    return res.status(500).json({ message: "Internal server error retrieving fuel records." });
  }
};

// 3. READ SINGLE
exports.getFuelRecordById = async (req, res) => {
  try {
    const { fuel_id } = req.params;
    const [rows] = await db.query(
      `SELECT fr.*, v.registration_number
       FROM fuel_records fr
       LEFT JOIN vehicles v ON fr.vehicle_id = v.vehicle_id
       WHERE fr.fuel_id = ?`,
      [fuel_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Fuel record not found." });
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("❌ getFuelRecordById Error:", error);
    return res.status(500).json({ message: "Internal server error retrieving fuel record." });
  }
};

// 4. UPDATE
exports.updateFuelRecord = async (req, res) => {
  const { fuel_id } = req.params;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ message: "No fields provided to update." });
  }

  try {
    // Fetch current record to validate odometer
    const [existing] = await db.query("SELECT * FROM fuel_records WHERE fuel_id = ?", [fuel_id]);
    if (existing.length === 0) return res.status(404).json({ message: "Fuel record not found." });

    const currentRecord = existing[0];
    const newOdo = fields.odometer_reading !== undefined ? parseFloat(fields.odometer_reading) : parseFloat(currentRecord.odometer_reading);
    const newQty = fields.fuel_quantity !== undefined ? parseFloat(fields.fuel_quantity) : parseFloat(currentRecord.fuel_quantity);

    if (fields.fuel_quantity !== undefined && parseFloat(fields.fuel_quantity) <= 0) {
      return res.status(400).json({ message: "fuel_quantity must be greater than zero." });
    }
    if (fields.fuel_cost !== undefined && parseFloat(fields.fuel_cost) < 0) {
      return res.status(400).json({ message: "fuel_cost must be non-negative." });
    }

    // If odometer changed, validate monotonicity
    if (fields.odometer_reading !== undefined) {
      const prevOdo = await getPreviousOdometer(currentRecord.vehicle_id, parseInt(fuel_id));
      if (prevOdo !== null && newOdo < parseFloat(prevOdo)) {
        return res.status(400).json({
          message: `odometer_reading cannot be less than previous reading (${prevOdo}).`
        });
      }
      // Recalculate efficiency
      fields.fuel_efficiency = calcEfficiency(newOdo, prevOdo, newQty);
    }

    const keys = [];
    const values = [];
    for (const [k, v] of Object.entries(fields)) {
      if (k !== "fuel_id" && k !== "created_at") {
        keys.push(`${k} = ?`);
        values.push(v);
      }
    }
    values.push(fuel_id);

    await db.query(`UPDATE fuel_records SET ${keys.join(", ")} WHERE fuel_id = ?`, values);
    return res.status(200).json({ message: "Fuel record updated successfully." });
  } catch (error) {
    console.error("❌ updateFuelRecord Error:", error);
    return res.status(500).json({ message: "Internal server error updating fuel record." });
  }
};

// 5. DELETE
exports.deleteFuelRecord = async (req, res) => {
  try {
    const { fuel_id } = req.params;
    const [result] = await db.query("DELETE FROM fuel_records WHERE fuel_id = ?", [fuel_id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Fuel record not found." });
    return res.status(200).json({ message: "Fuel record deleted successfully." });
  } catch (error) {
    console.error("❌ deleteFuelRecord Error:", error);
    return res.status(500).json({ message: "Internal server error deleting fuel record." });
  }
};
