/**
 * Unit Tests for alertController.js
 * Tests alert generation, filtering, and resolution workflows
 */

const db = require("../src/config/db");
const alertController = require("../src/controllers/alertController");

// Helper to mock request/response objects
function createMockReq(data = {}) {
  return {
    body: data.body || {},
    params: data.params || {},
    query: data.query || {}
  };
}

function createMockRes() {
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = data;
      return this;
    },
    statusCode: 200,
    body: {}
  };
  return res;
}

// Test Suite
async function runTests() {
  console.log("\n=== Alert Controller Tests ===\n");

  try {
    // Test 1: Verify vehicle exists in database
    console.log("Test 1: Checking for test vehicle...");
    const [vehicles] = await db.query("SELECT vehicle_id, registration_number FROM vehicles LIMIT 1");
    if (vehicles.length === 0) {
      console.log("⚠️  No vehicles found in database. Skipping vehicle-dependent tests.");
      process.exit(0);
    }
    const testVehicleId = vehicles[0].vehicle_id;
    console.log(`✓ Found test vehicle: ID=${testVehicleId}, Reg=${vehicles[0].registration_number}\n`);

    // Test 2: getAllAlerts with default unresolved filter
    console.log("Test 2: Testing getAllAlerts (default unresolved)...");
    const req2 = createMockReq({ query: {} });
    const res2 = createMockRes();
    await alertController.getAllAlerts(req2, res2);
    if (res2.statusCode === 200 && Array.isArray(res2.body.data)) {
      console.log(`✓ getAllAlerts returned ${res2.body.total} alerts\n`);
    } else {
      console.log(`✗ Unexpected response: ${res2.statusCode}\n`);
    }

    // Test 3: getAllAlerts with vehicle filter
    console.log(`Test 3: Testing getAllAlerts with vehicle_id filter (vehicle=${testVehicleId})...`);
    const req3 = createMockReq({ query: { vehicle_id: testVehicleId } });
    const res3 = createMockRes();
    await alertController.getAllAlerts(req3, res3);
    if (res3.statusCode === 200 && Array.isArray(res3.body.data)) {
      console.log(`✓ Filtered alerts for vehicle: ${res3.body.total} results\n`);
    } else {
      console.log(`✗ Unexpected response: ${res3.statusCode}\n`);
    }

    // Test 4: getAlertsByVehicle
    console.log(`Test 4: Testing getAlertsByVehicle (vehicle=${testVehicleId})...`);
    const req4 = createMockReq({ params: { vehicle_id: testVehicleId } });
    const res4 = createMockRes();
    await alertController.getAlertsByVehicle(req4, res4);
    if (res4.statusCode === 200 && Array.isArray(res4.body.data)) {
      console.log(`✓ getAlertsByVehicle returned ${res4.body.total} alerts for vehicle\n`);
    } else {
      console.log(`✗ Unexpected response: ${res4.statusCode}\n`);
    }

    // Test 5: getAlertsByVehicle without vehicle_id (should fail)
    console.log("Test 5: Testing getAlertsByVehicle without vehicle_id (should fail)...");
    const req5 = createMockReq({ params: {} });
    const res5 = createMockRes();
    await alertController.getAlertsByVehicle(req5, res5);
    if (res5.statusCode === 400) {
      console.log(`✓ Correctly rejected request without vehicle_id\n`);
    } else {
      console.log(`✗ Expected 400, got ${res5.statusCode}\n`);
    }

    // Test 6: createAlert with all fields
    console.log(`Test 6: Testing createAlert (vehicle=${testVehicleId})...`);
    const req6 = createMockReq({
      body: {
        vehicle_id: testVehicleId,
        alert_type: "Scheduled Maintenance Due",
        alert_message: "Test alert for maintenance"
      }
    });
    const res6 = createMockRes();
    await alertController.createAlert(req6, res6);
    if (res6.statusCode === 201 && res6.body.alertId) {
      const createdAlertId = res6.body.alertId;
      console.log(`✓ Alert created successfully with ID: ${createdAlertId}\n`);

      // Test 7: updateAlertStatus (mark as resolved)
      console.log(`Test 7: Testing updateAlertStatus (alert=${createdAlertId}, resolve=true)...`);
      const req7 = createMockReq({
        params: { alert_id: createdAlertId },
        body: { is_resolved: true }
      });
      const res7 = createMockRes();
      await alertController.updateAlertStatus(req7, res7);
      if (res7.statusCode === 200) {
        console.log(`✓ Alert marked as resolved\n`);
      } else {
        console.log(`✗ Unexpected response: ${res7.statusCode}\n`);
      }

      // Test 8: updateAlertStatus (mark as unresolved)
      console.log(`Test 8: Testing updateAlertStatus (alert=${createdAlertId}, resolve=false)...`);
      const req8 = createMockReq({
        params: { alert_id: createdAlertId },
        body: { is_resolved: false }
      });
      const res8 = createMockRes();
      await alertController.updateAlertStatus(req8, res8);
      if (res8.statusCode === 200) {
        console.log(`✓ Alert marked as unresolved\n`);
      } else {
        console.log(`✗ Unexpected response: ${res8.statusCode}\n`);
      }

      // Test 9: Verify alert in database
      console.log(`Test 9: Verifying alert in database...`);
      const [alert] = await db.query(
        "SELECT * FROM maintenance_alerts WHERE alert_id = ?",
        [createdAlertId]
      );
      if (alert.length > 0) {
        console.log(`✓ Alert found in database`);
        console.log(`  - Type: ${alert[0].alert_type}`);
        console.log(`  - Message: ${alert[0].alert_message}`);
        console.log(`  - Resolved: ${alert[0].is_resolved}\n`);
      } else {
        console.log(`✗ Alert not found in database\n`);
      }
    } else {
      console.log(`✗ Failed to create alert. Status: ${res6.statusCode}\n`);
    }

    // Test 10: createAlert with auto-formatted message
    console.log(`Test 10: Testing createAlert with auto-formatted message...`);
    const req10 = createMockReq({
      body: {
        vehicle_id: testVehicleId,
        alert_type: "Fuel Efficiency Warning"
      }
    });
    const res10 = createMockRes();
    await alertController.createAlert(req10, res10);
    if (res10.statusCode === 201) {
      console.log(`✓ Alert created with auto-formatted message\n`);
    } else {
      console.log(`✗ Failed to create alert: ${res10.statusCode}\n`);
    }

    // Test 11: getAllAlerts with is_resolved filter
    console.log("Test 11: Testing getAllAlerts with is_resolved=false filter...");
    const req11 = createMockReq({ query: { is_resolved: "false" } });
    const res11 = createMockRes();
    await alertController.getAllAlerts(req11, res11);
    if (res11.statusCode === 200) {
      const unresolvedCount = res11.body.data.filter(a => !a.is_resolved).length;
      console.log(`✓ Retrieved ${unresolvedCount} unresolved alerts\n`);
    } else {
      console.log(`✗ Unexpected response: ${res11.statusCode}\n`);
    }

    // Test 12: getAllAlerts with alert_type filter
    console.log("Test 12: Testing getAllAlerts with alert_type filter...");
    const req12 = createMockReq({ query: { alert_type: "Scheduled Maintenance Due" } });
    const res12 = createMockRes();
    await alertController.getAllAlerts(req12, res12);
    if (res12.statusCode === 200) {
      console.log(`✓ Retrieved ${res12.body.total} alerts of type 'Scheduled Maintenance Due'\n`);
    } else {
      console.log(`✗ Unexpected response: ${res12.statusCode}\n`);
    }

    // Test 13: createAlert without vehicle_id (should fail)
    console.log("Test 13: Testing createAlert without vehicle_id (should fail)...");
    const req13 = createMockReq({
      body: {
        alert_type: "Test Alert"
      }
    });
    const res13 = createMockRes();
    await alertController.createAlert(req13, res13);
    if (res13.statusCode === 400) {
      console.log(`✓ Correctly rejected alert without vehicle_id\n`);
    } else {
      console.log(`✗ Expected 400, got ${res13.statusCode}\n`);
    }

    // Test 14: updateAlertStatus on non-existent alert (should fail)
    console.log("Test 14: Testing updateAlertStatus on non-existent alert (should fail)...");
    const req14 = createMockReq({
      params: { alert_id: 999999 },
      body: { is_resolved: true }
    });
    const res14 = createMockRes();
    await alertController.updateAlertStatus(req14, res14);
    if (res14.statusCode === 404) {
      console.log(`✓ Correctly returned 404 for non-existent alert\n`);
    } else {
      console.log(`✗ Expected 404, got ${res14.statusCode}\n`);
    }

    console.log("=== All Tests Completed ===\n");
  } catch (error) {
    console.error("❌ Test Error:", error.message);
  } finally {
    process.exit(0);
  }
}

// Run tests
runTests();
