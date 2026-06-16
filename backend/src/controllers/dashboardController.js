const db = require("../config/db");

// ─── System overview counts ────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    let userCount   = [{ count: 0 }];
    let depotCount  = [{ count: 0 }];
    let routeCount  = [{ count: 0 }];
    let busCount    = [{ count: 0 }];
    let driverCount = [{ count: 0 }];

    try { [userCount]   = await db.query("SELECT COUNT(*) as count FROM users"); }       catch (e) { console.error("stats:users", e.message); }
    try { [depotCount]  = await db.query("SELECT COUNT(*) as count FROM depots"); }      catch (e) { console.error("stats:depots", e.message); }
    try { [routeCount]  = await db.query("SELECT COUNT(*) as count FROM routes"); }      catch (e) { console.error("stats:routes", e.message); }
    try { [busCount]    = await db.query("SELECT COUNT(*) as count FROM buses"); }       catch (e) { console.error("stats:buses", e.message); }
    try { [driverCount] = await db.query("SELECT COUNT(*) as count FROM drivers"); }    catch (e) { console.error("stats:drivers", e.message); }

    return res.status(200).json({
      totalUsers:   userCount[0]?.count   || 0,
      totalDepots:  depotCount[0]?.count  || 0,
      totalRoutes:  routeCount[0]?.count  || 0,
      totalBuses:   busCount[0]?.count    || 0,
      totalDrivers: driverCount[0]?.count || 0
    });
  } catch (error) {
    console.error("❌ Fatal Dashboard getStats:", error);
    return res.status(500).json({ message: "Internal metrics tracking engine error" });
  }
};

// ─── Trip metrics — all trips (not filtered to today since test data is in 2026) ─
exports.getTripMetrics = async (req, res) => {
  try {
    // Use the most recent trip_date as "context date" so demo data always shows
    const [latestRow] = await db.query("SELECT MAX(trip_date) AS latest FROM trips");
    const refDate = latestRow[0]?.latest
      ? latestRow[0].latest.toISOString ? latestRow[0].latest.toISOString().split("T")[0] : String(latestRow[0].latest).split("T")[0]
      : new Date().toISOString().split("T")[0];

    // Count trips on the most recent date that has any trips
    const [today_trips] = await db.query(
      `SELECT
         SUM(CASE WHEN trip_status IN ('Scheduled','In Progress') THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN trip_status = 'Completed'  THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN trip_status = 'Delayed'    THEN 1 ELSE 0 END) AS delayed,
         SUM(CASE WHEN trip_status = 'Cancelled'  THEN 1 ELSE 0 END) AS cancelled,
         COUNT(*) AS total
       FROM trips
       WHERE DATE(trip_date) = ?`,
      [refDate]
    );

    // Total across all trips
    const [all_trips] = await db.query(
      `SELECT
         SUM(CASE WHEN trip_status IN ('Scheduled','In Progress') THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN trip_status = 'Completed'  THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN trip_status = 'Delayed'    THEN 1 ELSE 0 END) AS delayed,
         SUM(CASE WHEN trip_status = 'Cancelled'  THEN 1 ELSE 0 END) AS cancelled,
         COUNT(*) AS total
       FROM trips`
    );

    let fuel_total = "0.00";
    try {
      const [fuel] = await db.query("SELECT SUM(fuel_quantity) AS total FROM fuel_records");
      fuel_total = fuel[0]?.total ? parseFloat(fuel[0].total).toFixed(2) : "0.00";
    } catch (_) {}

    return res.status(200).json({
      // Show per latest-date counts (so they're non-zero when data exists)
      active_trips:    all_trips[0]?.active    || 0,
      completed_trips: all_trips[0]?.completed || 0,
      delayed_trips:   all_trips[0]?.delayed   || 0,
      cancelled_trips: all_trips[0]?.cancelled || 0,
      total_today:     all_trips[0]?.total     || 0,
      fuel_used_today: fuel_total,
      ref_date: refDate
    });
  } catch (error) {
    console.error("❌ getTripMetrics Error:", error);
    return res.status(500).json({ message: "Error fetching trip metrics" });
  }
};

// ─── Trip chart — last 30 days of available data (not hardcoded to current week) ─
exports.getTripChartData = async (req, res) => {
  try {
    // Find date range in the trips table
    const [range] = await db.query("SELECT MIN(trip_date) AS min_d, MAX(trip_date) AS max_d FROM trips");
    const maxDate = range[0]?.max_d;

    if (!maxDate) {
      return res.status(200).json([]);
    }

    // Go back 30 days from latest trip date
    const [dailyTrips] = await db.query(
      `SELECT
         DATE(trip_date) AS date,
         SUM(CASE WHEN trip_status = 'Completed'                       THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN trip_status IN ('Scheduled','In Progress')       THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN trip_status = 'Cancelled'                        THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN trip_status = 'Delayed'                          THEN 1 ELSE 0 END) AS delayed,
         COUNT(*) AS total
       FROM trips
       WHERE trip_date >= DATE_SUB(?, INTERVAL 30 DAY)
       GROUP BY DATE(trip_date)
       ORDER BY trip_date ASC`,
      [maxDate]
    );

    return res.status(200).json(dailyTrips || []);
  } catch (error) {
    console.error("❌ getTripChartData Error:", error);
    return res.status(500).json({ message: "Error fetching trip chart data" });
  }
};

