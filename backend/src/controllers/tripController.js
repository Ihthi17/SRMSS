const db = require('../config/db');

// Get all trips with related information
exports.getAllTrips = async (req, res) => {
  try {
    const [trips] = await db.query(`
      SELECT 
        t.trip_id,
        t.schedule_id,
        t.vehicle_id,
        t.driver_id,
        t.trip_date,
        t.departure_time,
        t.arrival_time,
        t.actual_departure_time,
        t.actual_arrival_time,
        t.trip_status,
        t.passengers_count,
        t.route_distance,
        t.fuel_consumed,
        s.schedule_code,
        r.route_name,
        r.start_location,
        r.end_location,
        b.bus_code,
        v.registration_number,
        d1.first_name as driver_first_name,
        d1.last_name as driver_last_name,
        CONCAT(COALESCE(d1.first_name, 'Unassigned'), ' ', COALESCE(d1.last_name, '')) as driver_name
      FROM trips t
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      LEFT JOIN routes r ON s.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      LEFT JOIN buses b ON b.vehicle_id = v.vehicle_id
      LEFT JOIN drivers d1 ON t.driver_id = d1.driver_id
      ORDER BY t.trip_date DESC, t.departure_time DESC
    `);
    
    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Failed to fetch trips: ' + error.message });
  }
};

// Get trips for a specific depot
exports.getDepotTrips = async (req, res) => {
  const { depotId } = req.params;
  
  try {
    const [trips] = await db.query(`
      SELECT 
        t.trip_id,
        t.schedule_id,
        t.vehicle_id,
        t.driver_id,
        t.trip_date,
        t.departure_time,
        t.arrival_time,
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
        d1.first_name as driver_first_name,
        d1.last_name as driver_last_name,
        CONCAT(COALESCE(d1.first_name, 'Unassigned'), ' ', COALESCE(d1.last_name, '')) as driver_name,
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
      LEFT JOIN buses b ON b.vehicle_id = v.vehicle_id
      LEFT JOIN drivers d1 ON t.driver_id = d1.driver_id
      WHERE s.depot_id = ?
      AND t.trip_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      ORDER BY t.trip_date ASC, t.departure_time ASC
      LIMIT 20
    `, [depotId]);
    
    res.json(trips);
  } catch (error) {
    console.error('Error fetching depot trips:', error);
    res.status(500).json({ error: 'Failed to fetch depot trips: ' + error.message });
  }
};

// Get trip statistics for depot dashboard
exports.getTripStatistics = async (req, res) => {
  const { depotId } = req.params;
  
  try {
    // Get trip status summary
    const [statusSummary] = await db.query(`
      SELECT 
        t.trip_status,
        COUNT(*) as count
      FROM trips t
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      WHERE s.depot_id = ?
      AND t.trip_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      GROUP BY t.trip_status
    `, [depotId]);

    // Get on-time vs delayed statistics
    const [timelinessStats] = await db.query(`
      SELECT 
        COUNT(CASE WHEN t.trip_status = 'Completed' AND t.actual_arrival_time <= t.arrival_time THEN 1 END) as on_time_completed,
        COUNT(CASE WHEN t.trip_status = 'Completed' AND t.actual_arrival_time > t.arrival_time THEN 1 END) as delayed_completed,
        COUNT(CASE WHEN t.trip_status = 'In Progress' AND NOW() <= t.arrival_time THEN 1 END) as on_time_in_progress,
        COUNT(CASE WHEN t.trip_status = 'In Progress' AND NOW() > t.arrival_time THEN 1 END) as delayed_in_progress
      FROM trips t
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      WHERE s.depot_id = ?
      AND t.trip_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `, [depotId]);

    // Get average passenger count and fuel consumption
    const [performanceMetrics] = await db.query(`
      SELECT 
        ROUND(AVG(t.passengers_count), 0) as avg_passengers,
        ROUND(AVG(t.fuel_consumed), 2) as avg_fuel_consumed,
        ROUND(AVG(t.route_distance), 2) as avg_route_distance,
        COUNT(*) as total_trips
      FROM trips t
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      WHERE s.depot_id = ?
      AND t.trip_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `, [depotId]);

    res.json({
      statusSummary: statusSummary || [],
      timelinessStats: timelinessStats[0] || {},
      performanceMetrics: performanceMetrics[0] || {}
    });
  } catch (error) {
    console.error('Error fetching trip statistics:', error);
    res.status(500).json({ error: 'Failed to fetch trip statistics: ' + error.message });
  }
};

