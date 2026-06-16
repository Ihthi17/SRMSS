/**
 * Migration: Create maintenance_records table with indexes
 * Description: Creates the maintenance_records table to track vehicle maintenance
 * activities with status workflow support and proper foreign keys.
 * 
 * Columns:
 * - maintenance_id (PK): Auto-incrementing primary key
 * - vehicle_id (FK): References vehicles table, ON DELETE RESTRICT
 * - maintenance_type: ENUM - Routine, Oil Change, Tire Replacement, Brake Service, Engine Repair, Electrical, Suspension, Other
 * - maintenance_date: Date maintenance was performed
 * - maintenance_time: Time maintenance was performed
 * - description: Detailed description of maintenance work
 * - cost: Cost of maintenance (non-negative decimal)
 * - performed_by: Name/ID of person who performed maintenance
 * - maintenance_status: ENUM - Scheduled, In Progress, Completed
 * - next_maintenance_date: Scheduled date for next maintenance
 * - created_at, updated_at: Timestamps
 * 
 * Indexes:
 * - Composite index (vehicle_id, maintenance_date) for query performance
 * - Individual indexes on maintenance_date, vehicle_id, maintenance_status
 */

const db = require("../config/db");

const createMaintenanceRecordsTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS maintenance_records (
      maintenance_id INT PRIMARY KEY AUTO_INCREMENT,
      vehicle_id INT NOT NULL,
      maintenance_type ENUM('Routine', 'Oil Change', 'Tire Replacement', 'Brake Service', 
                            'Engine Repair', 'Electrical', 'Suspension', 'Other') NOT NULL,
      maintenance_date DATE NOT NULL,
      maintenance_time TIME NOT NULL,
      description TEXT NULL,
      cost DECIMAL(10, 2) NOT NULL,
      performed_by VARCHAR(255) NULL,
      maintenance_status ENUM('Scheduled', 'In Progress', 'Completed') NOT NULL DEFAULT 'Scheduled',
      next_maintenance_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
      
      INDEX idx_vehicle_date (vehicle_id, maintenance_date),
      INDEX idx_maintenance_date (maintenance_date),
      INDEX idx_vehicle_id (vehicle_id),
      INDEX idx_status (maintenance_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const connection = await db.getConnection();
  try {
    console.log("📋 Creating maintenance_records table...");
    await connection.query(createTableSQL);
    console.log("✅ maintenance_records table created successfully");
  } catch (error) {
    if (error.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("⏭️  maintenance_records table already exists, skipping...");
    } else {
      console.error("❌ Error creating maintenance_records table:", error.message);
      throw error;
    }
  } finally {
    connection.release();
  }
};

module.exports = createMaintenanceRecordsTable;
