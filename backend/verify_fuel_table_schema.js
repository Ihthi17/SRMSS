const db = require('./src/config/db');

(async () => {
  const connection = await db.getConnection();
  try {
    console.log('Verifying fuel_records table structure...\n');
    
    // Show table structure
    const [columns] = await connection.query('DESCRIBE fuel_records');
    console.log('FUEL_RECORDS TABLE STRUCTURE:');
    console.log('=====================================');
    columns.forEach(col => {
      const nullable = col.Null === 'YES' ? 'NULLABLE' : 'NOT NULL';
      const key = col.Key ? ` (${col.Key})` : '';
      console.log(`${col.Field.padEnd(20)} | ${col.Type.padEnd(35)} | ${nullable}${key}`);
    });
    
    console.log('\n');
    
    // Show indexes
    const [indexes] = await connection.query('SHOW INDEX FROM fuel_records');
    console.log('INDEXES:');
    console.log('=====================================');
    const uniqueIndexes = {};
    indexes.forEach(idx => {
      if (!uniqueIndexes[idx.Key_name]) {
        uniqueIndexes[idx.Key_name] = [];
      }
      uniqueIndexes[idx.Key_name].push(idx.Column_name);
    });
    
    Object.entries(uniqueIndexes).forEach(([name, cols]) => {
      console.log(`${name}: (${cols.join(', ')})`);
    });
    
    console.log('\n');
    
    // Show foreign keys
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'fuel_records' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('FOREIGN KEY CONSTRAINTS:');
    console.log('=====================================');
    fks.forEach(fk => {
      console.log(`${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
    });
    
    // Verify constraints on DELETE
    const [constraintDetails] = await connection.query(`
      SELECT CONSTRAINT_NAME, DELETE_RULE
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
      WHERE TABLE_NAME = 'fuel_records'
    `);
    
    console.log('\n');
    console.log('CONSTRAINT DELETE RULES:');
    console.log('=====================================');
    constraintDetails.forEach(constraint => {
      console.log(`${constraint.CONSTRAINT_NAME}: DELETE ${constraint.DELETE_RULE}`);
    });
    
    console.log('\n✅ VERIFICATION COMPLETE!');
    console.log('\nSUMMARY:');
    console.log('- fuel_records table created: YES');
    console.log(`- Total columns: ${columns.length}`);
    console.log(`- Composite index (vehicle_id, fuel_date): ${uniqueIndexes['idx_vehicle_date'] ? 'YES' : 'NO'}`);
    console.log(`- Individual indexes: ${Object.keys(uniqueIndexes).filter(k => k !== 'PRIMARY').length}`);
    console.log(`- Foreign key constraints: ${fks.length}`);
    console.log(`- Constraint DELETE actions validated: ${constraintDetails.length}`);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
})();