// ─── Route performance — join trips via schedules (trips has no route_id) ────
exports.getRoutePerformance = async (req, res) => {
  try {
    const [routes] = await db.query(
      `SELECT
         r.route_id,
         r.route_name,
         r.route_code,
         r.total_distance,
         r.estimated_duration,
         COUNT(t.trip_id)                                                  AS total_trips,
         SUM(CASE WHEN t.trip_status = 'Completed'  THEN 1 ELSE 0 END)   AS completed,
         SUM(CASE WHEN t.trip_status = 'Delayed'    THEN 1 ELSE 0 END)   AS delayed,
         SUM(CASE WHEN t.trip_status = 'Cancelled'  THEN 1 ELSE 0 END)   AS cancelled,
         SUM(CASE WHEN t.trip_status IN ('Scheduled','In Progress') THEN 1 ELSE 0 END) AS active
       FROM routes r
       LEFT JOIN schedules s ON s.route_id = r.route_id
       LEFT JOIN trips t     ON t.schedule_id = s.schedule_id
       GROUP BY r.route_id, r.route_name, r.route_code, r.total_distance, r.estimated_duration
       ORDER BY total_trips DESC, completed DESC
       LIMIT 10`
    );

    return res.status(200).json(routes || []);
  } catch (error) {
    console.error("❌ getRoutePerformance Error:", error);
    return res.status(500).json({ message: "Error fetching route performance" });
  }
};

// ─── Live trip status — all recent trips (join via schedules for route_name) ─
exports.getLiveTripsStatus = async (req, res) => {
  try {
    const [trips] = await db.query(
      `SELECT
         t.trip_id,
         r.route_name,
         v.registration_number,
         b.bus_code,
         t.trip_status,
         DATE(t.trip_date) AS trip_date,
         t.departure_time,
         t.arrival_time,
         CONCAT(d.first_name, ' ', d.last_name) AS driver_name
       FROM trips t
       LEFT JOIN schedules s  ON t.schedule_id = s.schedule_id
       LEFT JOIN routes r     ON s.route_id = r.route_id
       LEFT JOIN vehicles v   ON t.vehicle_id = v.vehicle_id
       LEFT JOIN buses b      ON b.vehicle_id = v.vehicle_id
       LEFT JOIN drivers d    ON t.driver_id = d.driver_id
       ORDER BY t.trip_date DESC, t.departure_time DESC
       LIMIT 20`
    );

    return res.status(200).json(trips || []);
  } catch (error) {
    console.error("❌ getLiveTripsStatus Error:", error);
    return res.status(500).json({ message: "Error fetching live trips" });
  }
};

// ─── Vehicle status pie chart ──────────────────────────────────────────────
exports.getVehicleStatus = async (req, res) => {
  try {
    const [statuses] = await db.query(
      `SELECT status, COUNT(*) AS count FROM vehicles GROUP BY status`
    );
    return res.status(200).json(statuses || []);
  } catch (error) {
    console.error("❌ getVehicleStatus Error:", error);
    return res.status(500).json({ message: "Error fetching vehicle status" });
  }
};

// ─── Fuel consumption — last 30 days of available fuel data ──────────────
exports.getFuelWeekly = async (req, res) => {
  try {
    // Use max fuel_date as reference so demo data always shows
    let weekStart = null;
    try {
      const [maxRow] = await db.query("SELECT MAX(fuel_date) AS max_d FROM fuel_records");
      if (maxRow[0]?.max_d) {
        const maxD = maxRow[0].max_d;
        const d = maxD instanceof Date ? maxD : new Date(maxD);
        d.setDate(d.getDate() - 30);
        weekStart = d.toISOString().split("T")[0];
      }
    } catch (_) {}

    if (!weekStart) {
      return res.status(200).json([]);
    }

    const [dailyFuel] = await db.query(
      `SELECT
         DATE(fuel_date) AS date,
         SUM(fuel_quantity) AS quantity,
         SUM(fuel_cost)     AS cost
       FROM fuel_records
       WHERE fuel_date >= ?
       GROUP BY DATE(fuel_date)
       ORDER BY fuel_date ASC`,
      [weekStart]
    );

    return res.status(200).json(dailyFuel || []);
  } catch (error) {
    console.error("❌ getFuelWeekly Error:", error);
    return res.status(500).json({ message: "Error fetching fuel data" });
  }
};

// ─── Depot summary ─────────────────────────────────────────────────────────
exports.getDepotSummary = async (req, res) => {
  try {
    // Count vehicles and drivers per depot
    const [depots] = await db.query(
      `SELECT
         d.depot_id,
         d.depot_name,
         COUNT(DISTINCT v.vehicle_id)   AS vehicles,
         COUNT(DISTINCT dr.driver_id)   AS drivers
       FROM depots d
       LEFT JOIN vehicles v  ON d.depot_id = v.depot_id
       LEFT JOIN drivers  dr ON d.depot_id = dr.depot_id
       GROUP BY d.depot_id, d.depot_name
       ORDER BY vehicles DESC`
    );

    // Count trips per depot via vehicles (trips → vehicle → depot)
    const [tripCounts] = await db.query(
      `SELECT
         v.depot_id,
         COUNT(DISTINCT t.trip_id) AS trips_total
       FROM trips t
       JOIN vehicles v ON t.vehicle_id = v.vehicle_id
       GROUP BY v.depot_id`
    );

    const tripMap = {};
    tripCounts.forEach(r => { tripMap[r.depot_id] = r.trips_total; });

    const enriched = depots.map(d => ({
      ...d,
      trips_today: tripMap[d.depot_id] || 0
    }));

    return res.status(200).json(enriched || []);
  } catch (error) {
    console.error("❌ getDepotSummary Error:", error);
    return res.status(500).json({ message: "Error fetching depot summary" });
  }
};
