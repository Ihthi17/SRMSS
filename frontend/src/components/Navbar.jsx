export default function Navbar({ onToggleSidebar, onLogout }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      
      {/* Left side: Hamburger Toggle */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Right side: User Greetings & Log Out */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 font-medium hidden sm:inline">
          Welcome Back
        </span>
        
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200"
        >
          {/* Logout Icon */}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>
      </div>

    </nav>
  );
}