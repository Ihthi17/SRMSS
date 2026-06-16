/**
 * Verification: maintenanceController.js Implementation
 * This script verifies the maintenanceController has all required functions
 */

const fs = require("fs");
const path = require("path");

const maintenanceControllerPath = path.join(__dirname, "src/controllers/maintenanceController.js");
const content = fs.readFileSync(maintenanceControllerPath, 'utf8');

console.log("🔍 Verification: maintenanceController.js\n");

const checks = [
  {
    name: "createMaintenanceRecord function exported",
    check: /exports\.createMaintenanceRecord\s*=\s*async/,
    required: true
  },
  {
    name: "getAllMaintenanceRecords function exported",
    check: /exports\.getAllMaintenanceRecords\s*=\s*async/,
    required: true
  },
  {
    name: "getMaintenanceRecordById function exported",
    check: /exports\.getMaintenanceRecordById\s*=\s*async/,
    required: true
  },
  {
    name: "updateMaintenanceRecord function exported",
    check: /exports\.updateMaintenanceRecord\s*=\s*async/,
    required: true
  },
  {
    name: "deleteMaintenanceRecord function exported",
    check: /exports\.deleteMaintenanceRecord\s*=\s*async/,
    required: true
  },
  {
    name: "STATUS_TRANSITIONS defined",
    check: /const STATUS_TRANSITIONS\s*=\s*{/,
    required: true
  },
  {
    name: "isValidTransition function defined",
    check: /function isValidTransition\s*\(/,
    required: true
  },
  {
    name: "getTransitionErrorMessage function defined",
    check: /function getTransitionErrorMessage\s*\(/,
    required: true
  },
  {
    name: "validateMaintenanceData function defined",
    check: /function validateMaintenanceData\s*\(/,
    required: true
  },
  {
    name: "isValidDateFormat function defined",
    check: /function isValidDateFormat\s*\(/,
    required: true
  },
  {
    name: "isValidTimeFormat function defined",
    check: /function isValidTimeFormat\s*\(/,
    required: true
  },
  {
    name: "maintenance_type enum validation",
    check: /VALID_MAINTENANCE_TYPES/,
    required: true
  },
  {
    name: "maintenance_status enum validation",
    check: /VALID_STATUSES/,
    required: true
  },
  {
    name: "Vehicle existence validation",
    check: /SELECT vehicle_id FROM vehicles WHERE vehicle_id/,
    required: true
  },
  {
    name: "Transaction handling with beginTransaction",
    check: /await connection\.beginTransaction\(\)/,
    required: true
  },
  {
    name: "Transaction rollback on error",
    check: /await connection\.rollback\(\)/,
    required: true
  },
  {
    name: "Alert generation for Completed status",
    check: /INSERT INTO maintenance_alerts.*Corrective Maintenance Completed/s,
    required: true
  },
  {
    name: "400 error for validation failures",
    check: /res\.status\(400\).*error.*Validation failed/s,
    required: true
  },
  {
    name: "404 error for record not found",
    check: /Maintenance record not found/,
    required: true
  },
  {
    name: "Clear error messages for invalid transitions",
    check: /getTransitionErrorMessage/,
    required: true
  },
  {
    name: "Cascade delete of related alerts",
    check: /DELETE FROM maintenance_alerts.*WHERE vehicle_id.*AND alert_message/s,
    required: true
  },
  {
    name: "Maintenance record filters (vehicle_id, status, type, date range)",
    check: /AND mr\.vehicle_id|AND mr\.maintenance_status|AND mr\.maintenance_type|AND mr\.maintenance_date/,
    required: true
  },
  {
    name: "Sorting by maintenance_date and time",
    check: /ORDER BY mr\.maintenance_date DESC, mr\.maintenance_time DESC/,
    required: true
  },
  {
    name: "Pagination support (limit, offset)",
    check: /LIMIT.*OFFSET|parseInt\(limit\).*parseInt\(page\)/,
    required: true
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const matches = check.check.test(content);
  const status = matches ? "✅" : "❌";
  const result = matches ? "PASS" : "FAIL";
  
  console.log(`${status} ${check.name} [${result}]`);
  
  if (matches) {
    passed++;
  } else if (check.required) {
    failed++;
  }
});

console.log("\n" + "=".repeat(70));
console.log(`📊 Verification Summary: ${passed} checks passed, ${failed} checks failed`);
console.log("=".repeat(70));

// Detailed code review
console.log("\n📋 Code Structure Review:\n");

// Count functions
const functionMatches = content.match(/exports\.\w+\s*=\s*async/g) || [];
console.log(`✓ Exported functions: ${functionMatches.length}`);

// Check for proper error handling
const trycatchMatches = content.match(/try\s*{/g) || [];
console.log(`✓ Try-catch blocks: ${trycatchMatches.length}`);

// Check for database queries
const queryMatches = content.match(/await.*\.query\(/g) || [];
console.log(`✓ Database queries: ${queryMatches.length}`);

// Check response formats
const jsonMatches = content.match(/\.json\s*\(/g) || [];
console.log(`✓ JSON responses: ${jsonMatches.length}`);

console.log("\n✨ maintenanceController.js verification complete!");
process.exit(failed > 0 ? 1 : 0);
