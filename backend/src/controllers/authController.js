const db = require("../config/db");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");
const { getPermissionsByRoleId } = require("./roleController");

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

    // Fetch this role's allowed pages
    let permissions = [];
    try {
      permissions = await getPermissionsByRoleId(user.role_id);
    } catch (_) {
      // If permissions table not ready yet, return empty (all-access fallback handled on frontend)
    }

    // Fetch role name so frontend can identify Super Admin
    let role_name = "";
    try {
      const [roleRows] = await db.query("SELECT role_name FROM roles WHERE role_id = ?", [user.role_id]);
      role_name = roleRows.length ? roleRows[0].role_name : "";
    } catch (_) {}

    // Send back the successful response layout mapping
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id || user.id,
        username: user.username,
        role_id: user.role_id,
        role_name,
        depot_id: user.depot_id,
      },
      permissions,
    });

  } catch (error) {
    console.error("❌ Login Route Server Error:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
};

// Reset password with token (for forgot password flow)
exports.resetPassword = async (req, res) => {
  const { identity, token, newPassword } = req.body;

  if (!identity || !token || !newPassword) {
    return res.status(400).json({ success: false, error: "Identity, token, and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
  }

  try {
    // Find user by username or email
    const [users] = await db.query(
      `SELECT user_id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [identity, identity]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = users[0];

    // Fetch the reset token from system_settings
    const sql_settings = `
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await db.query(sql_settings);

    const [settingsRows] = await db.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1`,
      [`reset_token_${user.user_id}`]
    );

    if (!settingsRows.length) {
      return res.status(400).json({ success: false, error: "No reset token found. Please request a new one." });
    }

    let tokenData;
    try {
      tokenData = JSON.parse(settingsRows[0].setting_value);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid reset token format" });
    }

    // Verify token matches
    if (tokenData.token !== token.toUpperCase()) {
      return res.status(400).json({ success: false, error: "Invalid reset token" });
    }

    // Check if token has expired (1 hour expiry)
    const expiresAt = new Date(tokenData.expires);
    if (new Date() > expiresAt) {
      return res.status(400).json({ success: false, error: "Reset token has expired. Please request a new one." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.query(
      `UPDATE users SET password_hash = ? WHERE user_id = ?`,
      [hashedPassword, user.user_id]
    );

    // Delete the reset token from system_settings
    await db.query(
      `DELETE FROM system_settings WHERE setting_key = ?`,
      [`reset_token_${user.user_id}`]
    );

    return res.json({ success: true, message: "Password reset successfully. You can now log in with your new password." });

  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    return res.status(500).json({ success: false, error: "Internal server error during password reset" });
  }
};