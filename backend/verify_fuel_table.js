const db = require('./src/config/db');

async function verify() {
  const connection = await db.getConnection();
  try {
    // Get table structure
    const [columns] = await connection.query('DESCRIBE fuel_records');
    console.log('\n📋 FUEL_RECORDS TABLE STRUCTURE:');
    console.log('=====================================');
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} | ${col.Type.padEnd(30)} | Key: ${(col.Key || 'none').padEnd(3)} | Null: ${col.Null}`);
    });

    // Get indexes
    const [indexes] = await connection.query('SHOW INDEX FROM fuel_records');
    console.log('\n📑 INDEXES ON FUEL_RECORDS:');
    console.log('=====================================');
    const uniqueIndexes = {};
    indexes.forEach(idx => {
      const key = idx.Key_name;
      if (!uniqueIndexes[key]) {
        uniqueIndexes[key] = [];
      }
      uniqueIndexes[key].push(idx.Column_name);
    });
    
    Object.entries(uniqueIndexes).forEach(([name, cols]) => {
      console.log(`  ${name.padEnd(20)} | Columns: ${cols.join(', ')}`);
    });

    // Get foreign keys
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'fuel_records' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('\n🔗 FOREIGN KEY CONSTRAINTS:');
    console.log('=====================================');
    fks.forEach(fk => {
      console.log(`  ${fk.CONSTRAINT_NAME}`);
      console.log(`    Column: ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });

    // Get detailed FK info
    const [fkDetails] = await connection.query(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = 'srmss' AND TABLE_NAME = 'fuel_records' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    
    if (fkDetails.length > 0) {
      console.log('\n🔐 FOREIGN KEY CONSTRAINTS CONFIRMED:');
      console.log('=====================================');
      fkDetails.forEach(fk => {
        console.log(`  ✓ ${fk.CONSTRAINT_NAME}`);
      });
    }

    console.log('\n✅ FUEL_RECORDS TABLE VERIFIED SUCCESSFULLY\n');
  } catch (err) {
    console.error('❌ Verification error:', err.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

verify();
