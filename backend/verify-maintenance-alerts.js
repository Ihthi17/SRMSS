// Verification script for maintenance_alerts table
const db = require('./src/config/db');

async function verifyTable() {
  try {
    console.log('Verifying maintenance_alerts table...\n');

    // Check table structure
    const [structure] = await db.query('DESCRIBE maintenance_alerts');
    console.log('Table Structure:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}${col.Key ? ` [${col.Key}]` : ''}${col.Null === 'NO' ? ' NOT NULL' : ''}`);
    });

    // Check foreign keys
    console.log('\nForeign Key Constraints:');
    const [fks] = await db.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'maintenance_alerts' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    if (fks.length > 0) {
      fks.forEach(fk => {
        console.log(`  - ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
      });
    } else {
      console.log('  No foreign keys found');
    }

    // Check indexes
    console.log('\nIndexes:');
    const [indexes] = await db.query('SHOW INDEX FROM maintenance_alerts');
    const indexGroups = {};
    indexes.forEach(idx => {
      if (!indexGroups[idx.Key_name]) {
        indexGroups[idx.Key_name] = [];
      }
      indexGroups[idx.Key_name].push(idx.Column_name);
    });

    Object.entries(indexGroups).forEach(([name, cols]) => {
      console.log(`  - ${name}: (${cols.join(', ')})`);
    });

    // Check FK delete rule
    console.log('\nForeign Key Delete Rules:');
    const [rules] = await db.query(`
      SELECT 
        CONSTRAINT_NAME,
        DELETE_RULE,
        UPDATE_RULE
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
      WHERE TABLE_NAME = 'maintenance_alerts'
    `);

    if (rules.length > 0) {
      rules.forEach(rule => {
        console.log(`  - ${rule.CONSTRAINT_NAME}: ON DELETE ${rule.DELETE_RULE}, ON UPDATE ${rule.UPDATE_RULE}`);
      });
    }

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('Error verifying table:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyTable();
