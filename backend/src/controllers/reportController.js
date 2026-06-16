const db   = require("../config/db");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

// ─── 1. FUEL CONSUMPTION REPORT ──────────────────────────────────────────────

exports.getFuelConsumptionReport = async (req, res) => {
  try {
    const { start_date, end_date, vehicle_id, depot_id } = req.query;

    let where = "WHERE 1=1";
    const params = [];
    if (start_date) { where += " AND fr.fuel_date >= ?";  params.push(start_date); }
    if (end_date)   { where += " AND fr.fuel_date <= ?";  params.push(end_date); }
    if (vehicle_id) { where += " AND fr.vehicle_id = ?";  params.push(vehicle_id); }
    if (depot_id)   { where += " AND v.depot_id = ?";     params.push(depot_id); }

    const [summary] = await db.query(
      `SELECT
         SUM(fr.fuel_quantity)          AS total_quantity,
         SUM(fr.fuel_cost)              AS total_cost,
         AVG(fr.fuel_efficiency)        AS avg_efficiency,
         COUNT(fr.fuel_id)              AS total_records,
         COUNT(DISTINCT fr.vehicle_id)  AS vehicles_tracked
       FROM fuel_records fr
       LEFT JOIN vehicles v ON fr.vehicle_id = v.vehicle_id
       ${where}`, params
    );

    const [byType] = await db.query(
      `SELECT fr.fuel_type,
         SUM(fr.fuel_quantity)   AS quantity,
         SUM(fr.fuel_cost)       AS cost,
         AVG(fr.fuel_efficiency) AS avg_efficiency,
         COUNT(*)                AS count
       FROM fuel_records fr
       LEFT JOIN vehicles v ON fr.vehicle_id = v.vehicle_id
       ${where}
       GROUP BY fr.fuel_type ORDER BY quantity DESC`, params
    );

    const [byVehicle] = await db.query(
      `SELECT v.vehicle_id, v.registration_number,
         SUM(fr.fuel_quantity)   AS quantity,
         SUM(fr.fuel_cost)       AS cost,
         AVG(fr.fuel_efficiency) AS avg_efficiency,
         COUNT(*)                AS records
       FROM fuel_records fr
       LEFT JOIN vehicles v ON fr.vehicle_id = v.vehicle_id
       ${where}
       GROUP BY v.vehicle_id, v.registration_number ORDER BY quantity DESC`, params
    );

    const [trend] = await db.query(
      `SELECT DATE(fr.fuel_date) AS fuel_date,
         SUM(fr.fuel_quantity)   AS daily_quantity,
         SUM(fr.fuel_cost)       AS daily_cost,
         AVG(fr.fuel_efficiency) AS daily_avg_efficiency,
         COUNT(*)                AS records
       FROM fuel_records fr
       LEFT JOIN vehicles v ON fr.vehicle_id = v.vehicle_id
       ${where}
       GROUP BY DATE(fr.fuel_date) ORDER BY fuel_date DESC`, params
    );

    return res.status(200).json({
      summary: {
        total_quantity:   summary[0]?.total_quantity  ? parseFloat(summary[0].total_quantity).toFixed(2)  : "0.00",
        total_cost:       summary[0]?.total_cost      ? parseFloat(summary[0].total_cost).toFixed(2)      : "0.00",
        avg_efficiency:   summary[0]?.avg_efficiency  ? parseFloat(summary[0].avg_efficiency).toFixed(2)  : "0.00",
        total_records:    summary[0]?.total_records   || 0,
        vehicles_tracked: summary[0]?.vehicles_tracked || 0
      },
      by_type: byType, by_vehicle: byVehicle, trend
    });
  } catch (error) {
    console.error("❌ getFuelConsumptionReport:", error);
    return res.status(500).json({ message: "Internal server error generating fuel report." });
  }
};

// ─── 2. ROUTE MANAGEMENT REPORT ───────────────────────────────────────────────

exports.getRouteManagementReport = async (req, res) => {
  try {
    const { start_date, end_date, depot_id, route_id } = req.query;

    let routeWhere = "WHERE 1=1";
    let joinWhere = "";
    const params = [];
    
    if (depot_id)   { routeWhere += " AND r.depot_id = ?"; params.push(depot_id); }
    if (route_id)   { routeWhere += " AND r.route_id = ?"; params.push(route_id); }
    
    if (start_date) { joinWhere += " AND t.trip_date >= ?"; params.push(start_date); }
    if (end_date)   { joinWhere += " AND t.trip_date <= ?"; params.push(end_date); }

    let routes = [];
    try {
      const [result] = await db.query(
        `SELECT
           r.route_id, r.route_name, r.route_code,
           r.start_location, r.end_location,
           r.total_distance, r.estimated_duration,
           r.is_active, d.depot_name,
           COUNT(t.trip_id)                                                    AS total_trips,
           SUM(CASE WHEN t.trip_status='Completed'  THEN 1 ELSE 0 END)        AS completed_trips,
           SUM(CASE WHEN t.trip_status='Cancelled'  THEN 1 ELSE 0 END)        AS cancelled_trips,
           SUM(CASE WHEN t.trip_status='Scheduled'  THEN 1 ELSE 0 END)        AS scheduled_trips,
           SUM(CASE WHEN t.trip_status='In Progress' THEN 1 ELSE 0 END)       AS in_progress_trips,
           SUM(CASE WHEN t.trip_status='Delayed'     THEN 1 ELSE 0 END)       AS delayed_trips,
           COUNT(DISTINCT t.vehicle_id)                                        AS vehicles_used,
           COUNT(DISTINCT t.driver_id)                                         AS drivers_assigned,
           AVG(CASE WHEN t.trip_status='Completed' THEN 1.0 ELSE 0 END)       AS completion_rate
         FROM routes r
         LEFT JOIN depots d ON r.depot_id = d.depot_id
         LEFT JOIN schedules sch ON sch.route_id = r.route_id
         LEFT JOIN trips t ON t.schedule_id = sch.schedule_id ${joinWhere}
         ${routeWhere}
         GROUP BY r.route_id, r.route_name, r.route_code, r.start_location,
                  r.end_location, r.total_distance, r.estimated_duration, r.is_active, r.depot_id, d.depot_id
         ORDER BY total_trips DESC`, params
      );
      routes = result || [];
    } catch (tripsErr) {
      console.warn("⚠️  trips table not available:", tripsErr.message);
      let qWhere = "WHERE 1=1";
      const qParams = [];
      if (depot_id)  { qWhere += " AND r.depot_id = ?"; qParams.push(depot_id); }
      if (route_id)  { qWhere += " AND r.route_id = ?"; qParams.push(route_id); }
      
      const [result] = await db.query(
        `SELECT r.route_id, r.route_name, r.route_code,
           r.start_location, r.end_location, r.total_distance,
           r.estimated_duration, r.is_active, d.depot_name,
           0 AS total_trips, 0 AS completed_trips, 0 AS cancelled_trips,
           0 AS scheduled_trips, 0 AS in_progress_trips, 0 AS delayed_trips,
           0 AS vehicles_used, 0 AS drivers_assigned, 0 AS completion_rate
         FROM routes r
         LEFT JOIN depots d ON r.depot_id = d.depot_id
         ${qWhere}
         ORDER BY r.route_id`, qParams
      );
      routes = result || [];
    }

    const enriched = routes.map(r => ({
      ...r,
      completion_percentage: r.total_trips > 0 ? Math.round(r.completion_rate * 100) : 0
    }));

    return res.status(200).json({
      routes: enriched,
      total_routes: enriched.length,
      total_trips: enriched.reduce((s, r) => s + (r.total_trips || 0), 0),
      avg_completion: enriched.length > 0
        ? Math.round(enriched.reduce((s, r) => s + r.completion_percentage, 0) / enriched.length)
        : 0
    });
  } catch (error) {
    console.error("❌ getRouteManagementReport:", error);
    return res.status(500).json({ message: "Internal server error generating route report." });
  }
};

