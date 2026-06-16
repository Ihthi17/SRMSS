const db = require('./src/config/db');

async function verifyFK() {
  const connection = await db.getConnection();
  try {
    const [constraints] = await connection.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME,
             DELETE_RULE, UPDATE_RULE
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
      JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
      ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
      WHERE TABLE_NAME = 'maintenance_records' AND CONSTRAINT_NAME != 'PRIMARY'
    `);
    
    console.log('✅ Foreign Key Details for maintenance_records:');
    constraints.forEach(c => {
      console.log(`  Constraint: ${c.CONSTRAINT_NAME}`);
      console.log(`    Column: ${c.COLUMN_NAME}`);
      console.log(`    References: ${c.REFERENCED_TABLE_NAME}(${c.REFERENCED_COLUMN_NAME})`);
      console.log(`    ON DELETE: ${c.DELETE_RULE}`);
      console.log(`    ON UPDATE: ${c.UPDATE_RULE}`);
      console.log();
    });
  } finally {
    connection.release();
    process.exit(0);
  }
}

verifyFK().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
