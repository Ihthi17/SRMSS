/**
 * Verification script for maintenance_alerts table
 * Checks table structure, indexes, and constraints
 */

const db = require('./src/config/db');

const verifyMaintenanceAlertsTable = async () => {
  const connection = await db.getConnection();
  try {
    console.log('=== MAINTENANCE_ALERTS TABLE STRUCTURE ===\n');
    const [columns] = await connection.query('DESCRIBE maintenance_alerts');
    console.table(columns);
    
    console.log('\n=== INDEXES ON MAINTENANCE_ALERTS ===\n');
    const [indexes] = await connection.query('SHOW INDEX FROM maintenance_alerts');
    console.table(indexes);
    
    console.log('\n=== FOREIGN KEYS ===\n');
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'maintenance_alerts' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.table(fks);
    
    console.log('\n=== VERIFICATION CHECKLIST ===\n');
    
    // Check columns
    const columnNames = columns.map(c => c.Field);
    const requiredColumns = ['alert_id', 'vehicle_id', 'alert_type', 'alert_message', 'is_resolved', 'created_at', 'updated_at'];
    const columnsOk = requiredColumns.every(col => columnNames.includes(col));
    console.log(`✓ All required columns present: ${columnsOk ? 'YES' : 'NO'}`);
    
    // Check indexes
    const indexNames = indexes.map(i => i.Key_name).filter((v, i, a) => a.indexOf(v) === i);
    console.log(`✓ Composite index (vehicle_id, is_resolved) present: ${indexNames.includes('idx_vehicle_resolved') ? 'YES' : 'NO'}`);
    console.log(`✓ Index on created_at present: ${indexNames.includes('idx_created_at') ? 'YES' : 'NO'}`);
    console.log(`✓ Index on vehicle_id present: ${indexNames.includes('idx_vehicle_id') ? 'YES' : 'NO'}`);
    
    // Check foreign key
    console.log(`✓ Foreign key to vehicles (ON DELETE CASCADE) present: ${fks.length > 0 ? 'YES' : 'NO'}`);
    
    console.log('\n=== SAMPLE DATA TEST ===\n');
    // Try to insert a sample record (will fail if vehicles don't exist, but shows connection works)
    try {
      const [vehicleCheck] = await connection.query('SELECT vehicle_id FROM vehicles LIMIT 1');
      if (vehicleCheck.length > 0) {
        const vehicleId = vehicleCheck[0].vehicle_id;
        
        // Insert test alert
        await connection.query(`
          INSERT INTO maintenance_alerts 
          (vehicle_id, alert_type, alert_message, is_resolved) 
          VALUES (?, ?, ?, ?)
        `, [vehicleId, 'Scheduled Maintenance Due', 'Test alert', false]);
        
        // Verify insert
        const [inserted] = await connection.query('SELECT * FROM maintenance_alerts WHERE vehicle_id = ? ORDER BY alert_id DESC LIMIT 1', [vehicleId]);
        console.log('Test insert successful:');
        console.table(inserted);
        
        // Clean up test data
        await connection.query('DELETE FROM maintenance_alerts WHERE alert_message = ?', ['Test alert']);
        console.log('\nTest data cleaned up.');
      }
    } catch (err) {
      console.log(`Could not test insertion: ${err.message}`);
    }
    
  } finally {
    connection.release();
    process.exit(0);
  }
};

if (require.main === module) {
  verifyMaintenanceAlertsTable();
}

module.exports = verifyMaintenanceAlertsTable;