// ─── 3. DEPOT MANAGEMENT REPORT ───────────────────────────────────────────────

exports.getDepotManagementReport = async (req, res) => {
  try {
    const { depot_id } = req.query;

    let depotWhere = "WHERE 1=1";
    const params = [];
    if (depot_id) { depotWhere += " AND d.depot_id = ?"; params.push(depot_id); }

    const [depots] = await db.query(
      `SELECT
         d.depot_id, d.depot_name, d.location, d.contact_person,
         COUNT(DISTINCT v.vehicle_id)                                     AS total_vehicles,
         COUNT(DISTINCT CASE WHEN v.status='Available' THEN v.vehicle_id END) AS available_vehicles,
         COUNT(DISTINCT CASE WHEN v.status='Under Maintenance' THEN v.vehicle_id END) AS maintenance_vehicles,
         COUNT(DISTINCT dr.driver_id)                                     AS total_drivers,
         COUNT(DISTINCT CASE WHEN dr.is_available=1 THEN dr.driver_id END) AS available_drivers,
         COUNT(DISTINCT r.route_id)                                       AS total_routes,
         COUNT(DISTINCT CASE WHEN r.is_active=1 THEN r.route_id END)     AS active_routes
       FROM depots d
       LEFT JOIN vehicles v  ON d.depot_id = v.depot_id
       LEFT JOIN drivers  dr ON d.depot_id = dr.depot_id
       LEFT JOIN routes   r  ON d.depot_id = r.depot_id
       ${depotWhere}
       GROUP BY d.depot_id, d.depot_name, d.location, d.contact_person
       ORDER BY d.depot_name ASC`, params
    );

    const [scheduleSummary] = await db.query(
      `SELECT
         d.depot_id, d.depot_name,
         COUNT(s.schedule_id) AS total_schedules,
         SUM(CASE WHEN s.status='Scheduled'   THEN 1 ELSE 0 END) AS scheduled_count,
         SUM(CASE WHEN s.status='Completed'   THEN 1 ELSE 0 END) AS completed_count,
         SUM(CASE WHEN s.status='Cancelled'   THEN 1 ELSE 0 END) AS cancelled_count,
         SUM(CASE WHEN s.status='In Progress' THEN 1 ELSE 0 END) AS in_progress_count
       FROM depots d
       LEFT JOIN schedules s ON d.depot_id = s.depot_id
       ${depotWhere}
       GROUP BY d.depot_id, d.depot_name`, params
    );

    const scheduleMap = {};
    scheduleSummary.forEach(s => { scheduleMap[s.depot_id] = s; });

    const enriched = depots.map(d => ({
      ...d,
      vehicle_utilization: d.total_vehicles > 0
        ? Math.round(((d.total_vehicles - d.available_vehicles) / d.total_vehicles) * 100) : 0,
      schedules: scheduleMap[d.depot_id] || {}
    }));

    return res.status(200).json({ depots: enriched, total_depots: enriched.length });
  } catch (error) {
    console.error("❌ getDepotManagementReport:", error);
    return res.status(500).json({ message: "Internal server error generating depot report." });
  }
};

// ─── 4. SCHEDULES MANAGEMENT REPORT ──────────────────────────────────────────

exports.getSchedulesManagementReport = async (req, res) => {
  try {
    const { start_date, end_date, depot_id, route_id, status } = req.query;

    let where = "WHERE 1=1";
    const params = [];
    if (start_date) { where += " AND s.schedule_date >= ?"; params.push(start_date); }
    if (end_date)   { where += " AND s.schedule_date <= ?"; params.push(end_date); }
    if (depot_id)   { where += " AND s.depot_id = ?";       params.push(depot_id); }
    if (route_id)   { where += " AND s.route_id = ?";       params.push(route_id); }
    if (status)     { where += " AND s.status = ?";         params.push(status); }

    const [summary] = await db.query(
      `SELECT
         COUNT(*) AS total_schedules,
         SUM(CASE WHEN s.status='Scheduled'   THEN 1 ELSE 0 END) AS scheduled,
         SUM(CASE WHEN s.status='In Progress' THEN 1 ELSE 0 END) AS in_progress,
         SUM(CASE WHEN s.status='Completed'   THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN s.status='Cancelled'   THEN 1 ELSE 0 END) AS cancelled,
         COUNT(DISTINCT s.route_id)  AS routes_covered,
         COUNT(DISTINCT s.depot_id)  AS depots_covered
       FROM schedules s ${where}`, params
    );

    const [byRoute] = await db.query(
      `SELECT
         r.route_name, r.route_code,
         COUNT(s.schedule_id)                                          AS total,
         SUM(CASE WHEN s.status='Completed' THEN 1 ELSE 0 END)        AS completed,
         SUM(CASE WHEN s.status='Cancelled' THEN 1 ELSE 0 END)        AS cancelled,
         SUM(CASE WHEN s.status='Scheduled' THEN 1 ELSE 0 END)        AS scheduled
       FROM schedules s
       LEFT JOIN routes r ON s.route_id = r.route_id
       ${where}
       GROUP BY r.route_id, r.route_name, r.route_code
       ORDER BY total DESC LIMIT 20`, params
    );

    const [byDepot] = await db.query(
      `SELECT
         d.depot_name,
         COUNT(s.schedule_id)                                    AS total,
         SUM(CASE WHEN s.status='Completed' THEN 1 ELSE 0 END)  AS completed,
         SUM(CASE WHEN s.status='Cancelled' THEN 1 ELSE 0 END)  AS cancelled
       FROM schedules s
       LEFT JOIN depots d ON s.depot_id = d.depot_id
       ${where}
       GROUP BY d.depot_id, d.depot_name ORDER BY total DESC`, params
    );

    const [recent] = await db.query(
      `SELECT
         s.schedule_id, s.schedule_code, s.schedule_date, s.schedule_type,
         s.departure_time, s.expected_arrival_time, s.status,
         d.depot_name, r.route_name
       FROM schedules s
       LEFT JOIN depots d ON s.depot_id = d.depot_id
       LEFT JOIN routes r ON s.route_id = r.route_id
       ${where}
       ORDER BY s.schedule_date DESC, s.departure_time DESC LIMIT 50`, params
    );

    const total = summary[0]?.total_schedules || 0;
    const completed = summary[0]?.completed || 0;

    return res.status(200).json({
      summary: {
        ...summary[0],
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0
      },
      by_route: byRoute,
      by_depot: byDepot,
      recent_schedules: recent
    });
  } catch (error) {
    console.error("❌ getSchedulesManagementReport:", error);
    return res.status(500).json({ message: "Internal server error generating schedules report." });
  }
};

