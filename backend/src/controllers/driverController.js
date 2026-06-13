const db = require("../config/db");

// 1. CREATE - Register a new driver
exports.createDriver = async (req, res) => {
  try {
    const {
      depot_id, first_name, last_name, email, phone_number,
      license_number, license_expiry_date, date_of_birth, address, is_available
    } = req.body;

    // Validate mandatory fields for license compliance
    if (!first_name || !last_name || !license_number || !license_expiry_date) {
      return res.status(400).json({ message: "Missing required core driver details." });
    }

    const sql = `
      INSERT INTO drivers 
      (depot_id, first_name, last_name, email, phone_number, license_number, license_expiry_date, date_of_birth, address, is_available) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      depot_id || null, first_name, last_name, email || null, phone_number || null,
      license_number, license_expiry_date, date_of_birth || null, address || null, 
      is_available !== undefined ? is_available : 1
    ]);

    return res.status(201).json({
      message: "Driver registered successfully",
      driverId: result.insertId
    });
  } catch (error) {
    console.error("❌ Create Driver Error:", error);
    return res.status(500).json({ message: "Internal server error creating driver record." });
  }
};

// 2. READ ALL - Fetch all drivers (with safe pool mapping)
exports.getAllDrivers = async (req, res) => {
  try {
    const sql = "SELECT * FROM drivers ORDER BY created_at DESC";
    const [rows] = await db.query(sql);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Get All Drivers Error:", error);
    return res.status(500).json({ message: "Internal server error retrieving drivers list." });
  }
};

// 3. READ SINGLE - Get specific driver data by ID
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM drivers WHERE driver_id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Driver record not found." });
    }
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("❌ Get Driver By ID Error:", error);
    return res.status(500).json({ message: "Internal server error pulling driver file." });
  }
};

// 4. UPDATE - Dynamic modification of any profile field
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const fieldsToUpdate = req.body;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ message: "No updated properties provided." });
    }

    // Build SQL string dynamically depending on what the user changes in the frontend
    const syntaxKeys = [];
    const executionValues = [];

    Object.keys(fieldsToUpdate).forEach((key) => {
      // Guard against modifying primary autoincrement ID directly
      if (key !== "driver_id" && key !== "created_at") {
        syntaxKeys.push(`${key} = ?`);
        executionValues.push(fieldsToUpdate[key]);
      }
    });

    executionValues.push(id); // push target ID last for the WHERE clause pointer

    const sql = `UPDATE drivers SET ${syntaxKeys.join(", ")} WHERE driver_id = ?`;
    const [result] = await db.query(sql, executionValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Driver update failed. Record not found." });
    }

    return res.status(200).json({ message: "Driver profile properties modified successfully." });
  } catch (error) {
    console.error("❌ Update Driver Error:", error);
    return res.status(500).json({ message: "Internal server error processing driver update." });
  }
};

// 5. DELETE - Remove driver file out of database inventory
exports.deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM drivers WHERE driver_id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Driver profile deletion aborted. Record not found." });
    }

    return res.status(200).json({ message: "Driver profile permanently cleared from index." });
  } catch (error) {
    console.error("❌ Delete Driver Error:", error);
    return res.status(500).json({ message: "Internal server error purging driver data entry." });
  }
};