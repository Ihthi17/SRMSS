const db = require("../config/db");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 🌟 Changed back to fetching by username only so we can inspect account status if found
    const sql = "SELECT * FROM users WHERE username = ?"; 
    const [rows] = await db.query(sql, [username]);

    // Check if user exists
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    // 🌟 CRITICAL GUARDRAIL: Block authentication if the account is deactivated (is_active !== 1)
    if (user.is_active === 0 || !user.is_active) {
      return res.status(403).json({ 
        message: "Your account has been deactivated. Please contact your system administrator." 
      });
    }

    // Dynamic Column Verification 
    const dbPassword = user.password_hash || user.password;
    if (!dbPassword) {
      return res.status(500).json({ message: "Password field mapping error in database configuration." });
    }

    // Verify Password match
    const isMatch = await bcrypt.compare(password, dbPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT Access Token
    const token = generateToken(user);

    // Send back the successful response layout mapping
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id || user.id,
        username: user.username,
        role_id: user.role_id,
        depot_id: user.depot_id,
      },
    });

  } catch (error) {
    console.error("❌ Login Route Server Error:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
};