// ─── 5. DRIVER SHIFT MANAGEMENT REPORT ───────────────────────────────────────

exports.getDriverShiftReport = async (req, res) => {
  try {
    const { start_date, end_date, depot_id, driver_id } = req.query;

    // Build separate param arrays for each query to avoid passing wrong counts
    const tripParams = [];
    let tripWhere = "WHERE 1=1";
    if (start_date) { tripWhere += " AND t.trip_date >= ?";  tripParams.push(start_date); }
    if (end_date)   { tripWhere += " AND t.trip_date <= ?";  tripParams.push(end_date); }
    if (depot_id)   { tripWhere += " AND dr.depot_id = ?";   tripParams.push(depot_id); }
    if (driver_id)  { tripWhere += " AND t.driver_id = ?";   tripParams.push(driver_id); }

    // Separate params for driver-level query (depot/driver filters go in outer WHERE)
    const tripDateParams = [];
    let tripDateJoin = "1=1";
    if (start_date) { tripDateJoin += " AND t.trip_date >= ?"; tripDateParams.push(start_date); }
    if (end_date)   { tripDateJoin += " AND t.trip_date <= ?"; tripDateParams.push(end_date); }

    const driverFilterParams = [...tripDateParams];
    let driverOuterWhere = "WHERE dr.driver_id IS NOT NULL";
    if (depot_id)  { driverOuterWhere += " AND dr.depot_id = ?";  driverFilterParams.push(depot_id); }
    if (driver_id) { driverOuterWhere += " AND dr.driver_id = ?"; driverFilterParams.push(driver_id); }

    let summary = {}, byDriver = [], shiftByDay = [];

    try {
      const [summaryResult] = await db.query(
        `SELECT
           COUNT(DISTINCT t.driver_id)                                       AS active_drivers,
           COUNT(t.trip_id)                                                  AS total_trips,
           SUM(CASE WHEN t.trip_status='Completed'  THEN 1 ELSE 0 END)      AS completed_trips,
           SUM(CASE WHEN t.trip_status='Cancelled'  THEN 1 ELSE 0 END)      AS cancelled_trips,
           SUM(CASE WHEN t.trip_status='Delayed'    THEN 1 ELSE 0 END)      AS delayed_trips,
           SUM(CASE WHEN t.trip_status='In Progress' THEN 1 ELSE 0 END)     AS in_progress_trips
         FROM trips t
         LEFT JOIN drivers dr ON t.driver_id = dr.driver_id
         ${tripWhere}`, tripParams
      );
      summary = summaryResult[0] || {};

      const [driverResult] = await db.query(
        `SELECT
           dr.driver_id,
           CONCAT(dr.first_name, ' ', dr.last_name)                         AS driver_name,
           dr.license_number, d.depot_name,
           COUNT(t.trip_id)                                                  AS total_trips,
           SUM(CASE WHEN t.trip_status='Completed'  THEN 1 ELSE 0 END)      AS completed_trips,
           SUM(CASE WHEN t.trip_status='Cancelled'  THEN 1 ELSE 0 END)      AS cancelled_trips,
           SUM(CASE WHEN t.trip_status='Delayed'    THEN 1 ELSE 0 END)      AS delayed_trips,
           SUM(CASE WHEN t.trip_status='In Progress' THEN 1 ELSE 0 END)     AS in_progress_trips,
           SUM(CASE WHEN t.trip_status='Scheduled'  THEN 1 ELSE 0 END)      AS scheduled_trips,
           COUNT(DISTINCT DATE(t.trip_date))                                 AS working_days,
           COUNT(DISTINCT sch.route_id)                                      AS routes_served,
           AVG(CASE WHEN t.trip_status='Completed' THEN 1.0 ELSE 0 END)     AS completion_rate
         FROM drivers dr
         LEFT JOIN depots d ON dr.depot_id = d.depot_id
         LEFT JOIN trips t ON dr.driver_id = t.driver_id AND ${tripDateJoin}
         LEFT JOIN schedules sch ON t.schedule_id = sch.schedule_id
         ${driverOuterWhere}
         GROUP BY dr.driver_id, dr.first_name, dr.last_name, dr.license_number, dr.depot_id, d.depot_id
         ORDER BY total_trips DESC`,
        driverFilterParams
      );
      byDriver = driverResult || [];

      const [dayResult] = await db.query(
        `SELECT
           DATE(t.trip_date) AS trip_date,
           COUNT(DISTINCT t.driver_id)                                  AS drivers_working,
           COUNT(t.trip_id)                                             AS total_trips,
           SUM(CASE WHEN t.trip_status='Completed' THEN 1 ELSE 0 END)  AS completed
         FROM trips t
         LEFT JOIN drivers dr ON t.driver_id = dr.driver_id
         ${tripWhere}
         GROUP BY DATE(t.trip_date) ORDER BY trip_date DESC LIMIT 30`, tripParams
      );
      shiftByDay = dayResult || [];

    } catch (tripsErr) {
      console.warn("⚠️  trips table not available or empty, falling back to driver_assignments:", tripsErr.message);

      // Fallback: use driver_assignments table — use assignment_date (not created_at)
      const daParams = [];
      let daDateJoin = "1=1";
      if (start_date) { daDateJoin += " AND da.assignment_date >= ?"; daParams.push(start_date); }
      if (end_date)   { daDateJoin += " AND da.assignment_date <= ?"; daParams.push(end_date); }

      const daFilterParams = [...daParams];
      let daOuterWhere = "WHERE dr.driver_id IS NOT NULL";
      if (depot_id)  { daOuterWhere += " AND dr.depot_id = ?";  daFilterParams.push(depot_id); }
      if (driver_id) { daOuterWhere += " AND da.driver_id = ?"; daFilterParams.push(driver_id); }

      try {
        const [daResult] = await db.query(
          `SELECT
             dr.driver_id,
             CONCAT(dr.first_name, ' ', dr.last_name) AS driver_name,
             dr.license_number, d.depot_name,
             COUNT(DISTINCT da.assignment_id)             AS total_trips,
             SUM(CASE WHEN da.status='Completed'  THEN 1 ELSE 0 END) AS completed_trips,
             SUM(CASE WHEN da.status='Completed'  THEN 1 ELSE 0 END) AS cancelled_trips,
             SUM(CASE WHEN da.status='Active'     THEN 1 ELSE 0 END) AS in_progress_trips,
             SUM(CASE WHEN da.status='Assigned'   THEN 1 ELSE 0 END) AS scheduled_trips,
             COUNT(DISTINCT da.assignment_date)           AS working_days,
             COUNT(DISTINCT s.route_id)                   AS routes_served,
             AVG(CASE WHEN da.status='Completed' THEN 1.0 ELSE 0 END) AS completion_rate
           FROM drivers dr
           LEFT JOIN depots d ON dr.depot_id = d.depot_id
           LEFT JOIN driver_assignments da ON dr.driver_id = da.driver_id AND ${daDateJoin}
           LEFT JOIN schedules s ON da.schedule_id = s.schedule_id
           ${daOuterWhere}
           GROUP BY dr.driver_id, dr.first_name, dr.last_name, dr.license_number, dr.depot_id, d.depot_id
           ORDER BY total_trips DESC`, daFilterParams
        );
        byDriver = daResult || [];

        const [daSummary] = await db.query(
          `SELECT
             COUNT(DISTINCT da.driver_id)             AS active_drivers,
             COUNT(DISTINCT da.assignment_id)         AS total_trips,
             SUM(CASE WHEN da.status='Completed' THEN 1 ELSE 0 END) AS completed_trips,
             SUM(CASE WHEN da.status='Completed' THEN 1 ELSE 0 END) AS cancelled_trips
           FROM driver_assignments da
           LEFT JOIN drivers dr ON da.driver_id = dr.driver_id
           WHERE ${daDateJoin}
           ${depot_id  ? "AND dr.depot_id = ?"  : ""}
           ${driver_id ? "AND da.driver_id = ?" : ""}`,
          daFilterParams
        );
        summary = daSummary[0] || {};

        // Daily trend from driver_assignments
        const daDay = [];
        const daDayParams = [...daParams];
        let daDayWhere = `WHERE ${daDateJoin}`;
        if (depot_id)  { daDayWhere += " AND dr.depot_id = ?";  daDayParams.push(depot_id); }
        if (driver_id) { daDayWhere += " AND da.driver_id = ?"; daDayParams.push(driver_id); }
        const [daDayResult] = await db.query(
          `SELECT
             da.assignment_date AS trip_date,
             COUNT(DISTINCT da.driver_id) AS drivers_working,
             COUNT(DISTINCT da.assignment_id) AS total_trips,
             SUM(CASE WHEN da.status='Completed' THEN 1 ELSE 0 END) AS completed
           FROM driver_assignments da
           LEFT JOIN drivers dr ON da.driver_id = dr.driver_id
           ${daDayWhere}
           GROUP BY da.assignment_date ORDER BY trip_date DESC LIMIT 30`, daDayParams
        );
        shiftByDay = daDayResult || [];

      } catch (daErr) {
        console.warn("⚠️  driver_assignments also unavailable:", daErr.message);
        summary = { active_drivers: 0, total_trips: 0, completed_trips: 0, cancelled_trips: 0 };
        byDriver = [];
        shiftByDay = [];
      }
    }

    const enrichedDrivers = byDriver.map(d => ({
      ...d,
      completion_percentage: d.total_trips > 0 ? Math.round((d.completion_rate || 0) * 100) : 0,
      trips_per_day: d.working_days > 0
        ? parseFloat((d.total_trips / d.working_days).toFixed(1)) : 0
    }));

    return res.status(200).json({
      summary: {
        active_drivers:  summary.active_drivers  || 0,
        total_trips:     summary.total_trips     || 0,
        completed_trips: summary.completed_trips || 0,
        cancelled_trips: summary.cancelled_trips || 0,
        delayed_trips:   summary.delayed_trips   || 0,
        in_progress_trips: summary.in_progress_trips || 0,
        completion_rate: (summary.total_trips || 0) > 0
          ? Math.round(((summary.completed_trips || 0) / summary.total_trips) * 100) : 0
      },
      by_driver: enrichedDrivers,
      shift_by_day: shiftByDay
    });
  } catch (error) {
    console.error("❌ getDriverShiftReport:", error);
    return res.status(500).json({ message: "Internal server error generating driver shift report." });
  }
};

