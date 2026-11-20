import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AdminLoginPage() {
  const {
    user,
    isAdmin,
    authReady,
    authLoading,
    authError,
    adminAccessDenied,
    signInAsAdmin,
    logout,
    clearAuthError,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authReady && user && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [authReady, user, isAdmin, navigate]);

  const handleAdminSignIn = async () => {
    clearAuthError();
    const status = await signInAsAdmin();
    if (status === 'authorized') {
      navigate('/admin/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to CampusConnect
        </Link>
        <Link
          to="/login"
          className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          Student Login
        </Link>
      </div>

      <main className="max-w-md w-full mx-auto my-12 bg-slate-900 border border-slate-800 rounded-xl p-8 sm:p-10">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 mb-5">
          <Lock className="w-5 h-5" />
        </div>

        <h1 className="text-2xl font-display font-bold tracking-tight text-white">
          CampusConnect Admin Portal
        </h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Restricted operations console for authorized CampusConnect administrators. Public admin
          registration is disabled.
        </p>

        {(adminAccessDenied || (authReady && user && !isAdmin)) && (
          <div
            role="alert"
            className="mt-6 p-4 rounded-lg bg-red-950/70 border border-red-800/80 text-red-200 text-sm flex items-start gap-3"
          >
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-100">
                Access Denied. You are not authorized to access the Admin Portal.
              </p>
              {user && (
                <p className="mt-1 text-xs text-red-300/90">
                  Signed in as {user.email}. Switch to an authorized administrator account or use
                  the Student Portal.
                </p>
              )}
              {user && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="text-xs font-semibold text-white underline hover:text-red-100"
                  >
                    Sign out
                  </button>
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-blue-300 underline hover:text-blue-200"
                  >
                    Go to Student Portal
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {authError && !adminAccessDenied && (
          <div
            role="alert"
            className="mt-6 p-4 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-200 text-xs"
          >
            {authError}
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            disabled={authLoading}
            onClick={handleAdminSignIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-lg bg-white text-slate-950 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.28a12 12 0 0 0 0 10.8l4-3.1z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4 3.1c.95-2.84 3.6-4.95 6.72-4.95z"
              />
            </svg>
            {authLoading ? 'Verifying administrator...' : 'Continue with Google'}
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-500 leading-relaxed">
          Authorization is verified against Firestore administrator records and security rules on
          every request.
        </p>
      </main>

      <footer className="max-w-7xl w-full mx-auto text-xs text-slate-500 flex items-center justify-between">
        <span>CampusConnect Operations</span>
        <span>Protected Portal</span>
      </footer>
    </div>
  );
}
