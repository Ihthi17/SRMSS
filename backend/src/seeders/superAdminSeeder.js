const db = require("../config/db");
const bcrypt = require("bcrypt");

const seedSuperAdmin = async () => {
  try {
    const username = "superadmin";
    const password = "admin123"; // change later
    const role_id = 1; // SUPER_ADMIN
    const depot_id = 1;

    // check if already exists
    db.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      async (err, results) => {
        if (err) {
          console.log("Error checking user:", err);
          return;
        }

        if (results.length > 0) {
          console.log("Super Admin already exists");
          return;
        }

        // hash password
        const hash = await bcrypt.hash(password, 10);

        // insert user
        db.query(
          `INSERT INTO users (depot_id, role_id, username, password_hash, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          [depot_id, role_id, username, hash, 1],
          (err, result) => {
            if (err) {
              console.log("Insert error:", err);
            } else {
              console.log("Super Admin created successfully");
            }
          }
        );
      }
    );
  } catch (error) {
    console.log(error);
  }
};

module.exports = seedSuperAdmin;