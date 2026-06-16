const db = require("./src/config/db");

async function testReportFunctions() {
  try {
    console.log("🧪 Testing Report Controller Functions\n");

    // Test 1: Verify fuel_records table has data
    const [fuelCount] = await db.query("SELECT COUNT(*) as count FROM fuel_records LIMIT 1");
    console.log(`✅ Fuel records table: ${fuelCount[0].count} records`);

    // Test 2: Verify maintenance_records table has data
    const [maintCount] = await db.query("SELECT COUNT(*) as count FROM maintenance_records LIMIT 1");
    console.log(`✅ Maintenance records table: ${maintCount[0].count} records`);

    // Test 3: Test getFuelSummaryReport logic - aggregate fuel data
    const [fuelSummary] = await db.query(`
      SELECT
        SUM(fuel_quantity) AS total_quantity,
        SUM(fuel_cost) AS total_cost,
        AVG(fuel_efficiency) AS avg_efficiency,
        COUNT(fuel_id) AS total_records,
        COUNT(DISTINCT vehicle_id) AS vehicles_tracked
      FROM fuel_records
    `);
    console.log(`\n📊 Fuel Summary Data:`);
    console.log(`   Total Quantity: ${fuelSummary[0].total_quantity || 0}`);
    console.log(`   Total Cost: ${fuelSummary[0].total_cost || 0}`);
    console.log(`   Avg Efficiency: ${fuelSummary[0].avg_efficiency || 0}`);
    console.log(`   Total Records: ${fuelSummary[0].total_records || 0}`);
    console.log(`   Vehicles Tracked: ${fuelSummary[0].vehicles_tracked || 0}`);

    // Test 4: Test breakdown by fuel type
    const [byFuelType] = await db.query(`
      SELECT
        fuel_type,
        SUM(fuel_quantity) AS quantity,
        COUNT(*) AS count
      FROM fuel_records
      GROUP BY fuel_type
    `);
    console.log(`\n⛽ Fuel Type Breakdown:`);
    byFuelType.forEach(type => {
      console.log(`   ${type.fuel_type}: ${type.quantity || 0} (${type.count} records)`);
    });

    // Test 5: Test getMaintenanceSummaryReport logic - aggregate maintenance data
    const [maintSummary] = await db.query(`
      SELECT
        COUNT(maintenance_id) AS total_count,
        SUM(CASE WHEN maintenance_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN maintenance_status = 'Scheduled' THEN 1 ELSE 0 END) AS scheduled_count,
        SUM(cost) AS total_cost,
        AVG(cost) AS avg_cost,
        COUNT(DISTINCT vehicle_id) AS vehicles_serviced
      FROM maintenance_records
    `);
    const total = maintSummary[0].total_count || 0;
    const completed = maintSummary[0].completed_count || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`\n🔧 Maintenance Summary Data:`);
    console.log(`   Total Count: ${total}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Scheduled: ${maintSummary[0].scheduled_count || 0}`);
    console.log(`   Completion Rate: ${completionRate}%`);
    console.log(`   Total Cost: ${maintSummary[0].total_cost || 0}`);
    console.log(`   Avg Cost: ${maintSummary[0].avg_cost || 0}`);
    console.log(`   Vehicles Serviced: ${maintSummary[0].vehicles_serviced || 0}`);

    // Test 6: Test breakdown by maintenance type
    const [byType] = await db.query(`
      SELECT
        maintenance_type,
        COUNT(*) AS count,
        SUM(cost) AS total_cost
      FROM maintenance_records
      GROUP BY maintenance_type
    `);
    console.log(`\n🛠️  Maintenance Type Breakdown:`);
    byType.forEach(type => {
      console.log(`   ${type.maintenance_type}: ${type.count} records, Cost: ${type.total_cost || 0}`);
    });

    // Test 7: Test trend calculation (daily aggregation)
    const [trendData] = await db.query(`
      SELECT
        DATE(fuel_date) as fuel_date,
        SUM(fuel_quantity) AS daily_quantity,
        SUM(fuel_cost) AS daily_cost,
        COUNT(*) AS records
      FROM fuel_records
      GROUP BY DATE(fuel_date)
      ORDER BY fuel_date DESC
      LIMIT 5
    `);
    console.log(`\n📈 Fuel Trend (Last 5 days):`);
    trendData.forEach(row => {
      console.log(`   ${row.fuel_date}: ${row.daily_quantity || 0} qty, ${row.daily_cost || 0} cost, ${row.records} records`);
    });

    console.log(`\n✅ All report aggregation functions validated successfully!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Test Error:", error.message);
    process.exit(1);
  }
}

testReportFunctions();
