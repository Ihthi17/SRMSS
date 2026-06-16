/**
 * Migration: Create maintenance_records table
 * Requirements: 3, 16
 * 
 * Creates the maintenance_records table with:
 * - All required columns (maintenance_id, vehicle_id, maintenance_type, etc.)
 * - Composite index on (vehicle_id, maintenance_date)
 * - Individual indexes on maintenance_date, vehicle_id, maintenance_status
 * - Foreign key constraint to vehicles (ON DELETE RESTRICT)
 * - created_at and updated_at timestamps
 */

const db = require("../src/config/db");

async function createMaintenanceRecordsTable() {
  try {
    console.log("Starting migration: Create maintenance_records table...");

    // Drop existing table if it exists (for clean migration)
    const dropTableSQL = `DROP TABLE IF EXISTS maintenance_records`;
    
    const connection = await db.getConnection();
    await connection.query(dropTableSQL);
    
    const createTableSQL = `
      CREATE TABLE maintenance_records (
        maintenance_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique maintenance record identifier',
        vehicle_id INT NOT NULL COMMENT 'Foreign key reference to vehicles table',
        maintenance_type ENUM(
          'Routine',
          'Oil Change',
          'Tire Replacement',
          'Brake Service',
          'Engine Repair',
          'Electrical',
          'Suspension',
          'Other'
        ) NOT NULL COMMENT 'Type of maintenance performed',
        maintenance_date DATE NOT NULL COMMENT 'Date when maintenance was performed',
        maintenance_time TIME NOT NULL COMMENT 'Time when maintenance was performed',
        description TEXT COMMENT 'Detailed description of maintenance work',
        cost DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Cost of maintenance service',
        performed_by VARCHAR(255) COMMENT 'Name/ID of technician who performed maintenance',
        maintenance_status ENUM(
          'Scheduled',
          'In Progress',
          'Completed'
        ) NOT NULL DEFAULT 'Scheduled' COMMENT 'Current status of maintenance record',
        next_maintenance_date DATE COMMENT 'Scheduled date for next maintenance',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when record was created',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp when record was last updated',

        CONSTRAINT fk_maintenance_records_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT ON UPDATE CASCADE,

        INDEX idx_vehicle_date (vehicle_id, maintenance_date),
        INDEX idx_maintenance_date (maintenance_date),
        INDEX idx_vehicle_id (vehicle_id),
        INDEX idx_status (maintenance_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      COMMENT='Stores maintenance activity records for vehicles'
    `;

    await connection.query(createTableSQL);
    connection.release();

    console.log("✅ Successfully created maintenance_records table");
    return true;
  } catch (error) {
    console.error("❌ Error creating maintenance_records table:", error.message);
    throw error;
  }
}

async function rollback() {
  try {
    console.log("Rolling back migration: Dropping maintenance_records table...");

    const dropTableSQL = `DROP TABLE IF EXISTS maintenance_records`;

    const connection = await db.getConnection();
    await connection.query(dropTableSQL);
    connection.release();

    console.log("✅ Successfully rolled back migration");
    return true;
  } catch (error) {
    console.error("❌ Error rolling back migration:", error.message);
    throw error;
  }
}

// Export for direct execution or import
module.exports = {
  up: createMaintenanceRecordsTable,
  down: rollback,
  name: "001_create_maintenance_records_table"
};

// Execute if run directly
if (require.main === module) {
  createMaintenanceRecordsTable()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