// Create a new trip
exports.createTrip = async (req, res) => {
  const { 
    schedule_id, vehicle_id, driver_id, trip_date, departure_time, 
    arrival_time, trip_status, passengers_count, route_distance, fuel_consumed 
  } = req.body;

  try {
    // Convert DATETIME strings to proper DATETIME by combining date with time
    // Format: "2026-06-15 09:00:00" -> keep as is, or "09:00:00" -> combine with trip_date
    const normalizeDateTime = (dateStr, timeStr) => {
      if (!timeStr) return null;
      
      // If timeStr already has a date, extract just the time
      const timeOnly = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
      
      // Combine trip_date with time
      if (dateStr && timeOnly) {
        return `${dateStr} ${timeOnly}`;
      }
      return null;
    };
    
    const [result] = await db.query(`
      INSERT INTO trips (schedule_id, vehicle_id, driver_id, trip_date, departure_time, arrival_time, trip_status, passengers_count, route_distance, fuel_consumed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      schedule_id || null, 
      vehicle_id || null, 
      driver_id || null, 
      trip_date || null, 
      normalizeDateTime(trip_date, departure_time),
      normalizeDateTime(trip_date, arrival_time),
      trip_status || 'Scheduled', 
      passengers_count || null, 
      route_distance || null, 
      fuel_consumed || null
    ]);

    res.status(201).json({ 
      message: 'Trip created successfully',
      trip_id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Failed to create trip: ' + error.message });
  }
};

// Update trip status
exports.updateTripStatus = async (req, res) => {
  const { id } = req.params;
  const { trip_status, actual_departure_time, actual_arrival_time, passengers_count } = req.body;

  try {
    // For updateTripStatus, we need to get the trip_date first to combine with times
    const [trip] = await db.query('SELECT trip_date FROM trips WHERE trip_id = ?', [id]);
    
    if (!trip.length) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    
    const trip_date = trip[0].trip_date;
    
    // Convert DATETIME strings to proper DATETIME by combining date with time
    const normalizeDateTime = (dateStr, timeStr) => {
      if (!timeStr) return null;
      
      // If timeStr already has a date, extract just the time
      const timeOnly = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
      
      // Combine trip_date with time
      if (dateStr && timeOnly) {
        // Handle ISO date format
        const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        return `${dateOnly} ${timeOnly}`;
      }
      return null;
    };

    await db.query(`
      UPDATE trips 
      SET trip_status = ?, 
          actual_departure_time = ?, 
          actual_arrival_time = ?,
          passengers_count = ?
      WHERE trip_id = ?
    `, [
      trip_status, 
      normalizeDateTime(trip_date, actual_departure_time), 
      normalizeDateTime(trip_date, actual_arrival_time), 
      passengers_count, 
      id
    ]);

    res.json({ message: 'Trip status updated successfully' });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ error: 'Failed to update trip: ' + error.message });
  }
};

// Update complete trip information
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const { 
    schedule_id, vehicle_id, driver_id, trip_date, departure_time, 
    arrival_time, actual_departure_time, actual_arrival_time, trip_status,
    passengers_count, route_distance, fuel_consumed 
  } = req.body;

  try {
    // Convert DATETIME strings to proper DATETIME by combining date with time
    const normalizeDateTime = (dateStr, timeStr) => {
      if (!timeStr) return null;
      
      // If timeStr already has a date, extract just the time
      const timeOnly = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
      
      // Combine trip_date with time
      if (dateStr && timeOnly) {
        return `${dateStr} ${timeOnly}`;
      }
      return null;
    };
    
    await db.query(`
      UPDATE trips 
      SET schedule_id = ?, vehicle_id = ?, driver_id = ?, trip_date = ?,
          departure_time = ?, arrival_time = ?, actual_departure_time = ?,
          actual_arrival_time = ?, trip_status = ?, passengers_count = ?,
          route_distance = ?, fuel_consumed = ?
      WHERE trip_id = ?
    `, [
      schedule_id || null, 
      vehicle_id || null, 
      driver_id || null, 
      trip_date || null, 
      normalizeDateTime(trip_date, departure_time),
      normalizeDateTime(trip_date, arrival_time),
      normalizeDateTime(trip_date, actual_departure_time),
      normalizeDateTime(trip_date, actual_arrival_time),
      trip_status || 'Scheduled',
      passengers_count || null, 
      route_distance || null, 
      fuel_consumed || null, 
      id
    ]);

    res.json({ message: 'Trip updated successfully' });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ error: 'Failed to update trip: ' + error.message });
  }
};

// Delete a trip
exports.deleteTrip = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM trips WHERE trip_id = ?', [id]);
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ error: 'Failed to delete trip: ' + error.message });
  }
};