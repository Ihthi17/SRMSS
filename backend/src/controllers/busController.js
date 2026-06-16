const db = require("../config/db");

// Vehicle types that get a buses table entry (bus-specific fields)
const BUS_TYPES = ["Bus"];

// ─── 1. Fetch all vehicles (all types) with optional bus details ──────────
exports.getAllBuses = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        v.vehicle_id,
        v.depot_id,
        v.registration_number,
        v.vehicle_type,
        v.manufacturer,
        v.model_year,
        v.seating_capacity,
        v.total_mileage,
        v.current_fuel_level,
        v.fuel_tank_capacity,
        v.status        AS vehicle_status,
        v.purchase_date,
        v.next_maintenance_date,
        d.depot_name,
        -- Bus-specific fields (NULL for non-bus vehicles)
        b.bus_id,
        b.bus_code,
        b.capacity,
        b.service_type,
        b.status        AS bus_status
      FROM vehicles v
      LEFT JOIN depots d ON v.depot_id = d.depot_id
      LEFT JOIN buses  b ON b.vehicle_id = v.vehicle_id
      ORDER BY v.vehicle_id DESC
    `);

    // Normalise the status field: buses use bus_status, others use vehicle_status
    const normalised = rows.map(r => ({
      ...r,
      status: r.bus_status || r.vehicle_status || "Available",
    }));

    res.status(200).json(normalised);
  } catch (error) {
    console.error("Error in getAllBuses:", error);
    res.status(500).json({ error: "Failed to fetch vehicle inventory." });
  }
};

// ─── 2. Create a vehicle (Bus → vehicles + buses; others → vehicles only) ──
exports.createBus = async (req, res) => {
  const {
    vehicle_type = "Bus",
    bus_code, registration_number, depot_id, manufacturer,
    model_year, total_mileage, seating_capacity, capacity,
    service_type, status, current_fuel_level, fuel_tank_capacity,
    purchase_date, next_maintenance_date
  } = req.body;

  const seatCount = seating_capacity || capacity || (vehicle_type === "Bus" ? 40 : null);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Insert into vehicles table for every type
    const [vehicleResult] = await connection.query(
      `INSERT INTO vehicles
         (depot_id, registration_number, vehicle_type, manufacturer, model_year,
          seating_capacity, total_mileage, current_fuel_level, fuel_tank_capacity,
          status, purchase_date, next_maintenance_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        depot_id || null,
        registration_number,
        vehicle_type,
        manufacturer || null,
        model_year || null,
        seatCount,
        total_mileage || 0,
        current_fuel_level || null,
        fuel_tank_capacity || null,
        status || "Available",
        purchase_date || null,
        next_maintenance_date || null,
      ]
    );

    const vehicleId = vehicleResult.insertId;

    // Only create a buses row for bus-type vehicles
    if (BUS_TYPES.includes(vehicle_type)) {
      if (!bus_code) {
        await connection.rollback();
        return res.status(400).json({ error: "Bus Code is required for Bus vehicles." });
      }
      await connection.query(
        `INSERT INTO buses (vehicle_id, bus_code, capacity, service_type, status)
         VALUES (?, ?, ?, ?, ?)`,
        [vehicleId, bus_code, seatCount || 40, service_type || "Normal", status || "Available"]
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Vehicle registered successfully.", vehicle_id: vehicleId });
  } catch (error) {
    await connection.rollback();
    console.error("Error in createBus:", error);
    res.status(500).json({ error: "Failed to register vehicle: " + error.message });
  } finally {
    connection.release();
  }
};

// ─── 3. Update a vehicle ──────────────────────────────────────────────────
exports.updateBus = async (req, res) => {
  const { id } = req.params; // bus_id for Bus types; use vehicle_id for others
  const {
    vehicle_id, vehicle_type = "Bus",
    bus_code, registration_number, depot_id, manufacturer,
    model_year, total_mileage, seating_capacity, capacity,
    service_type, status, current_fuel_level, fuel_tank_capacity,
    purchase_date, next_maintenance_date
  } = req.body;

  const seatCount = seating_capacity || capacity || null;
  const targetVehicleId = vehicle_id || id;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Update vehicles table
    await connection.query(
      `UPDATE vehicles
       SET depot_id = ?, registration_number = ?, vehicle_type = ?,
           manufacturer = ?, model_year = ?, seating_capacity = ?,
           total_mileage = ?, current_fuel_level = ?, fuel_tank_capacity = ?,
           status = ?, purchase_date = ?, next_maintenance_date = ?
       WHERE vehicle_id = ?`,
      [
        depot_id || null, registration_number, vehicle_type,
        manufacturer, model_year, seatCount,
        total_mileage || 0, current_fuel_level || null, fuel_tank_capacity || null,
        status || "Available", purchase_date || null, next_maintenance_date || null,
        targetVehicleId,
      ]
    );

    // Update buses table if it's a bus type
    if (BUS_TYPES.includes(vehicle_type) && id) {
      // Check if buses row exists
      const [existing] = await connection.query(
        "SELECT bus_id FROM buses WHERE vehicle_id = ?", [targetVehicleId]
      );
      if (existing.length > 0) {
        await connection.query(
          `UPDATE buses SET bus_code = ?, capacity = ?, service_type = ?, status = ?
           WHERE vehicle_id = ?`,
          [bus_code, seatCount || 40, service_type || "Normal", status || "Available", targetVehicleId]
        );
      } else {
        // Create buses row if not exists (vehicle_type was changed to Bus)
        await connection.query(
          `INSERT INTO buses (vehicle_id, bus_code, capacity, service_type, status)
           VALUES (?, ?, ?, ?, ?)`,
          [targetVehicleId, bus_code, seatCount || 40, service_type || "Normal", status || "Available"]
        );
      }
    } else {
      // If type changed away from Bus, remove the buses row
      await connection.query("DELETE FROM buses WHERE vehicle_id = ?", [targetVehicleId]);
    }

    await connection.commit();
    res.status(200).json({ message: "Vehicle updated successfully." });
  } catch (error) {
    await connection.rollback();
    console.error("Error in updateBus:", error);
    res.status(500).json({ error: "Failed to update vehicle: " + error.message });
  } finally {
    connection.release();
  }
};

// ─── 4. Delete a vehicle (cascade handles buses row) ─────────────────────
exports.deleteBus = async (req, res) => {
  const { id } = req.params;
  try {
    // id could be bus_id or vehicle_id — resolve to vehicle_id
    const [busRow] = await db.query("SELECT vehicle_id FROM buses WHERE bus_id = ?", [id]);
    const vehicleId = busRow.length > 0 ? busRow[0].vehicle_id : id;

    await db.query("DELETE FROM vehicles WHERE vehicle_id = ?", [vehicleId]);
    res.status(200).json({ message: "Vehicle removed successfully." });
  } catch (error) {
    console.error("Error in deleteBus:", error);
    res.status(500).json({ error: "Failed to delete vehicle: " + error.message });
  }
};
