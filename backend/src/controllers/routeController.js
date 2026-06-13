const db = require("../config/db"); 

// 1. Fetch All Routes with Joined Asset Details
exports.getAllRoutes = async (req, res) => {
  try {
    const query = `
      SELECT r.*, d.depot_name, b.bus_code, v.registration_number, dr.first_name, dr.last_name
      FROM routes r
      LEFT JOIN depots d ON r.depot_id = d.depot_id
      LEFT JOIN buses b ON r.default_bus_id = b.bus_id
      LEFT JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN drivers dr ON r.default_driver_id = dr.driver_id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getAllRoutes:", error);
    res.status(500).json({ error: "Failed to fetch operational routes." });
  }
};

// 2. Fetch Active Routes for Selection Matrices
exports.getRoutesForSelection = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT route_id, route_code, route_name FROM routes WHERE is_active = 1"
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getRoutesForSelection:", error);
    res.status(500).json({ error: "Failed to populate selection matrix." });
  }
};

// 3. Create a Route Frame
exports.createRoute = async (req, res) => {
  const {
    depot_id, route_code, route_name, start_location, end_location,
    total_distance, total_stops, estimated_duration, is_active,
    default_bus_id, default_driver_id
  } = req.body;

  try {
    const query = `
      INSERT INTO routes 
      (depot_id, route_code, route_name, start_location, end_location, total_distance, total_stops, estimated_duration, is_active, default_bus_id, default_driver_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      depot_id || null, route_code, route_name, start_location, end_location,
      total_distance || 0.00, total_stops || 0, estimated_duration || 0,
      is_active !== undefined ? is_active : 1,
      default_bus_id || null, default_driver_id || null
    ];

    const [result] = await db.query(query, values);
    res.status(201).json({ message: "Route saved successfully", route_id: result.insertId });
  } catch (error) {
    console.error("Error in createRoute:", error);
    res.status(500).json({ error: "Failed to persist new route log structure." });
  }
};

// 4. Update an Existing Route Entry
exports.updateRoute = async (req, res) => {
  const { id } = req.params;
  const {
    depot_id, route_code, route_name, start_location, end_location,
    total_distance, total_stops, estimated_duration, is_active,
    default_bus_id, default_driver_id
  } = req.body;

  try {
    const query = `
      UPDATE routes SET 
        depot_id = ?, route_code = ?, route_name = ?, start_location = ?, 
        end_location = ?, total_distance = ?, total_stops = ?, estimated_duration = ?, is_active = ?,
        default_bus_id = ?, default_driver_id = ?
      WHERE route_id = ?
    `;
    const values = [
      depot_id || null, route_code, route_name, start_location, end_location,
      total_distance, total_stops, estimated_duration, is_active,
      default_bus_id || null, default_driver_id || null,
      id
    ];

    await db.query(query, values);
    res.status(200).json({ message: "Route records modified successfully." });
  } catch (error) {
    console.error("Error in updateRoute:", error);
    res.status(500).json({ error: "Failed to apply route adjustments." });
  }
};

// 5. Delete a Route
exports.deleteRoute = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM routes WHERE route_id = ?", [id]);
    res.status(200).json({ message: "Route removed from operational cluster parameters." });
  } catch (error) {
    console.error("Error in deleteRoute:", error);
    res.status(500).json({ error: "Failed to purge targeted route data row safely." });
  }
};

// 6. Fetch Compatible Allocation Assets Joining Buses & Vehicles for Depot Mapping
exports.getAllocationPool = async (req, res) => {
  try {
    const busQuery = `
      SELECT b.bus_id, b.bus_code, b.service_type, b.capacity, v.registration_number, v.depot_id
      FROM buses b
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE b.status = 'Available' AND v.status = 'Available'
    `;
    const [buses] = await db.query(busQuery);

    const [drivers] = await db.query(
      "SELECT driver_id, first_name, last_name, license_number, depot_id FROM drivers WHERE is_available = 1"
    );

    res.status(200).json({ buses, drivers });
  } catch (error) {
    console.error("Error in getAllocationPool:", error);
    res.status(500).json({ error: "Failed to pull available vehicle assets and driver rosters." });
  }
};