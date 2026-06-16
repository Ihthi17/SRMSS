/**
 * Migration: Create maintenance_alerts table with indexes
 * Description: Creates the maintenance_alerts table to track automated alerts
 * for vehicle maintenance scheduling and completion.
 * 
 * Columns:
 * - alert_id (PK): Auto-incrementing primary key
 * - vehicle_id (FK): References vehicles table, ON DELETE CASCADE
 * - alert_type: ENUM - Scheduled Maintenance Due, Corrective Maintenance Completed, Overdue Maintenance, Fuel Efficiency Warning
 * - alert_message: Human-readable alert message
 * - is_resolved: Boolean indicating if alert has been addressed
 * - created_at, updated_at: Timestamps
 * 
 * Indexes:
 * - Composite index (vehicle_id, is_resolved) for alert queries
 * - Individual indexes on created_at, vehicle_id
 */

const db = require("../config/db");

const createMaintenanceAlertsTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS maintenance_alerts (
      alert_id INT PRIMARY KEY AUTO_INCREMENT,
      vehicle_id INT NOT NULL,
      alert_type ENUM('Scheduled Maintenance Due', 'Corrective Maintenance Completed', 
                      'Overdue Maintenance', 'Fuel Efficiency Warning') NOT NULL,
      alert_message VARCHAR(500) NOT NULL,
      is_resolved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
      
      INDEX idx_vehicle_resolved (vehicle_id, is_resolved),
      INDEX idx_created_at (created_at),
      INDEX idx_vehicle_id (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const connection = await db.getConnection();
  try {
    console.log("📋 Creating maintenance_alerts table...");
    await connection.query(createTableSQL);
    console.log("✅ maintenance_alerts table created successfully");
  } catch (error) {
    if (error.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("⏭️  maintenance_alerts table already exists, skipping...");
    } else {
      console.error("❌ Error creating maintenance_alerts table:", error.message);
      throw error;
    }
  } finally {
    connection.release();
  }
};

module.exports = createMaintenanceAlertsTable;
