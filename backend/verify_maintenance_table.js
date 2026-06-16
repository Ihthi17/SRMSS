const db = require("./src/config/db");

async function verifyTable() {
  try {
    const connection = await db.getConnection();

    // Get table structure
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'srmss' AND TABLE_NAME = 'maintenance_records' ORDER BY ORDINAL_POSITION"
    );

    console.log("✅ Table Structure:");
    console.table(columns);

    // Get indexes
    const [indexes] = await connection.query(
      "SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = 'srmss' AND TABLE_NAME = 'maintenance_records' ORDER BY INDEX_NAME, SEQ_IN_INDEX"
    );

    console.log("\n✅ Indexes:");
    console.table(indexes);

    // Get foreign keys
    const [fks] = await connection.query(
      "SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = 'srmss' AND TABLE_NAME = 'maintenance_records' AND REFERENCED_TABLE_NAME IS NOT NULL"
    );

    console.log("\n✅ Foreign Keys:");
    console.table(fks);

    connection.release();
  } catch (error) {
    console.error("Error:", error.message);
  }
  process.exit(0);
}

verifyTable();