// ─── 6. MAINTENANCE MANAGEMENT REPORT ────────────────────────────────────────

exports.getMaintenanceManagementReport = async (req, res) => {
  try {
    const { start_date, end_date, vehicle_id, depot_id, status } = req.query;

    let where = "WHERE 1=1";
    const params = [];
    if (start_date) { where += " AND mr.maintenance_date >= ?"; params.push(start_date); }
    if (end_date)   { where += " AND mr.maintenance_date <= ?"; params.push(end_date); }
    if (vehicle_id) { where += " AND mr.vehicle_id = ?";        params.push(vehicle_id); }
    if (depot_id)   { where += " AND v.depot_id = ?";           params.push(depot_id); }
    if (status)     { where += " AND mr.maintenance_status = ?"; params.push(status); }

    const [summary] = await db.query(
      `SELECT
         COUNT(*)                                                           AS total_records,
         SUM(CASE WHEN mr.maintenance_status='Completed'  THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN mr.maintenance_status='Scheduled'  THEN 1 ELSE 0 END) AS scheduled,
         SUM(CASE WHEN mr.maintenance_status='In Progress' THEN 1 ELSE 0 END) AS in_progress,
         SUM(mr.cost)                                                       AS total_cost,
         AVG(mr.cost)                                                       AS avg_cost,
         COUNT(DISTINCT mr.vehicle_id)                                      AS vehicles_serviced
       FROM maintenance_records mr
       LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
       ${where}`, params
    );

    const [byType] = await db.query(
      `SELECT
         mr.maintenance_type,
         COUNT(*)                                                            AS count,
         SUM(mr.cost)                                                        AS total_cost,
         AVG(mr.cost)                                                        AS avg_cost,
         SUM(CASE WHEN mr.maintenance_status='Completed' THEN 1 ELSE 0 END) AS completed
       FROM maintenance_records mr
       LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
       ${where}
       GROUP BY mr.maintenance_type ORDER BY count DESC`, params
    );

    const [byVehicle] = await db.query(
      `SELECT
         v.registration_number, d.depot_name,
         COUNT(mr.maintenance_id)                                            AS total_records,
         SUM(mr.cost)                                                        AS total_cost,
         SUM(CASE WHEN mr.maintenance_status='Completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN mr.maintenance_status='Scheduled' THEN 1 ELSE 0 END) AS scheduled,
         MAX(mr.maintenance_date)                                            AS last_maintenance
       FROM maintenance_records mr
       LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
       LEFT JOIN depots  d ON v.depot_id = d.depot_id
       ${where}
       GROUP BY v.vehicle_id, v.registration_number, d.depot_name
       ORDER BY total_records DESC`, params
    );

    const [trend] = await db.query(
      `SELECT
         DATE(mr.maintenance_date)                                           AS maint_date,
         COUNT(*)                                                            AS count,
         SUM(mr.cost)                                                        AS daily_cost,
         SUM(CASE WHEN mr.maintenance_status='Completed' THEN 1 ELSE 0 END) AS completed
       FROM maintenance_records mr
       LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
       ${where}
       GROUP BY DATE(mr.maintenance_date) ORDER BY maint_date DESC LIMIT 30`, params
    );

    const total = summary[0]?.total_records || 0;
    const completed = summary[0]?.completed || 0;

    return res.status(200).json({
      summary: {
        total_records:     total,
        completed:         completed,
        scheduled:         summary[0]?.scheduled    || 0,
        in_progress:       summary[0]?.in_progress  || 0,
        total_cost:        summary[0]?.total_cost   ? parseFloat(summary[0].total_cost).toFixed(2)  : "0.00",
        avg_cost:          summary[0]?.avg_cost     ? parseFloat(summary[0].avg_cost).toFixed(2)    : "0.00",
        vehicles_serviced: summary[0]?.vehicles_serviced || 0,
        completion_rate:   total > 0 ? Math.round((completed / total) * 100) : 0
      },
      by_type: byType, by_vehicle: byVehicle, trend
    });
  } catch (error) {
    console.error("❌ getMaintenanceManagementReport:", error);
    return res.status(500).json({ message: "Internal server error generating maintenance report." });
  }
};

