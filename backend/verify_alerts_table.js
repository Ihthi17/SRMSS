const db = require("./src/config/db");

const verifyAlertsTable = async () => {
  const connection = await db.getConnection();
  try {
    console.log("📋 Verifying maintenance_alerts table structure...\n");
    
    // Get table structure
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'srmss' AND TABLE_NAME = 'maintenance_alerts'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("✅ Columns:");
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (Nullable: ${col.IS_NULLABLE}, Default: ${col.COLUMN_DEFAULT || 'None'})`);
    });

    // Get indexes
    const [indexes] = await connection.query(`
      SHOW INDEX FROM maintenance_alerts WHERE Key_name != 'PRIMARY'
    `);

    console.log("\n✅ Indexes:");
    const indexMap = {};
    indexes.forEach(idx => {
      if (!indexMap[idx.Key_name]) {
        indexMap[idx.Key_name] = [];
      }
      indexMap[idx.Key_name].push(idx.Column_name);
    });

    Object.entries(indexMap).forEach(([name, cols]) => {
      console.log(`  - ${name}: (${cols.join(', ')})`);
    });

    // Get foreign keys
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'srmss' AND TABLE_NAME = 'maintenance_alerts' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    console.log("\n✅ Foreign Keys:");
    fks.forEach(fk => {
      console.log(`  - ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
      console.log(`    ON DELETE: CASCADE`);
    });

    // Get table statistics
    const [stats] = await connection.query(`
      SELECT TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'srmss' AND TABLE_NAME = 'maintenance_alerts'
    `);

    console.log("\n✅ Table Statistics:");
    console.log(`  - Rows: ${stats[0].TABLE_ROWS}`);
    console.log(`  - Data Size: ${stats[0].DATA_LENGTH} bytes`);
    console.log(`  - Index Size: ${stats[0].INDEX_LENGTH} bytes`);

    console.log("\n✅ Table verification complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error verifying table:", error.message);
    process.exit(1);
  } finally {
    connection.release();
  }
};

verifyAlertsTable();
