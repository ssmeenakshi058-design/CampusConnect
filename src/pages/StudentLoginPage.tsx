import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CAMPUS_ASSETS, PLATFORM_DISCLAIMER } from '../types/campus';
import { ImageWithFallback } from '../components/BrandMark';

export function StudentLoginPage() {
  const { user, studentProfile, authReady, authLoading, authError, signInAsStudent, clearAuthError } =
    useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authReady && user && studentProfile) {
      navigate('/student/dashboard', { replace: true });
    }
  }, [authReady, user, studentProfile, navigate]);

  const handleGoogleSignIn = async () => {
    clearAuthError();
    const ok = await signInAsStudent();
    if (ok) {
      navigate('/student/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 grid grid-cols-1 lg:grid-cols-12">
      {/* Left Authentication Column */}
      <div className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white border-r border-slate-200">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-950 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to CampusConnect
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto my-12">
          <p className="text-xs font-semibold text-blue-700">Student Portal</p>
          <h1 className="mt-2 text-3xl font-display font-extrabold tracking-tight text-slate-950">
            Welcome to CampusConnect
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Find internships, explore opportunities and build your career.
          </p>

          {authError && (
            <div
              role="alert"
              className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="mt-8">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-lg bg-slate-950 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
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
              {authLoading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <p className="flex items-center gap-2 text-slate-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              Your student profile and application history sync automatically across sessions.
            </p>
            <p>{PLATFORM_DISCLAIMER}</p>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between gap-4">
          <span>Dehradun & Uttarakhand Edition</span>
          <Link to="/admin/login" className="font-medium text-slate-700 hover:text-slate-950">
            Administrator Login
          </Link>
        </div>
      </div>

      {/* Right Editorial Showcase Column */}
      <div className="hidden lg:flex lg:col-span-6 p-12 bg-slate-900 text-white flex-col justify-between">
        <div>
          <span className="text-sm font-display font-bold tracking-tight text-white">
            CampusConnect
          </span>
        </div>

        <div className="my-8 rounded-xl overflow-hidden border border-slate-800 aspect-[4/3]">
          <ImageWithFallback
            src={CAMPUS_ASSETS.studentLogin}
            alt="College students working together at a modern university career studio"
            fallbackTitle="CampusConnect Student Career Center"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="max-w-lg">
          <p className="text-lg font-display font-semibold leading-snug text-slate-100">
            Verified internships, part-time roles, and mentored live projects curated for college
            students across Dehradun and India.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Transparent rule-based matching by skills, academic course, and preferred work mode.
          </p>
        </div>
      </div>
    </div>
  );
}
