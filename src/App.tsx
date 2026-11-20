import React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { StudentLoginPage } from './pages/StudentLoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { StudentLayout } from './pages/student/StudentLayout';
import { StudentDashboardHome } from './pages/student/StudentDashboardHome';
import { OpportunityMarketplace } from './pages/student/OpportunityMarketplace';
import { OpportunityDetailPage } from './pages/student/OpportunityDetailPage';
import { StudentApplicationsPage } from './pages/student/StudentApplicationsPage';
import { SavedOpportunitiesPage } from './pages/student/SavedOpportunitiesPage';
import { StudentEventsPage } from './pages/student/StudentEventsPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { ManageStudentsPage } from './pages/admin/ManageStudentsPage';
import { ManageOpportunitiesPage } from './pages/admin/ManageOpportunitiesPage';
import { ManageCompaniesPage } from './pages/admin/ManageCompaniesPage';
import { ManageApplicationsPage } from './pages/admin/ManageApplicationsPage';
import { ManageEventsPage } from './pages/admin/ManageEventsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminDemoDataPage } from './pages/admin/AdminDemoDataPage';
import { AdminProfilePage } from './pages/admin/AdminProfilePage';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-sm font-display font-bold text-slate-900">CampusConnect</p>
        <p className="text-xs text-slate-500">Verifying session...</p>
      </div>
    </div>
  );
}

function StudentRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  if (!authReady) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, authReady, logout } = useAuth();
  if (!authReady) return <LoadingScreen />;
  if (!user) return <Navigate to="/admin/login" replace />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-display font-bold text-white">
            Access Denied. You are not authorized to access the Admin Portal.
          </h1>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            This portal is restricted to verified CampusConnect administrators. Attempting to
            access administrative routes with a student account is blocked.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/student/dashboard"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
            >
              Return to Student Dashboard
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="px-4 py-2 text-xs font-semibold text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<StudentLoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/opportunities/:opportunityId"
              element={<OpportunityDetailPage isPublicView />}
            />

            {/* Student Portal Routes */}
            <Route
              path="/student"
              element={
                <StudentRouteGuard>
                  <StudentLayout />
                </StudentRouteGuard>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboardHome />} />
              <Route path="explore" element={<OpportunityMarketplace />} />
              <Route
                path="internships"
                element={
                  <OpportunityMarketplace
                    presetCategory="internship"
                    pageTitle="Internships"
                    pageSubtitle="Internships across Finance, Marketing, HR, Analytics, Tech, Operations, Design, and Research."
                    unitLabel="Opportunities"
                  />
                }
              />
              <Route
                path="part-time"
                element={
                  <OpportunityMarketplace
                    presetCategory="part_time"
                    pageTitle="Part-Time Jobs"
                    pageSubtitle="Flexible part-time student roles structured around college lecture schedules."
                    unitLabel="Opportunities"
                  />
                }
              />
              <Route
                path="full-time"
                element={
                  <OpportunityMarketplace
                    presetCategory="entry_level"
                    pageTitle="Full-Time Jobs"
                    pageSubtitle="Entry-level graduate trainee, analyst, marketing, finance, and operations roles."
                    unitLabel="Opportunities"
                  />
                }
              />
              <Route
                path="live-projects"
                element={
                  <OpportunityMarketplace
                    presetCategory="live_project"
                    pageTitle="Live Projects"
                    pageSubtitle="Short-term mentored industry projects in Finance, Analytics, Marketing, and Operations."
                    unitLabel="Projects"
                  />
                }
              />
              <Route
                path="skill-development"
                element={
                  <OpportunityMarketplace
                    presetCategory="skill_building"
                    pageTitle="Skill Development"
                    pageSubtitle="Practical training programs in Excel, Power BI, SQL, Python, Financial Modelling, and Career Readiness."
                    unitLabel="Programs"
                  />
                }
              />
              <Route path="opportunities/:opportunityId" element={<OpportunityDetailPage />} />
              <Route path="events" element={<StudentEventsPage />} />
              <Route path="applications" element={<StudentApplicationsPage />} />
              <Route path="saved" element={<SavedOpportunitiesPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
            </Route>

            {/* Admin Portal Routes */}
            <Route
              path="/admin"
              element={
                <AdminRouteGuard>
                  <AdminLayout />
                </AdminRouteGuard>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminOverviewPage />} />
              <Route path="students" element={<ManageStudentsPage />} />
              <Route path="opportunities" element={<ManageOpportunitiesPage />} />
              <Route path="companies" element={<ManageCompaniesPage />} />
              <Route path="applications" element={<ManageApplicationsPage />} />
              <Route path="events" element={<ManageEventsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="demo-data" element={<AdminDemoDataPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