// ─── 7. FUEL SUMMARY REPORT (Task 6.1) ────────────────────────────────────────

/**
 * Helper: Sum numeric values with null handling
 */
function sumValues(arr, key) {
  return arr.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
}

/**
 * Helper: Calculate average of numeric values with null handling
 */
function avgValues(arr, key) {
  if (arr.length === 0) return 0;
  const sum = sumValues(arr, key);
  return parseFloat((sum / arr.length).toFixed(2));
}

/**
 * Helper: Group array by a key property
 */
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const groupKey = item[key];
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {});
}

/**
 * Helper: Calculate daily/weekly/monthly trend for time-series data
 */
function calculateTrend(records, aggregation = "daily") {
  if (!records || records.length === 0) return [];

  const grouped = {};
  records.forEach(record => {
    const date = new Date(record.fuel_date);
    let key;
    
    if (aggregation === "weekly") {
      const week = Math.floor(date.getDate() / 7) + 1;
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      key = `${year}-W${String(week).padStart(2, "0")}`;
    } else if (aggregation === "monthly") {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      key = `${year}-${month}`;
    } else {
      // daily (default)
      key = record.fuel_date;
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(record);
  });

  // Convert grouped object to trend array
  return Object.entries(grouped).map(([dateKey, items]) => ({
    date: dateKey,
    quantity: parseFloat(sumValues(items, "fuel_quantity").toFixed(2)),
    cost: parseFloat(sumValues(items, "fuel_cost").toFixed(2)),
    efficiency: avgValues(items, "fuel_efficiency"),
    count: items.length
  }));
}

exports.getFuelSummaryReport = async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date, aggregation = "daily" } = req.query;

    // Build WHERE clause with filters
    let where = "WHERE 1=1";
    const params = [];
    if (vehicle_id) { where += " AND fr.vehicle_id = ?"; params.push(vehicle_id); }
    if (start_date) { where += " AND fr.fuel_date >= ?"; params.push(start_date); }
    if (end_date)   { where += " AND fr.fuel_date <= ?"; params.push(end_date); }

    // Get overall summary: totals and averages
    const [summaryRows] = await db.query(
      `SELECT
         SUM(fr.fuel_quantity) AS total_quantity,
         SUM(fr.fuel_cost) AS total_cost,
         AVG(fr.fuel_efficiency) AS avg_efficiency,
         COUNT(fr.fuel_id) AS total_records,
         COUNT(DISTINCT fr.vehicle_id) AS vehicles_tracked,
         MIN(fr.fuel_date) AS first_date,
         MAX(fr.fuel_date) AS last_date
       FROM fuel_records fr
       ${where}`,
      params
    );

    const summary = summaryRows[0] || {
      total_quantity: 0,
      total_cost: 0,
      avg_efficiency: 0,
      total_records: 0,
      vehicles_tracked: 0
    };

    // Get breakdown by fuel type
    const [byFuelType] = await db.query(
      `SELECT
         fr.fuel_type,
         SUM(fr.fuel_quantity) AS quantity,
         SUM(fr.fuel_cost) AS cost,
         AVG(fr.fuel_efficiency) AS avg_efficiency,
         COUNT(*) AS count
       FROM fuel_records fr
       ${where}
       GROUP BY fr.fuel_type
       ORDER BY quantity DESC`,
      params
    );

    // Build fuel type breakdown object
    const fuelTypeBreakdown = {};
    byFuelType.forEach(type => {
      const qty = type.quantity !== null && type.quantity !== undefined ? parseFloat(type.quantity) : 0;
      const cst = type.cost !== null && type.cost !== undefined ? parseFloat(type.cost) : 0;
      fuelTypeBreakdown[type.fuel_type] = {
        quantity: parseFloat(qty.toFixed(2)),
        cost: parseFloat(cst.toFixed(2)),
        avg_efficiency: type.avg_efficiency ? parseFloat((type.avg_efficiency).toFixed(2)) : 0,
        count: type.count
      };
    });

    // Get breakdown by vehicle
    const [byVehicle] = await db.query(
      `SELECT
         v.vehicle_id, v.registration_number,
         SUM(fr.fuel_quantity) AS quantity,
         SUM(fr.fuel_cost) AS cost,
         AVG(fr.fuel_efficiency) AS avg_efficiency,
         COUNT(fr.fuel_id) AS count
       FROM fuel_records fr
       LEFT JOIN vehicles v ON fr.vehicle_id = v.vehicle_id
       ${where}
       GROUP BY v.vehicle_id, v.registration_number
       ORDER BY quantity DESC`,
      params
    );

    // Get all records for trend calculation
    const [trendRecords] = await db.query(
      `SELECT
         fr.fuel_id, fr.fuel_date, fr.fuel_quantity, fr.fuel_cost, fr.fuel_efficiency
       FROM fuel_records fr
       ${where}
       ORDER BY fr.fuel_date ASC`,
      params
    );

    // Calculate trend based on aggregation parameter
    const trend = calculateTrend(trendRecords, aggregation);

    return res.status(200).json({
      summary: {
        total_quantity: !summary.total_quantity ? 0 : parseFloat(parseFloat(summary.total_quantity).toFixed(2)),
        total_cost: !summary.total_cost ? 0 : parseFloat(parseFloat(summary.total_cost).toFixed(2)),
        avg_efficiency: summary.avg_efficiency ? parseFloat((summary.avg_efficiency).toFixed(2)) : 0,
        total_records: summary.total_records || 0,
        vehicles_tracked: summary.vehicles_tracked || 0,
        period: {
          start_date: summary.first_date,
          end_date: summary.last_date
        }
      },
      fuelTypeBreakdown,
      byVehicle: byVehicle.map(v => ({
        vehicle_id: v.vehicle_id,
        registration_number: v.registration_number,
        quantity: !v.quantity ? 0 : parseFloat(parseFloat(v.quantity).toFixed(2)),
        cost: !v.cost ? 0 : parseFloat(parseFloat(v.cost).toFixed(2)),
        avg_efficiency: v.avg_efficiency ? parseFloat((v.avg_efficiency).toFixed(2)) : 0,
        count: v.count
      })),
      trend
    });
  } catch (error) {
    console.error("❌ getFuelSummaryReport:", error);
    return res.status(500).json({ message: "Internal server error generating fuel summary report." });
  }
};

