const db = require("./src/config/db");

const verifyMaintenanceTable = async () => {
  const connection = await db.getConnection();
  try {
    // Get table structure
    const [tableStructure] = await connection.query("DESCRIBE maintenance_records");
    console.log("\n📋 maintenance_records Table Structure:");
    console.log("========================================");
    console.table(tableStructure);

    // Get indexes
    const [indexes] = await connection.query("SHOW INDEX FROM maintenance_records");
    console.log("\n📑 Indexes on maintenance_records:");
    console.log("==================================");
    console.table(indexes.map(idx => ({
      Key_name: idx.Key_name,
      Column_name: idx.Column_name,
      Seq_in_index: idx.Seq_in_index,
      Non_unique: idx.Non_unique
    })));

    // Get foreign keys
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'maintenance_records' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.log("\n🔗 Foreign Keys:");
    console.log("================");
    console.table(fks);

    // Test enumeration values
    const [enumTest] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'maintenance_records' AND COLUMN_NAME IN ('maintenance_type', 'maintenance_status')
    `);
    console.log("\n✔️ ENUM Columns:");
    console.log("=================");
    console.table(enumTest);

    console.log("\n✅ maintenance_records table verification complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error verifying maintenance_records table:", error.message);
    process.exit(1);
  }
};

verifyMaintenanceTable();
