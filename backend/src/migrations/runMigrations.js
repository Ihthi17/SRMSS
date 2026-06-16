/**
 * Migration Runner
 * Executes all migration scripts in sequence
 * 
 * Usage: node src/migrations/runMigrations.js
 */

const createFuelRecordsTable = require("./001_create_fuel_records_table");
const createMaintenanceRecordsTable = require("./002_create_maintenance_records_table");
const createMaintenanceAlertsTable = require("./003_create_maintenance_alerts_table");

const runMigrations = async () => {
  try {
    console.log("🚀 Starting database migrations...\n");

    // Run migrations in sequence
    await createFuelRecordsTable();
    console.log();
    await createMaintenanceRecordsTable();
    console.log();
    await createMaintenanceAlertsTable();

    console.log("\n✅ All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
