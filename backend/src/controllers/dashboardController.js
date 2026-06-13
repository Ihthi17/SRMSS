const db = require("../config/db");

exports.getStats = async (req, res) => {
  try {
    let userCount = [{ count: 0 }];
    let depotCount = [{ count: 0 }];
    let routeCount = [{ count: 0 }];
    let busCount = [{ count: 0 }];
    let driverCount = [{ count: 0 }]; // 🌟 1. Added explicit initialization

    // 1. Test Users table
    try {
      [userCount] = await db.query("SELECT COUNT(*) as count FROM users");
    } catch (e) {
      console.error("⚠️ Dashboard Warning: 'users' query failed. Does the table exist?", e.message);
    }

    // 2. Test Depots table
    try {
      [depotCount] = await db.query("SELECT COUNT(*) as count FROM depots");
    } catch (e) {
      console.error("⚠️ Dashboard Warning: 'depots' query failed. Does the table exist?", e.message);
    }

    // 3. Test Routes table
    try {
      [routeCount] = await db.query("SELECT COUNT(*) as count FROM routes");
    } catch (e) {
      console.error("⚠️ Dashboard Warning: 'routes' query failed. Does the table exist?", e.message);
    }

    // 4. Test Buses table (Safe check for missing is_active column)
    try {
      [busCount] = await db.query("SELECT COUNT(*) as count FROM buses");
    } catch (e) {
      console.error("⚠️ Dashboard Warning: 'buses' query failed. Does the table exist?", e.message);
    }

    // 5. Test Drivers table
    try {
      [driverCount] = await db.query("SELECT COUNT(*) as count FROM drivers");
    } catch (e) {
      console.error("⚠️ Dashboard Warning: 'drivers' query failed. Does the table exist?", e.message); // Fixed typo in console log text
    }

    // 🌟 2. Return the parsed payload with totalDrivers included
    return res.status(200).json({
      totalUsers: userCount[0]?.count || 0,
      totalDepots: depotCount[0]?.count || 0,
      totalRoutes: routeCount[0]?.count || 0,
      totalBuses: busCount[0]?.count || 0,
      totalDrivers: driverCount[0]?.count || 0 // 🌟 Added payload delivery key
    });
    
  } catch (error) {
    console.error("❌ Fatal Dashboard Controller Failure:", error);
    return res.status(500).json({ message: "Internal metrics tracking engine error" });
  }
};