// ─── 8. MAINTENANCE SUMMARY REPORT (Task 6.1) ──────────────────────────────────

exports.getMaintenanceSummaryReport = async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date } = req.query;

    // Build WHERE clause with filters
    let where = "WHERE 1=1";
    const params = [];
    if (vehicle_id) { where += " AND mr.vehicle_id = ?"; params.push(vehicle_id); }
    if (start_date) { where += " AND mr.maintenance_date >= ?"; params.push(start_date); }
    if (end_date)   { where += " AND mr.maintenance_date <= ?"; params.push(end_date); }

    // Get overall summary: totals, counts, rates
    const [summaryRows] = await db.query(
      `SELECT
         COUNT(mr.maintenance_id) AS total_count,
         SUM(CASE WHEN mr.maintenance_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
         SUM(CASE WHEN mr.maintenance_status = 'Scheduled' THEN 1 ELSE 0 END) AS scheduled_count,
         SUM(CASE WHEN mr.maintenance_status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
         SUM(mr.cost) AS total_cost,
         AVG(mr.cost) AS avg_cost,
         COUNT(DISTINCT mr.vehicle_id) AS vehicles_serviced,
         MIN(mr.maintenance_date) AS first_date,
         MAX(mr.maintenance_date) AS last_date
       FROM maintenance_records mr
       ${where}`,
      params
    );

    const summary = summaryRows[0] || {
      total_count: 0,
      completed_count: 0,
      scheduled_count: 0,
      in_progress_count: 0,
      total_cost: 0,
      avg_cost: 0,
      vehicles_serviced: 0
    };

    // Calculate completion rate
    const totalCount = summary.total_count || 0;
    const completedCount = summary.completed_count || 0;
    const completionRate = totalCount > 0 
      ? parseFloat((completedCount / totalCount * 100).toFixed(2))
      : 0;

    // Get breakdown by maintenance type
    const [byType] = await db.query(
      `SELECT
         mr.maintenance_type,
         COUNT(*) AS count,
         SUM(mr.cost) AS total_cost,
         AVG(mr.cost) AS avg_cost,
         SUM(CASE WHEN mr.maintenance_status = 'Completed' THEN 1 ELSE 0 END) AS completed
       FROM maintenance_records mr
       ${where}
       GROUP BY mr.maintenance_type
       ORDER BY count DESC`,
      params
    );

    // Build type breakdown object
    const typeBreakdown = {};
    byType.forEach(type => {
      const totalCst = type.total_cost !== null && type.total_cost !== undefined ? parseFloat(type.total_cost) : 0;
      const avgCst = type.avg_cost !== null && type.avg_cost !== undefined ? parseFloat(type.avg_cost) : 0;
      typeBreakdown[type.maintenance_type] = {
        count: type.count,
        total_cost: parseFloat(totalCst.toFixed(2)),
        avg_cost: parseFloat(avgCst.toFixed(2)),
        completed: type.completed
      };
    });

    // Get breakdown by vehicle
    const [byVehicle] = await db.query(
      `SELECT
         v.vehicle_id, v.registration_number,
         COUNT(mr.maintenance_id) AS count,
         SUM(mr.cost) AS total_cost,
         SUM(CASE WHEN mr.maintenance_status = 'Completed' THEN 1 ELSE 0 END) AS completed
       FROM maintenance_records mr
       LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
       ${where}
       GROUP BY v.vehicle_id, v.registration_number
       ORDER BY count DESC`,
      params
    );

    // Get all records for trend calculation
    const [trendRecords] = await db.query(
      `SELECT
         mr.maintenance_id, mr.maintenance_date, mr.maintenance_type, 
         mr.cost, mr.maintenance_status
       FROM maintenance_records mr
       ${where}
       ORDER BY mr.maintenance_date ASC`,
      params
    );

    // Calculate trend: group by date, aggregate cost and count by status
    const grouped = groupBy(trendRecords, "maintenance_date");
    const trend = Object.entries(grouped)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, records]) => {
        const completed = records.filter(r => r.maintenance_status === "Completed").length;
        const totalCost = sumValues(records, "cost");
        return {
          date,
          count: records.length,
          completed,
          total_cost: parseFloat(totalCost.toFixed(2)),
          avg_cost_per_record: records.length > 0 ? parseFloat((totalCost / records.length).toFixed(2)) : 0
        };
      });

    // Calculate average days between maintenance for each vehicle
    let avgDaysBetweenMaintenance = 0;
    if (byVehicle.length > 0) {
      const daysDiffs = [];
      byVehicle.forEach(vehicle => {
        const vehicleRecords = trendRecords
          .filter(r => r.vehicle_id === vehicle.vehicle_id)
          .sort((a, b) => new Date(a.maintenance_date) - new Date(b.maintenance_date));
        
        if (vehicleRecords.length > 1) {
          for (let i = 1; i < vehicleRecords.length; i++) {
            const date1 = new Date(vehicleRecords[i].maintenance_date);
            const date2 = new Date(vehicleRecords[i - 1].maintenance_date);
            const days = Math.ceil((date1 - date2) / (1000 * 60 * 60 * 24));
            daysDiffs.push(days);
          }
        }
      });
      avgDaysBetweenMaintenance = daysDiffs.length > 0 
        ? parseFloat((daysDiffs.reduce((a, b) => a + b) / daysDiffs.length).toFixed(1))
        : 0;
    }

    return res.status(200).json({
      summary: {
        total_count: totalCount,
        completed_count: completedCount,
        scheduled_count: summary.scheduled_count || 0,
        in_progress_count: summary.in_progress_count || 0,
        total_cost: !summary.total_cost ? 0 : parseFloat(parseFloat(summary.total_cost).toFixed(2)),
        avg_cost: !summary.avg_cost ? 0 : parseFloat(parseFloat(summary.avg_cost).toFixed(2)),
        vehicles_serviced: summary.vehicles_serviced || 0,
        completion_rate: completionRate,
        avg_days_between_maintenance: avgDaysBetweenMaintenance,
        period: {
          start_date: summary.first_date,
          end_date: summary.last_date
        }
      },
      typeBreakdown,
      byVehicle: byVehicle.map(v => ({
        vehicle_id: v.vehicle_id,
        registration_number: v.registration_number,
        count: v.count,
        total_cost: !v.total_cost ? 0 : parseFloat(parseFloat(v.total_cost).toFixed(2)),
        completed: v.completed
      })),
      trend
    });
  } catch (error) {
    console.error("❌ getMaintenanceSummaryReport:", error);
    return res.status(500).json({ message: "Internal server error generating maintenance summary report." });
  }
};

