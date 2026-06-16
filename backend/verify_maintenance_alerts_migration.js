/**
 * Verification script for maintenance_alerts table
 */

const db = require('./src/config/db');

async function verifyTable() {
  const connection = await db.getConnection();
  try {
    console.log('========== MAINTENANCE ALERTS TABLE VERIFICATION ==========\n');
    
    // Get table structure
    const [tableStructure] = await connection.query('DESCRIBE maintenance_alerts');
    console.log('📋 TABLE STRUCTURE:');
    console.log('─────────────────────────────────────────────────────────────');
    tableStructure.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} | ${col.Type.padEnd(30)} | ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Get indexes
    const [indexes] = await connection.query('SHOW INDEX FROM maintenance_alerts');
    console.log('\n🔍 INDEXES:');
    console.log('─────────────────────────────────────────────────────────────');
    const uniqueIndexes = [...new Set(indexes.map(i => i.Key_name))];
    uniqueIndexes.forEach(indexName => {
      const indexCols = indexes
        .filter(i => i.Key_name === indexName)
        .map(i => i.Column_name)
        .join(', ');
      const isUnique = indexes.find(i => i.Key_name === indexName).Non_unique === 0 ? 'UNIQUE' : '';
      console.log(`  ${indexName.padEnd(25)} | Columns: ${indexCols} ${isUnique}`);
    });
    
    // Get foreign keys
    const [fks] = await connection.query(`
      SELECT k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME,
             r.DELETE_RULE, r.UPDATE_RULE
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k 
        ON r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_NAME = 'maintenance_alerts' AND k.TABLE_SCHEMA = 'srmss'
    `);
    
    console.log('\n🔗 FOREIGN KEYS:');
    console.log('─────────────────────────────────────────────────────────────');
    if (fks.length > 0) {
      fks.forEach(fk => {
        console.log(`  ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
        console.log(`    Delete Rule: ${fk.DELETE_RULE}, Update Rule: ${fk.UPDATE_RULE}`);
      });
    } else {
      console.log('  (No foreign keys found)');
    }
    
    // Check table row count
    const [rowCount] = await connection.query('SELECT COUNT(*) as count FROM maintenance_alerts');
    console.log('\n📊 TABLE DATA:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Total rows: ${rowCount[0].count}`);
    
    console.log('\n✅ VERIFICATION COMPLETE - maintenance_alerts table is ready!\n');
    
  } catch (error) {
    console.error('❌ Verification Error:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

verifyTable();
