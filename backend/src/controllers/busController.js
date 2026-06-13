const db = require("../config/db");

// 1. Fetch all buses with merged vehicle logs and depot descriptions
exports.getAllBuses = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.bus_id, b.bus_code, b.capacity, b.service_type, b.status AS bus_status,
        v.vehicle_id, v.registration_number, v.manufacturer, v.model_year, v.total_mileage,
        d.depot_id, d.depot_name
      FROM buses b
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN depots d ON v.depot_id = d.depot_id
      ORDER BY b.bus_id DESC
    `;
    const [rows] = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getAllBuses:", error);
    res.status(500).json({ error: "Failed to fetch passenger bus assets inventory." });
  }
};

// 2. Create a Bus (Inserts to 'vehicles' first, then attaches specialized 'buses' parameters)
exports.createBus = async (req, res) => {
  const {
    bus_code, registration_number, depot_id, manufacturer,
    model_year, total_mileage, capacity, service_type, status
  } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Insert master vehicle track log row
    const vehicleQuery = `
      INSERT INTO vehicles 
      (depot_id, registration_number, vehicle_type, manufacturer, model_year, seating_capacity, total_mileage, status)
      VALUES (?, ?, 'Bus', ?, ?, ?, ?, 'Available')
    `;
    const [vehicleResult] = await connection.query(vehicleQuery, [
      depot_id || null, registration_number, manufacturer || null, 
      model_year || null, capacity || 40, total_mileage || 0.00
    ]);

    const vehicleId = vehicleResult.insertId;

    // Link specialized passenger operational attributes
    const busQuery = `
      INSERT INTO buses (vehicle_id, bus_code, capacity, service_type, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    await connection.query(busQuery, [
      vehicleId, bus_code, capacity || 40, service_type || 'Normal', status || 'Available'
    ]);

    await connection.commit();
    res.status(201).json({ message: "Passenger bus asset initialized across structural parameters successfully." });
  } catch (error) {
    await connection.rollback();
    console.error("Error in createBus transaction:", error);
    res.status(500).json({ error: "Transaction failed: Unable to save integrated asset schemas safely." });
  } finally {
    connection.release();
  }
};

// 3. Update an existing Bus & Vehicle entry records
exports.updateBus = async (req, res) => {
  const { id } = req.params; // bus_id
  const {
    vehicle_id, bus_code, registration_number, depot_id, manufacturer,
    model_year, total_mileage, capacity, service_type, status
  } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Update vehicle profile settings
    const vehicleUpdateQuery = `
      UPDATE vehicles SET 
        depot_id = ?, registration_number = ?, manufacturer = ?, model_year = ?, 
        seating_capacity = ?, total_mileage = ?
      WHERE vehicle_id = ?
    `;
    await connection.query(vehicleUpdateQuery, [
      depot_id || null, registration_number, manufacturer, model_year, capacity, total_mileage, vehicle_id
    ]);

    // Update specialized bus structural details
    const busUpdateQuery = `
      UPDATE buses SET 
        bus_code = ?, capacity = ?, service_type = ?, status = ?
      WHERE bus_id = ?
    `;
    await connection.query(busUpdateQuery, [bus_code, capacity, service_type, status, id]);

    await connection.commit();
    res.status(200).json({ message: "Asset records updated successfully across clusters." });
  } catch (error) {
    await connection.rollback();
    console.error("Error in updateBus transaction:", error);
    res.status(500).json({ error: "Failed to apply coordinated adjustments across parameters." });
  } finally {
    connection.release();
  }
};

// 4. Delete Bus Entry (Purges base vehicle logs, cascade handles the specialized bus array automatically)
exports.deleteBus = async (req, res) => {
  const { id } = req.params; // bus_id
  try {
    // Look up linked vehicle_id to wipe logs entirely
    const [busRows] = await db.query("SELECT vehicle_id FROM buses WHERE bus_id = ?", [id]);
    if (busRows.length === 0) {
      return res.status(404).json({ error: "Bus sequence matching index key parameters not found." });
    }

    const targetVehicleId = busRows[0].vehicle_id;

    // Purging vehicles record automatically triggers 'ON DELETE CASCADE' for buses
    await db.query("DELETE FROM vehicles WHERE vehicle_id = ?", [targetVehicleId]);
    res.status(200).json({ message: "Asset logs and specialized boundaries purged safely." });
  } catch (error) {
    console.error("Error in deleteBus:", error);
    res.status(500).json({ error: "Failed to purge targeted asset structures from database clusters safely." });
  }
};