// ─── EXPORT ───────────────────────────────────────────────────────────────────

async function fetchExportRows(reportType, query) {
  const { start_date, end_date, vehicle_id, depot_id, driver_id, route_id, status } = query;

  if (reportType === "fuel") {
    let where = "WHERE 1=1";
    const p = [];
    if (start_date) { where += " AND fr.fuel_date >= ?"; p.push(start_date); }
    if (end_date)   { where += " AND fr.fuel_date <= ?"; p.push(end_date); }
    if (vehicle_id) { where += " AND fr.vehicle_id = ?"; p.push(vehicle_id); }
    if (depot_id)   { where += " AND v.depot_id = ?";   p.push(depot_id); }
    const [rows] = await db.query(
      `SELECT DATE(fr.fuel_date) AS fuel_date, fr.fuel_time,
         v.registration_number AS vehicle, fr.fuel_type,
         fr.fuel_quantity, fr.fuel_cost, fr.fuel_efficiency, fr.odometer_reading
       FROM fuel_records fr
       LEFT JOIN vehicles v ON fr.vehicle_id = v.vehicle_id
       ${where} ORDER BY fr.fuel_date DESC`, p
    );
    return rows;
  }

  if (reportType === "routes") {
    let where = "WHERE 1=1";
    const p = [];
    if (start_date) { where += " AND t.trip_date >= ?"; p.push(start_date); }
    if (end_date)   { where += " AND t.trip_date <= ?"; p.push(end_date); }
    if (depot_id)   { where += " AND r.depot_id = ?";  p.push(depot_id); }
    if (route_id)   { where += " AND r.route_id = ?";  p.push(route_id); }
    const [rows] = await db.query(
      `SELECT r.route_code, r.route_name, r.start_location, r.end_location,
         r.total_distance, d.depot_name,
         COUNT(t.trip_id) AS total_trips,
         SUM(CASE WHEN t.trip_status='Completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN t.trip_status='Cancelled' THEN 1 ELSE 0 END) AS cancelled
       FROM routes r
       LEFT JOIN depots  d ON r.depot_id = d.depot_id
       LEFT JOIN schedules sch ON sch.route_id = r.route_id
       LEFT JOIN trips   t ON t.schedule_id = sch.schedule_id
       ${where}
       GROUP BY r.route_id, r.route_code, r.route_name, r.start_location, r.end_location,
                r.total_distance, d.depot_name
       ORDER BY total_trips DESC`, p
    );
    return rows;
  }

  if (reportType === "depots") {
    let where = depot_id ? "WHERE d.depot_id = ?" : "";
    const p = depot_id ? [depot_id] : [];
    const [rows] = await db.query(
      `SELECT d.depot_name, d.location, d.contact_person,
         COUNT(DISTINCT v.vehicle_id) AS total_vehicles,
         COUNT(DISTINCT dr.driver_id) AS total_drivers,
         COUNT(DISTINCT r.route_id)   AS total_routes
       FROM depots d
       LEFT JOIN vehicles v ON d.depot_id = v.depot_id
       LEFT JOIN drivers  dr ON d.depot_id = dr.depot_id
       LEFT JOIN routes   r  ON d.depot_id = r.depot_id
       ${where}
       GROUP BY d.depot_id, d.depot_name, d.location, d.contact_person
       ORDER BY d.depot_name`, p
    );
    return rows;
  }

  if (reportType === "schedules") {
    let where = "WHERE 1=1";
    const p = [];
    if (start_date) { where += " AND s.schedule_date >= ?"; p.push(start_date); }
    if (end_date)   { where += " AND s.schedule_date <= ?"; p.push(end_date); }
    if (depot_id)   { where += " AND s.depot_id = ?";       p.push(depot_id); }
    if (status)     { where += " AND s.status = ?";         p.push(status); }
    const [rows] = await db.query(
      `SELECT s.schedule_code, s.schedule_date, s.schedule_type,
         s.departure_time, s.expected_arrival_time, s.status,
         d.depot_name, r.route_name
       FROM schedules s
       LEFT JOIN depots d ON s.depot_id = d.depot_id
       LEFT JOIN routes r ON s.route_id = r.route_id
       ${where} ORDER BY s.schedule_date DESC, s.departure_time DESC`, p
    );
    return rows;
  }

  if (reportType === "driver_shifts") {
    let where = "WHERE 1=1";
    const p = [];
    if (start_date) { where += " AND t.trip_date >= ?";  p.push(start_date); }
    if (end_date)   { where += " AND t.trip_date <= ?";  p.push(end_date); }
    if (depot_id)   { where += " AND dr.depot_id = ?";   p.push(depot_id); }
    if (driver_id)  { where += " AND t.driver_id = ?";   p.push(driver_id); }
    const [rows] = await db.query(
      `SELECT CONCAT(dr.first_name,' ',dr.last_name) AS driver_name,
         dr.license_number, d.depot_name,
         DATE(t.trip_date) AS trip_date, r.route_name,
         t.trip_status, t.departure_time, t.arrival_time
       FROM trips t
       LEFT JOIN drivers dr ON t.driver_id = dr.driver_id
       LEFT JOIN depots  d  ON dr.depot_id = d.depot_id
       LEFT JOIN schedules sch ON t.schedule_id = sch.schedule_id
       LEFT JOIN routes  r  ON sch.route_id = r.route_id
       ${where} ORDER BY t.trip_date DESC`, p
    );
    return rows;
  }

  if (reportType === "maintenance") {
    let where = "WHERE 1=1";
    const p = [];
    if (start_date) { where += " AND mr.maintenance_date >= ?"; p.push(start_date); }
    if (end_date)   { where += " AND mr.maintenance_date <= ?"; p.push(end_date); }
    if (vehicle_id) { where += " AND mr.vehicle_id = ?";        p.push(vehicle_id); }
    if (depot_id)   { where += " AND v.depot_id = ?";           p.push(depot_id); }
    if (status)     { where += " AND mr.maintenance_status = ?"; p.push(status); }
    const [rows] = await db.query(
      `SELECT DATE(mr.maintenance_date) AS maintenance_date,
         v.registration_number AS vehicle, d.depot_name,
         mr.maintenance_type, mr.maintenance_status,
         mr.cost, mr.performed_by, mr.description
       FROM maintenance_records mr
       LEFT JOIN vehicles v ON mr.vehicle_id = v.vehicle_id
       LEFT JOIN depots   d ON v.depot_id    = d.depot_id
       ${where} ORDER BY mr.maintenance_date DESC`, p
    );
    return rows;
  }

  return [];
}

