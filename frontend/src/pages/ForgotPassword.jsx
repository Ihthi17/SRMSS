import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: request, 2: submitted, 3: token verification
  const [identity, setIdentity] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (!identity) return alert("Please enter your username or email");

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/settings/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
      } else {
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      alert("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetWithToken = async (e) => {
    e.preventDefault();
    if (!token) return alert("Please enter the reset token from your email");
    if (!newPassword) return alert("Please enter a new password");
    if (newPassword !== confirmPassword) return alert("Passwords do not match");
    if (newPassword.length < 6) return alert("Password must be at least 6 characters");

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, token, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(4); // Success state
      } else {
        alert(data.error || "Reset failed. Please try again.");
      }
    } catch (err) {
      alert("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans text-white">
      
      {/* 🌟 Uses your global .card-panel for dark theme styling */}
      <div className="w-full max-w-md card-panel shadow-2xl p-8 relative overflow-hidden">
        
        {step === 1 ? (
          /* Step 1: Request Form */
          <>
            <h2 className="text-2xl font-bold text-white text-center tracking-wide">
              Forgot Password?
            </h2>

            <p className="text-xs text-neutral-400 text-center mt-2 mb-6 leading-relaxed">
              Enter your username or email address and we'll send you instructions to reset your password.
            </p>

            <form onSubmit={handleResetRequest} className="space-y-5">
              <div>
                <label 
                  className="block text-xs font-semibold uppercase mb-1.5 tracking-wider"
                  style={{ color: 'var(--text-app-accent)' }}
                >
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
                  placeholder="Enter your username or email"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 disabled:from-neutral-700 disabled:to-neutral-800 text-neutral-950 font-bold py-3 rounded-lg transition-all shadow-md hover:opacity-90 active:scale-[0.99] tracking-wider text-sm uppercase"
              >
                {loading ? "Sending instructions..." : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : step === 2 ? (
          /* Step 2: Success Message State */
          <div className="text-center py-4">
            
            {/* 🌟 Uses your global .accent-badge for amber glass style */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full accent-badge mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white tracking-wide">
              Check your inbox
            </h2>

            <p className="text-xs text-neutral-400 mt-2 mb-6 px-2 leading-relaxed">
              We have sent a password recovery link to your registered account associated with{" "}
              <span className="font-mono" style={{ color: 'var(--text-app-accent)' }}>{identity}</span>.
            </p>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold py-3 rounded-lg transition-all shadow-md hover:opacity-90 active:scale-[0.99] tracking-wider text-sm uppercase"
            >
              I have the reset token
            </button>
          </div>
        ) : step === 3 ? (
          /* Step 3: Token & Password Reset Form */
          <>
            <h2 className="text-2xl font-bold text-white text-center tracking-wide">
              Reset Password
            </h2>

            <p className="text-xs text-neutral-400 text-center mt-2 mb-6 leading-relaxed">
              Enter the reset token from your email and set a new password.
            </p>

            <form onSubmit={handleResetWithToken} className="space-y-5">
              <div>
                <label 
                  className="block text-xs font-semibold uppercase mb-1.5 tracking-wider"
                  style={{ color: 'var(--text-app-accent)' }}
                >
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono text-center text-lg tracking-widest"
                  placeholder="Paste token from email"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label 
                  className="block text-xs font-semibold uppercase mb-1.5 tracking-wider"
                  style={{ color: 'var(--text-app-accent)' }}
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all pr-10"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0m6.364 1.636l-1.5 1.5m0-5.196l1.5-1.5" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-semibold uppercase mb-1.5 tracking-wider"
                  style={{ color: 'var(--text-app-accent)' }}
                >
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 disabled:from-neutral-700 disabled:to-neutral-800 text-neutral-950 font-bold py-3 rounded-lg transition-all shadow-md hover:opacity-90 active:scale-[0.99] tracking-wider text-sm uppercase"
              >
                {loading ? "Resetting password..." : "Reset Password"}
              </button>
            </form>
          </>
        ) : step === 4 ? (
          /* Step 4: Success Message */
          <div className="text-center py-8">
            
            {/* 🌟 Uses your global .accent-badge for amber glass style */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full accent-badge mb-6">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-wide">
              Password Reset Successful!
            </h2>

            <p className="text-xs text-neutral-400 mt-3 mb-8 px-2 leading-relaxed">
              Your password has been successfully reset. You can now log in with your new password.
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold py-3 rounded-lg transition-all shadow-md hover:opacity-90 active:scale-[0.99] tracking-wider text-sm uppercase"
            >
              Back to Login
            </button>
          </div>
        ) : null}

        {/* Back to Login Action Link (only show for steps 1-3) */}
        {step < 4 && (
          <div className="mt-6 text-center border-t border-neutral-800/80 pt-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors focus:outline-none tracking-wider uppercase"
            >
              <svg className="h-3.5 w-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}