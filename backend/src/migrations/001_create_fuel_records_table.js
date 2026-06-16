/**
 * Migration: Create fuel_records table with indexes
 * Description: Creates the fuel_records table to track fuel consumption with proper
 * foreign keys and indexes for query performance.
 * 
 * Columns:
 * - fuel_id (PK): Auto-incrementing primary key
 * - vehicle_id (FK): References vehicles table, ON DELETE RESTRICT
 * - trip_id (FK): References trips table, ON DELETE SET NULL (optional)
 * - fuel_quantity: Amount of fuel in liters/units (decimal)
 * - fuel_cost: Cost of fuel transaction (decimal)
 * - fuel_type: ENUM - Diesel, Petrol, CNG, Electric, Hybrid
 * - fuel_date: Date of fuel transaction
 * - fuel_time: Time of fuel transaction
 * - odometer_reading: Vehicle mileage at fuel transaction
 * - fuel_efficiency: Calculated KM/Liter (rounded to 2 decimal places)
 * - created_at, updated_at: Timestamps
 * 
 * Indexes:
 * - Composite index (vehicle_id, fuel_date) for query performance
 * - Individual indexes on fuel_date, vehicle_id, trip_id
 */

const db = require("../config/db");

const createFuelRecordsTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS fuel_records (
      fuel_id INT PRIMARY KEY AUTO_INCREMENT,
      vehicle_id INT NOT NULL,
      trip_id INT NULL,
      fuel_quantity DECIMAL(10, 2) NOT NULL,
      fuel_cost DECIMAL(10, 2) NOT NULL,
      fuel_type ENUM('Diesel', 'Petrol', 'CNG', 'Electric', 'Hybrid') NOT NULL,
      fuel_date DATE NOT NULL,
      fuel_time TIME NOT NULL,
      odometer_reading DECIMAL(12, 2) NOT NULL,
      fuel_efficiency DECIMAL(8, 2) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE SET NULL,
      
      INDEX idx_vehicle_date (vehicle_id, fuel_date),
      INDEX idx_fuel_date (fuel_date),
      INDEX idx_vehicle_id (vehicle_id),
      INDEX idx_trip_id (trip_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const connection = await db.getConnection();
  try {
    console.log("📋 Creating fuel_records table...");
    await connection.query(createTableSQL);
    console.log("✅ fuel_records table created successfully");
    
    // Verify indexes were created
    const [indexes] = await connection.query("SHOW INDEX FROM fuel_records WHERE Key_name != 'PRIMARY'");
    console.log(`   Indexes created: ${indexes.map(i => i.Key_name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`);
  } catch (error) {
    if (error.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("⏭️  fuel_records table already exists, skipping...");
    } else {
      console.error("❌ Error creating fuel_records table:", error.message);
      throw error;
    }
  } finally {
    connection.release();
  }
};

module.exports = createFuelRecordsTable;