// GET /api/reports/export?reportType=fuel&format=csv&...
exports.exportReport = async (req, res) => {
  try {
    const { reportType, format } = req.query;
    const validTypes   = ["fuel", "routes", "depots", "schedules", "driver_shifts", "maintenance"];
    const validFormats = ["csv", "excel", "pdf"];

    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ message: `Invalid reportType. Must be one of: ${validTypes.join(", ")}` });
    }
    if (!validFormats.includes(format)) {
      return res.status(400).json({ message: `Invalid format. Must be one of: ${validFormats.join(", ")}` });
    }

    const rows     = await fetchExportRows(reportType, req.query);
    const filename = `${reportType}_report_${new Date().toISOString().split("T")[0]}`;
    const title    = reportType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      if (rows.length === 0) return res.send("No data available.\n");
      const headers = Object.keys(rows[0]);
      const lines   = [
        headers.join(","),
        ...rows.map(row => headers.map(h => {
          const v = row[h] == null ? "" : String(row[h]);
          return v.includes(",") || v.includes('"') || v.includes("\n")
            ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(","))
      ];
      return res.send(lines.join("\r\n"));
    }

    if (format === "excel") {
      const wb = XLSX.utils.book_new();
      const ws = rows.length > 0
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet([["No data available."]]);
      XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      return res.send(buffer);
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      doc.pipe(res);

      doc.fontSize(16).font("Helvetica-Bold")
        .text(`SRMSS — ${title} Report`, { align: "center" });
      doc.fontSize(9).font("Helvetica").fillColor("#666666")
        .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(1.2);

      if (rows.length === 0) {
        doc.fontSize(11).fillColor("#333333").text("No data available for the selected filters.");
        doc.end(); return;
      }

      const headers   = Object.keys(rows[0]);
      const pageWidth = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
      const colWidth  = Math.floor(pageWidth / headers.length);
      const rowHeight = 18;

      let x = doc.page.margins.left;
      const headerY = doc.y;
      doc.rect(x, headerY, pageWidth, rowHeight).fill("#1a1a2e");
      headers.forEach(h => {
        doc.fontSize(7).font("Helvetica-Bold").fillColor("#f5c542")
          .text(h.replace(/_/g, " ").toUpperCase(), x + 3, headerY + 5, { width: colWidth - 6, lineBreak: false });
        x += colWidth;
      });
      doc.y = headerY + rowHeight + 2;

      rows.forEach((row, i) => {
        if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
        const rowY = doc.y;
        doc.rect(doc.page.margins.left, rowY, pageWidth, rowHeight).fill(i % 2 === 0 ? "#f9f9f9" : "#ffffff");
        let cx = doc.page.margins.left;
        headers.forEach(h => {
          doc.fontSize(7).font("Helvetica").fillColor("#222222")
            .text(row[h] == null ? "" : String(row[h]), cx + 3, rowY + 5, { width: colWidth - 6, lineBreak: false });
          cx += colWidth;
        });
        doc.y = rowY + rowHeight;
      });

      doc.moveDown(1);
      doc.fontSize(8).fillColor("#999999").text(`Total records: ${rows.length}`, { align: "right" });
      doc.end(); return;
    }
  } catch (error) {
    console.error("❌ exportReport:", error);
    if (!res.headersSent) return res.status(500).json({ message: "Internal server error exporting report." });
  }
};
