import { useState } from "react";
import { useNavigate } from "react-router-dom";

// import { requestPasswordReset } from "../services/authService"; // Uncomment when endpoint is ready

export default function ForgotPassword() {
  const [identity, setIdentity] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const navigate = useNavigate();

  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (!identity) return alert("Please enter your username or email");

    try {
      setLoading(true);

      // Simulating API call to authService
      // await requestPasswordReset({ identity }); 
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Mock delay

      setIsSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans text-white">
      
      {/* 🌟 Uses your global .card-panel for dark theme styling */}
      <div className="w-full max-w-md card-panel shadow-2xl p-8 relative overflow-hidden">
        
        {!isSubmitted ? (
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
        ) : (
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

            <p className="text-xs text-neutral-400 mt-2 mb-4 px-2 leading-relaxed">
              We have sent a password recovery link to your registered account associated with{" "}
              <span className="font-mono" style={{ color: 'var(--text-app-accent)' }}>{identity}</span>.
            </p>
          </div>
        )}

        {/* Back to Login Action Link */}
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

      </div>
    </div>
  );
}