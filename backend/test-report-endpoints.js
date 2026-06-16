const db = require("./src/config/db");
const reportController = require("./src/controllers/reportController");

// Mock request and response objects
class MockReq {
  constructor(query = {}) {
    this.query = query;
    this.params = {};
  }
}

class MockRes {
  constructor() {
    this.statusCode = 200;
    this.jsonData = null;
  }
  status(code) {
    this.statusCode = code;
    return this;
  }
  json(data) {
    this.jsonData = data;
    return this;
  }
}

async function testEndpoints() {
  try {
    console.log("🧪 Testing Report Endpoints\n");

    // Test 1: getFuelSummaryReport without filters
    console.log("Test 1: getFuelSummaryReport (no filters)");
    const req1 = new MockReq({});
    const res1 = new MockRes();
    await reportController.getFuelSummaryReport(req1, res1);
    
    if (res1.statusCode === 200 && res1.jsonData) {
      console.log(`✅ Response Status: ${res1.statusCode}`);
      console.log(`   - Summary Keys: ${Object.keys(res1.jsonData.summary).join(", ")}`);
      console.log(`   - Has fuelTypeBreakdown: ${!!res1.jsonData.fuelTypeBreakdown}`);
      console.log(`   - Has byVehicle: ${!!res1.jsonData.byVehicle}`);
      console.log(`   - Has trend: ${!!res1.jsonData.trend}`);
      console.log(`   - Total Quantity: ${res1.jsonData.summary.total_quantity}`);
      console.log(`   - Total Cost: ${res1.jsonData.summary.total_cost}`);
    } else {
      console.log(`❌ Unexpected response: ${res1.statusCode}`);
    }

    // Test 2: getFuelSummaryReport with vehicle_id filter
    console.log("\nTest 2: getFuelSummaryReport (with vehicle_id=1)");
    const req2 = new MockReq({ vehicle_id: 1 });
    const res2 = new MockRes();
    await reportController.getFuelSummaryReport(req2, res2);
    
    if (res2.statusCode === 200 && res2.jsonData) {
      console.log(`✅ Response Status: ${res2.statusCode}`);
      console.log(`   - Total Records: ${res2.jsonData.summary.total_records}`);
      console.log(`   - Vehicles Tracked: ${res2.jsonData.summary.vehicles_tracked}`);
    } else {
      console.log(`❌ Unexpected response: ${res2.statusCode}`);
    }

    // Test 3: getFuelSummaryReport with weekly aggregation
    console.log("\nTest 3: getFuelSummaryReport (aggregation=weekly)");
    const req3 = new MockReq({ aggregation: "weekly" });
    const res3 = new MockRes();
    await reportController.getFuelSummaryReport(req3, res3);
    
    if (res3.statusCode === 200 && res3.jsonData) {
      console.log(`✅ Response Status: ${res3.statusCode}`);
      console.log(`   - Trend Length: ${res3.jsonData.trend.length}`);
      if (res3.jsonData.trend.length > 0) {
        console.log(`   - First Trend Date: ${res3.jsonData.trend[0].date}`);
      }
    } else {
      console.log(`❌ Unexpected response: ${res3.statusCode}`);
    }

    // Test 4: getMaintenanceSummaryReport without filters
    console.log("\nTest 4: getMaintenanceSummaryReport (no filters)");
    const req4 = new MockReq({});
    const res4 = new MockRes();
    await reportController.getMaintenanceSummaryReport(req4, res4);
    
    if (res4.statusCode === 200 && res4.jsonData) {
      console.log(`✅ Response Status: ${res4.statusCode}`);
      console.log(`   - Summary Keys: ${Object.keys(res4.jsonData.summary).join(", ")}`);
      console.log(`   - Has typeBreakdown: ${!!res4.jsonData.typeBreakdown}`);
      console.log(`   - Has byVehicle: ${!!res4.jsonData.byVehicle}`);
      console.log(`   - Has trend: ${!!res4.jsonData.trend}`);
      console.log(`   - Total Count: ${res4.jsonData.summary.total_count}`);
      console.log(`   - Completion Rate: ${res4.jsonData.summary.completion_rate}%`);
    } else {
      console.log(`❌ Unexpected response: ${res4.statusCode}`);
    }

    // Test 5: getMaintenanceSummaryReport with vehicle_id filter
    console.log("\nTest 5: getMaintenanceSummaryReport (with vehicle_id=1)");
    const req5 = new MockReq({ vehicle_id: 1 });
    const res5 = new MockRes();
    await reportController.getMaintenanceSummaryReport(req5, res5);
    
    if (res5.statusCode === 200 && res5.jsonData) {
      console.log(`✅ Response Status: ${res5.statusCode}`);
      console.log(`   - Total Count: ${res5.jsonData.summary.total_count}`);
      console.log(`   - Vehicles Serviced: ${res5.jsonData.summary.vehicles_serviced}`);
    } else {
      console.log(`❌ Unexpected response: ${res5.statusCode}`);
    }

    // Test 6: getMaintenanceSummaryReport with date range
    console.log("\nTest 6: getMaintenanceSummaryReport (with date range)");
    const req6 = new MockReq({ start_date: "2026-01-01", end_date: "2026-12-31" });
    const res6 = new MockRes();
    await reportController.getMaintenanceSummaryReport(req6, res6);
    
    if (res6.statusCode === 200 && res6.jsonData) {
      console.log(`✅ Response Status: ${res6.statusCode}`);
      console.log(`   - Period Start: ${res6.jsonData.summary.period.start_date}`);
      console.log(`   - Period End: ${res6.jsonData.summary.period.end_date}`);
    } else {
      console.log(`❌ Unexpected response: ${res6.statusCode}`);
    }

    console.log("\n✅ All endpoint tests completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEndpoints();
