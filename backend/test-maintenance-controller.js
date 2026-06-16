/**
 * Test Suite: maintenanceController.js
 * Tests all CRUD operations, status workflow enforcement, and error handling
 */

const db = require("./src/config/db");

// Mock request/response objects
class MockRequest {
  constructor(body = {}, params = {}, query = {}) {
    this.body = body;
    this.params = params;
    this.query = query;
  }
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.data = null;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.data = data;
    return this;
  }

  get status() {
    return this.statusCode;
  }
}

const maintenanceController = require("./src/controllers/maintenanceController");

// Test data
const testVehicleId = 1; // Assuming vehicle_id 1 exists
const validMaintenanceData = {
  vehicle_id: testVehicleId,
  maintenance_type: "Oil Change",
  maintenance_date: "2024-01-20",
  maintenance_time: "09:00:00",
  description: "Scheduled oil change",
  cost: 500.00,
  performed_by: "John Doe",
  maintenance_status: "Scheduled",
  next_maintenance_date: "2024-04-20"
};

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTests() {
  console.log("🧪 Starting maintenanceController Tests...\n");

  let testsPassed = 0;
  let testsFailed = 0;
  let createdMaintenanceId = null;

  try {
    // Test 1: Create maintenance record
    console.log("Test 1: Create Maintenance Record");
    try {
      const req = new MockRequest(validMaintenanceData);
      const res = new MockResponse();
      await maintenanceController.createMaintenanceRecord(req, res);

      if (res.statusCode === 201 && res.data.maintenanceId) {
        console.log("✅ PASS: Record created successfully");
        testsPassed++;
        createdMaintenanceId = res.data.maintenanceId;
      } else {
        console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
        testsFailed++;
      }
    } catch (error) {
      console.log("❌ FAIL:", error.message);
      testsFailed++;
    }

    // Test 2: Get all maintenance records
    console.log("\nTest 2: Get All Maintenance Records");
    try {
      const req = new MockRequest({}, {}, { page: 1, limit: 50 });
      const res = new MockResponse();
      await maintenanceController.getAllMaintenanceRecords(req, res);

      if (res.statusCode === 200 && Array.isArray(res.data.data)) {
        console.log("✅ PASS: Retrieved maintenance records");
        testsPassed++;
      } else {
        console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
        testsFailed++;
      }
    } catch (error) {
      console.log("❌ FAIL:", error.message);
      testsFailed++;
    }

    // Test 3: Get maintenance record by ID
    if (createdMaintenanceId) {
      console.log("\nTest 3: Get Maintenance Record by ID");
      try {
        const req = new MockRequest({}, { maintenance_id: createdMaintenanceId });
        const res = new MockResponse();
        await maintenanceController.getMaintenanceRecordById(req, res);

        if (res.statusCode === 200 && res.data.maintenance_id === createdMaintenanceId) {
          console.log("✅ PASS: Retrieved specific record");
          testsPassed++;
        } else {
          console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
          testsFailed++;
        }
      } catch (error) {
        console.log("❌ FAIL:", error.message);
        testsFailed++;
      }

      // Test 4: Update maintenance record - Valid transition (Scheduled to In Progress)
      console.log("\nTest 4: Update Status - Valid Transition (Scheduled → In Progress)");
      try {
        const req = new MockRequest(
          { maintenance_status: "In Progress" },
          { maintenance_id: createdMaintenanceId }
        );
        const res = new MockResponse();
        await maintenanceController.updateMaintenanceRecord(req, res);

        if (res.statusCode === 200 && res.data.newStatus === "In Progress") {
          console.log("✅ PASS: Status updated successfully");
          testsPassed++;
        } else {
          console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
          testsFailed++;
        }
      } catch (error) {
        console.log("❌ FAIL:", error.message);
        testsFailed++;
      }

      // Test 5: Update maintenance record - Valid transition (In Progress to Completed)
      console.log("\nTest 5: Update Status - Valid Transition (In Progress → Completed)");
      try {
        const req = new MockRequest(
          { 
            maintenance_status: "Completed",
            next_maintenance_date: "2024-07-20"
          },
          { maintenance_id: createdMaintenanceId }
        );
        const res = new MockResponse();
        await maintenanceController.updateMaintenanceRecord(req, res);

        if (res.statusCode === 200 && res.data.newStatus === "Completed") {
          console.log("✅ PASS: Status transitioned to Completed");
          testsPassed++;
        } else {
          console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
          testsFailed++;
        }
      } catch (error) {
        console.log("❌ FAIL:", error.message);
        testsFailed++;
      }

      // Test 6: Try invalid transition (Completed back to Scheduled - should fail)
      console.log("\nTest 6: Invalid Transition (Completed → Scheduled) - Should Fail");
      try {
        const req = new MockRequest(
          { maintenance_status: "Scheduled" },
          { maintenance_id: createdMaintenanceId }
        );
        const res = new MockResponse();
        await maintenanceController.updateMaintenanceRecord(req, res);

        if (res.statusCode === 400 && res.data.error === "Invalid status transition") {
          console.log("✅ PASS: Invalid transition rejected");
          testsPassed++;
        } else {
          console.log(`❌ FAIL: Should reject invalid transition. Status ${res.statusCode}, Data:`, res.data);
          testsFailed++;
        }
      } catch (error) {
        console.log("❌ FAIL:", error.message);
        testsFailed++;
      }

      // Test 7: Update with invalid maintenance_type
      console.log("\nTest 7: Validation - Invalid Maintenance Type");
      try {
        const req = new MockRequest(
          { maintenance_type: "InvalidType" },
          { maintenance_id: createdMaintenanceId }
        );
        const res = new MockResponse();
        await maintenanceController.updateMaintenanceRecord(req, res);

        if (res.statusCode === 400 && res.data.error === "Validation failed") {
          console.log("✅ PASS: Invalid maintenance_type rejected");
          testsPassed++;
        } else {
          console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
          testsFailed++;
        }
      } catch (error) {
        console.log("❌ FAIL:", error.message);
        testsFailed++;
      }

      // Test 8: Update with negative cost
      console.log("\nTest 8: Validation - Negative Cost");
      try {
        const req = new MockRequest(
          { cost: -100 },
          { maintenance_id: createdMaintenanceId }
        );
        const res = new MockResponse();
        await maintenanceController.updateMaintenanceRecord(req, res);

        if (res.statusCode === 400 && res.data.error === "Validation failed") {
          console.log("✅ PASS: Negative cost rejected");
          testsPassed++;
        } else {
          console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
          testsFailed++;
        }
      } catch (error) {
        console.log("❌ FAIL:", error.message);
        testsFailed++;
      }

      // Test 9: Delete maintenance record
      console.log("\nTest 9: Delete Maintenance Record");
      try {
        const req = new MockRequest({}, { maintenance_id: createdMaintenanceId });
        const res = new MockResponse();
        await maintenanceController.deleteMaintenanceRecord(req, res);

        if (res.statusCode === 200 && res.data.message.includes("deleted")) {
          console.log("✅ PASS: Record deleted successfully");
          testsPassed++;
        } else {
          console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
          testsFailed++;
        }
      } catch (error) {
        console.log("❌ FAIL:", error.message);
        testsFailed++;
      }

      // Test 10: Get deleted record (should return 404)
      console.log("\nTest 10: Get Deleted Record - Should Return 404");
      try {
        const req = new MockRequest({}, { maintenance_id: createdMaintenanceId });
        const res = new MockResponse();
        await maintenanceController.getMaintenanceRecordById(req, res);

        if (res.statusCode === 404) {
          console.log("✅ PASS: 404 returned for deleted record");
          testsPassed++;
        } else {
          console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
          testsFailed++;
        }
      } catch (error) {
        console.log("❌ FAIL:", error.message);
        testsFailed++;
      }
    }

    // Test 11: Create with missing required field
    console.log("\nTest 11: Validation - Missing Required Field");
    try {
      const incompleteData = { ...validMaintenanceData };
      delete incompleteData.maintenance_type;
      
      const req = new MockRequest(incompleteData);
      const res = new MockResponse();
      await maintenanceController.createMaintenanceRecord(req, res);

      if (res.statusCode === 400 && res.data.error === "Validation failed") {
        console.log("✅ PASS: Missing field validation works");
        testsPassed++;
      } else {
        console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
        testsFailed++;
      }
    } catch (error) {
      console.log("❌ FAIL:", error.message);
      testsFailed++;
    }

    // Test 12: Create with invalid vehicle_id
    console.log("\nTest 12: Validation - Non-existent Vehicle");
    try {
      const invalidData = { ...validMaintenanceData, vehicle_id: 99999 };
      const req = new MockRequest(invalidData);
      const res = new MockResponse();
      await maintenanceController.createMaintenanceRecord(req, res);

      if (res.statusCode === 404 && res.data.error === "Vehicle not found") {
        console.log("✅ PASS: Non-existent vehicle validation works");
        testsPassed++;
      } else {
        console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
        testsFailed++;
      }
    } catch (error) {
      console.log("❌ FAIL:", error.message);
      testsFailed++;
    }

    // Test 13: Filter records by status
    console.log("\nTest 13: Filter Records by Status");
    try {
      const req = new MockRequest(
        {},
        {},
        { maintenance_status: "Scheduled", page: 1, limit: 50 }
      );
      const res = new MockResponse();
      await maintenanceController.getAllMaintenanceRecords(req, res);

      if (res.statusCode === 200 && Array.isArray(res.data.data)) {
        const allCompleted = res.data.data.every(r => r.maintenance_status === "Scheduled");
        if (allCompleted) {
          console.log("✅ PASS: Status filter works correctly");
          testsPassed++;
        } else {
          console.log("❌ FAIL: Filter returned records with different statuses");
          testsFailed++;
        }
      } else {
        console.log(`❌ FAIL: Status ${res.statusCode}, Data:`, res.data);
        testsFailed++;
      }
    } catch (error) {
      console.log("❌ FAIL:", error.message);
      testsFailed++;
    }

  } catch (error) {
    console.error("Fatal test error:", error);
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log(`📊 Test Summary: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("=".repeat(60));

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

