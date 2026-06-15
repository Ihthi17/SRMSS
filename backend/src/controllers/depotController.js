const db = require('../config/db'); // This now imports the promise-wrapped pool

exports.getAllDepots = async (req, res) => {
  try {
    // Destructuring [rows] works perfectly with pool.promise()
    const [rows] = await db.query('SELECT * FROM depots ORDER BY depot_id DESC');
    
    // Send back a clean array
    res.json(rows); 
  } catch (error) {
    console.error("Database query crash:", error);
    res.status(500).json({ error: "Database failure: " + error.message });
  }
};
// Create new depot infrastructure log
exports.createDepot = async (req, res) => {
  const { depot_name, location, contact_person, contact_phone, email, address } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO depots (depot_name, location, contact_person, contact_phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
      [depot_name, location, contact_person, contact_phone, email, address]
    );
    res.status(201).json({ message: 'Depot registered successfully', depot_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an existing depot profile
exports.updateDepot = async (req, res) => {
  const { id } = req.params;
  const { depot_name, location, contact_person, contact_phone, email, address } = req.body;
  try {
    await db.query(
      'UPDATE depots SET depot_name = ?, location = ?, contact_person = ?, contact_phone = ?, email = ?, address = ? WHERE depot_id = ?',
      [depot_name, location, contact_person, contact_phone, email, address, id]
    );
    res.json({ message: 'Depot information updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a depot entry
exports.deleteDepot = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM depots WHERE depot_id = ?', [id]);
    res.json({ message: 'Depot configuration removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Cannot delete depot. Check if it contains active vehicles or users.' });
  }
};

// Depot Management Dashboard - Centralized Control Panel
exports.getDepotDashboard = async (req, res) => {
  const { depotId } = req.params;
  
  console.log(`[Dashboard] Fetching dashboard for depot ${depotId}`);
  
  try {
    // 1. Get depot basic information
    const [depotInfo] = await db.query(
      'SELECT * FROM depots WHERE depot_id = ?',
      [depotId]
    );
    
    console.log(`[Dashboard] Depot found:`, depotInfo.length > 0);
    
    if (depotInfo.length === 0) {
      return res.status(404).json({ error: 'Depot not found' });
    }

    // Initialize default values
    let activeRoutes = 0;
    let availableBuses = 0;
    let assignedDrivers = 0;
    let totalRoutes = 0;
    let tripsCompleted = 0;
    let totalBuses = 0;
    let utilizationRate = 0;
    let tripStatus = [];
    let recentActivities = [];

    // 2. Get total buses first (simpler query)
    try {
      const [result] = await db.query(`
        SELECT COUNT(*) as total_buses
        FROM vehicles v
        LEFT JOIN buses b ON v.vehicle_id = b.vehicle_id
        WHERE v.depot_id = ?
      `, [depotId]);
      totalBuses = result[0]?.total_buses || 0;
      console.log(`[Dashboard] Total buses: ${totalBuses}`);
    } catch (err) {
      console.warn('Warning fetching total buses:', err.message);
      totalBuses = 0;
    }

    // 3. Get available buses count for this depot
    try {
      const [result] = await db.query(`
        SELECT COUNT(*) as available_buses_count
        FROM vehicles v
        LEFT JOIN buses b ON v.vehicle_id = b.vehicle_id
        WHERE v.depot_id = ? AND (b.status = 'Available' OR b.status IS NULL)
      `, [depotId]);
      availableBuses = result[0]?.available_buses_count || 0;
      console.log(`[Dashboard] Available buses: ${availableBuses}`);
    } catch (err) {
      console.warn('Warning fetching available buses:', err.message);
      availableBuses = 0;
    }

    // 4. Get active routes count for this depot
    try {
      const [result] = await db.query(`
        SELECT COUNT(DISTINCT r.route_id) as active_routes_count
        FROM routes r
        LEFT JOIN schedules s ON r.route_id = s.route_id
        WHERE s.depot_id = ? AND (s.status = 'Scheduled' OR s.status = 'In Progress')
      `, [depotId]);
      activeRoutes = result[0]?.active_routes_count || 0;
      console.log(`[Dashboard] Active routes: ${activeRoutes}`);
    } catch (err) {
      console.warn('Warning fetching active routes:', err.message);
      activeRoutes = 0;
    }

    // 5. Get assigned drivers count for this depot
    try {
      const [result] = await db.query(`
        SELECT COUNT(DISTINCT da.driver_id) as assigned_drivers_count
        FROM driver_assignments da
        LEFT JOIN schedules s ON da.schedule_id = s.schedule_id
        WHERE s.depot_id = ? AND (da.status = 'Active' OR da.status IS NULL)
      `, [depotId]);
      assignedDrivers = result[0]?.assigned_drivers_count || 0;
      console.log(`[Dashboard] Assigned drivers: ${assignedDrivers}`);
    } catch (err) {
      console.warn('Warning fetching assigned drivers:', err.message);
      assignedDrivers = 0;
    }

    // 6. Get real-time trip status with detailed information from trips table
    try {
      const [result] = await db.query(`
        SELECT 
          t.trip_id,
          t.schedule_id,
          t.vehicle_id,
          t.driver_id,
          t.trip_date,
          t.departure_time,
          t.arrival_time as expected_arrival_time,
          t.actual_departure_time,
          t.actual_arrival_time,
          t.trip_status,
          t.passengers_count,
          t.route_distance,
          t.fuel_consumed,
          s.schedule_code,
          s.schedule_date,
          r.route_name,
          r.start_location,
          r.end_location,
          b.bus_code,
          v.registration_number,
          CONCAT(COALESCE(d.first_name, 'Unassigned'), ' ', COALESCE(d.last_name, '')) as driver_name,
          CASE 
            WHEN t.trip_status = 'Completed' THEN 'completed'
            WHEN t.trip_status = 'In Progress' AND NOW() <= t.arrival_time THEN 'on-time'
            WHEN t.trip_status = 'In Progress' AND NOW() > t.arrival_time THEN 'delayed'
            WHEN t.trip_status = 'Scheduled' THEN 'scheduled'
            ELSE LOWER(COALESCE(t.trip_status, 'unknown'))
          END as trip_status_display
        FROM trips t
        LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
        LEFT JOIN routes r ON s.route_id = r.route_id
        LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
        LEFT JOIN buses b ON v.vehicle_id = b.vehicle_id
        LEFT JOIN drivers d ON t.driver_id = d.driver_id
        WHERE s.depot_id = ? 
        AND t.trip_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        ORDER BY t.trip_date ASC, t.departure_time ASC
        LIMIT 20
      `, [depotId]);
      tripStatus = result || [];
      console.log(`[Dashboard] Trip status records from trips table: ${tripStatus.length}`);
      if (tripStatus.length > 0) {
        console.log(`[Dashboard] Sample trip:`, tripStatus[0]);
      }
    } catch (err) {
      console.warn('Warning fetching trip status from trips table:', err.message);
      tripStatus = [];
    }

    // 7. Get summary statistics for the depot
    try {
      const [result] = await db.query(`
        SELECT COUNT(DISTINCT r.route_id) as total_routes
        FROM routes r
        LEFT JOIN schedules s ON r.route_id = s.route_id
        WHERE s.depot_id = ?
      `, [depotId]);
      totalRoutes = result[0]?.total_routes || 0;
      console.log(`[Dashboard] Total routes: ${totalRoutes}`);
    } catch (err) {
      console.warn('Warning fetching total routes:', err.message);
      totalRoutes = 0;
    }

    try {
      const [result] = await db.query(`
        SELECT COUNT(*) as trips_completed
        FROM schedules s
        WHERE s.depot_id = ? AND s.status = 'Completed'
        AND s.schedule_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `, [depotId]);
      tripsCompleted = result[0]?.trips_completed || 0;
      console.log(`[Dashboard] Trips completed (30d): ${tripsCompleted}`);
    } catch (err) {
      console.warn('Warning fetching trips completed:', err.message);
      tripsCompleted = 0;
    }

    try {
      const [result] = await db.query(`
        SELECT 
          COALESCE(ROUND(
            (COUNT(CASE WHEN b.status != 'Available' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
          ), 0) as utilization_rate
        FROM vehicles v
        LEFT JOIN buses b ON v.vehicle_id = b.vehicle_id
        WHERE v.depot_id = ?
      `, [depotId]);
      utilizationRate = result[0]?.utilization_rate || 0;
      console.log(`[Dashboard] Utilization rate: ${utilizationRate}%`);
    } catch (err) {
      console.warn('Warning fetching utilization rate:', err.message);
      utilizationRate = 0;
    }

    // 8. Get trip statistics
    let tripStats = {};
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(CASE WHEN t.trip_status = 'Scheduled' THEN 1 END) as scheduled_trips,
          COUNT(CASE WHEN t.trip_status = 'In Progress' THEN 1 END) as in_progress_trips,
          COUNT(CASE WHEN t.trip_status = 'Completed' THEN 1 END) as completed_trips,
          COUNT(CASE WHEN t.trip_status = 'Delayed' THEN 1 END) as delayed_trips,
          COUNT(CASE WHEN t.trip_status = 'In Progress' AND NOW() <= t.arrival_time THEN 1 END) as on_time_trips,
          COUNT(CASE WHEN t.trip_status = 'In Progress' AND NOW() > t.arrival_time THEN 1 END) as delayed_in_progress,
          ROUND(AVG(t.passengers_count), 0) as avg_passengers,
          ROUND(AVG(t.fuel_consumed), 2) as avg_fuel_consumption
        FROM trips t
        LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
        WHERE s.depot_id = ?
        AND t.trip_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `, [depotId]);
      tripStats = stats[0] || {};
      console.log(`[Dashboard] Trip statistics loaded`);
    } catch (err) {
      console.warn('Warning fetching trip statistics:', err.message);
      tripStats = {};
    }

    // 9. Get recent activities/alerts
    try {
      const [result] = await db.query(`
        SELECT 
          'trip' as activity_type,
          CONCAT('Trip #', t.trip_id, ' (', t.trip_status, ') on ', DATE_FORMAT(t.trip_date, '%Y-%m-%d')) as message,
          t.trip_date as activity_date
        FROM trips t
        LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
        WHERE s.depot_id = ?
        ORDER BY t.trip_date DESC, t.departure_time DESC
        LIMIT 10
      `, [depotId]);
      recentActivities = result || [];
      console.log(`[Dashboard] Recent activities: ${recentActivities.length}`);
    } catch (err) {
      console.warn('Warning fetching recent activities:', err.message);
      recentActivities = [];
    }

    res.json({
      depot: depotInfo[0],
      overview: {
        activeRoutes: activeRoutes,
        availableBuses: availableBuses,
        assignedDrivers: assignedDrivers,
        totalBuses: totalBuses
      },
      realTimeTrips: tripStatus,
      tripStatistics: {
        scheduledTrips: tripStats.scheduled_trips || 0,
        inProgressTrips: tripStats.in_progress_trips || 0,
        completedTrips: tripStats.completed_trips || 0,
        delayedTrips: tripStats.delayed_trips || 0,
        onTimeTrips: tripStats.on_time_trips || 0,
        delayedInProgress: tripStats.delayed_in_progress || 0,
        avgPassengers: tripStats.avg_passengers || 0,
        avgFuelConsumption: tripStats.avg_fuel_consumption || 0
      },
      statistics: {
        totalRoutes: totalRoutes,
        tripsCompleted: tripsCompleted,
        vehicleUtilizationRate: utilizationRate
      },
      recentActivities: recentActivities
    });

  } catch (error) {
    console.error('[Dashboard] Fatal error:', error);
    res.status(500).json({ error: 'Failed to fetch depot dashboard data: ' + error.message });
  }
};

// Get all depots with basic dashboard stats for overview
exports.getAllDepotsWithStats = async (req, res) => {
  try {
    const [depots] = await db.query(`
      SELECT 
        d.*,
        COUNT(DISTINCT v.vehicle_id) as total_buses,
        COUNT(DISTINCT CASE WHEN s.status IN ('Scheduled', 'In Progress') THEN s.schedule_id END) as active_trips,
        COUNT(DISTINCT CASE WHEN b.status = 'Available' THEN b.bus_id END) as available_buses
      FROM depots d
      LEFT JOIN vehicles v ON d.depot_id = v.depot_id
      LEFT JOIN buses b ON v.vehicle_id = b.vehicle_id
      LEFT JOIN schedules s ON d.depot_id = s.depot_id AND s.schedule_date >= CURDATE()
      GROUP BY d.depot_id
      ORDER BY d.depot_name ASC
    `);
    
    res.json(depots);
  } catch (error) {
    console.error("Error in getAllDepotsWithStats:", error);
    res.status(500).json({ error: "Failed to fetch depots with statistics: " + error.message });
  }
};