// Migration script to create maintenance_alerts table with indexes
const db = require('./src/config/db');

async function createMaintenanceAlertsTable() {
  try {
    console.log('Creating maintenance_alerts table...');

    // Drop table if it exists (for development/testing purposes)
    try {
      await db.query('DROP TABLE IF EXISTS maintenance_alerts');
      console.log('Dropped existing maintenance_alerts table (if any)');
    } catch (err) {
      // Table doesn't exist, that's fine
    }

    // Create the maintenance_alerts table
    const createTableQuery = `
      CREATE TABLE maintenance_alerts (
        alert_id INT PRIMARY KEY AUTO_INCREMENT,
        vehicle_id INT NOT NULL,
        alert_type ENUM(
          'Scheduled Maintenance Due',
          'Corrective Maintenance Completed',
          'Overdue Maintenance',
          'Fuel Efficiency Warning'
        ) NOT NULL,
        alert_message VARCHAR(500) NOT NULL,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        
        INDEX idx_vehicle_resolved (vehicle_id, is_resolved),
        INDEX idx_created_at (created_at),
        INDEX idx_vehicle_id (vehicle_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await db.query(createTableQuery);
    console.log('✅ maintenance_alerts table created successfully');

    // Verify the table was created
    const [tableInfo] = await db.query('DESCRIBE maintenance_alerts');
    console.log('\nTable structure:');
    console.log(JSON.stringify(tableInfo, null, 2));

    // Verify indexes were created
    const [indexes] = await db.query('SHOW INDEX FROM maintenance_alerts');
    console.log('\nIndexes created:');
    console.log(JSON.stringify(indexes, null, 2));

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error creating maintenance_alerts table:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createMaintenanceAlertsTable();
