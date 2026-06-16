import { useNavigate } from "react-router-dom";

export default function NoAccess() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
    navigate("/");
  };

  // Read stored user info for display
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (_) {}

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8 text-center space-y-6">
        
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7m0 0a4 4 0 100 8 4 4 0 000-8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M18.364 5.636A9 9 0 115.636 18.364 9 9 0 0118.364 5.636z" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">No Access</h1>
          {user.username && (
            <p className="text-sm text-neutral-400 mt-1">
              Logged in as <span className="text-amber-400 font-mono">{user.username}</span>
            </p>
          )}
        </div>

        {/* Message */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-left space-y-2">
          <p className="text-sm text-neutral-300 leading-relaxed">
            Your account is active, but your role has <span className="text-red-400 font-semibold">no page permissions assigned</span> yet.
          </p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Please contact your system administrator to configure access permissions for your role.
          </p>
        </div>

        {/* What to do */}
        <div className="text-left space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">What should happen next</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-neutral-400">
              <span className="text-amber-500 mt-0.5">1.</span>
              <span>A Super Admin logs into the system</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-neutral-400">
              <span className="text-amber-500 mt-0.5">2.</span>
              <span>Goes to <span className="text-white font-mono">Role Boundaries</span> in the sidebar</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-neutral-400">
              <span className="text-amber-500 mt-0.5">3.</span>
              <span>Clicks <span className="text-blue-400">🔑 Permissions</span> next to your role</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-neutral-400">
              <span className="text-amber-500 mt-0.5">4.</span>
              <span>Selects the pages you should have access to and saves</span>
            </li>
          </ul>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold rounded-lg text-sm hover:opacity-90 transition-opacity tracking-wider uppercase"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
