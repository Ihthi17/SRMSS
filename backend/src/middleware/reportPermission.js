const db = require("../config/db");

/**
 * Middleware: verify the request user has access to reports.
 *
 * The JWT payload stores `role` as the numeric role_id.
 * We look up that role_id in the `roles` table and allow any role
 * whose role_name contains "ADMIN", "MANAGER", or "REPORT" (case-insensitive).
 *
 * If you want to whitelist specific role IDs instead, edit ALLOWED_ROLE_IDS below.
 */
exports.canViewReports = async (req, res, next) => {
  try {
    const roleId = req.user?.role;
    if (!roleId) {
      return res.status(403).json({ message: "Access denied: no role assigned." });
    }

    const [rows] = await db.query(
      "SELECT role_name FROM roles WHERE role_id = ? LIMIT 1",
      [roleId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: "Access denied: role not found." });
    }

    const roleName = (rows[0].role_name || "").toUpperCase();

    // Allow any role with ADMIN, MANAGER, or REPORT in the name
    // Adjust this pattern to match your actual role names
    const allowedPatterns = ["ADMIN", "MANAGER", "REPORT", "SUPER"];
    const hasAccess = allowedPatterns.some(p => roleName.includes(p));

    if (!hasAccess) {
      return res.status(403).json({
        message: `Access denied: role '${rows[0].role_name}' is not permitted to view reports.`
      });
    }

    next();
  } catch (error) {
    console.error("❌ reportPermission Error:", error);
    return res.status(500).json({ message: "Internal server error checking report permissions." });
  }
};
