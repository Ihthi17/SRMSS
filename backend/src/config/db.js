const mysql = require("mysql2");

// Use createPool and .promise() for robust async/await management
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "srmss",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const db = pool.promise();

// Test the connection immediately on startup
pool.query("SELECT 1", (err) => {
  if (err) {
    console.error("❌ DB connection failed:", err.message);
  } else {
    console.log("✅ MySQL Connected successfully to 'srmss' pool");
  }
});

module.exports = db;