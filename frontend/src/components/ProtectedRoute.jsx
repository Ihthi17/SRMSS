import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute
 *
 * Checks:
 * 1. User is logged in (token exists)
 * 2. User's role has permission for this page
 *
 * Super Admin (role_id === 1) bypasses all permission checks.
 * Any other role with NO permissions assigned is blocked from the system.
 * Any other role WITH permissions must have this specific pageKey in their list.
 */
export default function ProtectedRoute({ pageKey, children }) {
  const token = localStorage.getItem("token");

  // Not logged in → send to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Read stored user and permissions
  let user = {};
  let permissions = [];
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
    permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  } catch (_) {}

  // Super Admin always has full access (role_id === 1)
  const isSuperAdmin =
    user.role_id === 1 ||
    user.role_name === "SUPER_ADMIN" ||
    user.role_name === "SUPERADMIN";

  if (isSuperAdmin) {
    return children;
  }

  // Non-Super Admin with no permissions assigned at all → no access
  if (permissions.length === 0) {
    return <Navigate to="/no-access" replace />;
  }

  // Has permissions but this page is not in them
  if (pageKey && !permissions.includes(pageKey)) {
    return (
      <div className="flex min-h-screen bg-neutral-950 text-white items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold text-amber-500">Access Denied</h1>
          <p className="text-neutral-400 text-sm">
            Your role does not have permission to view this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-5 py-2 bg-amber-500 text-neutral-950 font-bold rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}
