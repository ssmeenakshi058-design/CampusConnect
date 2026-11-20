import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Compass,
  FileText,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCircle,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../../components/NotificationDrawer';
import { PLATFORM_DISCLAIMER } from '../../types/campus';

const STUDENT_NAV = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/explore', label: 'Explore Opportunities', icon: Compass },
  { to: '/student/internships', label: 'Internships', icon: Briefcase },
  { to: '/student/part-time', label: 'Part-Time Jobs', icon: Clock },
  { to: '/student/full-time', label: 'Full-Time Jobs', icon: Building2 },
  { to: '/student/live-projects', label: 'Live Projects', icon: FolderGit2 },
  { to: '/student/events', label: 'Campus Events', icon: Calendar },
  { to: '/student/skill-development', label: 'Skill Development', icon: BookOpen },
  { to: '/student/applications', label: 'My Applications', icon: FileText },
  { to: '/student/saved', label: 'Saved Opportunities', icon: Bookmark },
  { to: '/student/profile', label: 'My Profile', icon: UserCircle },
];

export function StudentLayout() {
  const { user, studentProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentNav = STUDENT_NAV.find((item) => location.pathname.startsWith(item.to));
  const breadcrumbTitle = currentNav?.label || 'Opportunity Details';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <Link
            to="/student/dashboard"
            className="text-lg font-display font-extrabold tracking-tight text-slate-950 whitespace-nowrap"
          >
            CampusConnect
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {STUDENT_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex bg-slate-950/40">
          <aside className="w-64 bg-white h-full border-r border-slate-200 flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-display font-extrabold text-slate-950">
                CampusConnect
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="p-2 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {STUDENT_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-blue-50 text-blue-800 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <span className="hidden sm:inline">Student Portal</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-950 truncate">{breadcrumbTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user && <NotificationBell role="student" uid={user.uid} />}
            <Link
              to="/student/profile"
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {studentProfile?.photoUrl || user?.photoURL ? (
                <img
                  src={studentProfile?.photoUrl || user?.photoURL || ''}
                  alt={studentProfile?.fullName || 'Student profile'}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-md object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-blue-700 text-white text-xs font-bold flex items-center justify-center">
                  {(studentProfile?.fullName || user?.displayName || 'S')[0]}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                {studentProfile?.fullName || user?.displayName || 'Student'}
              </span>
            </Link>
          </div>
        </header>

        {studentProfile?.accountStatus === 'suspended' && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3 text-xs text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <span>
              Your student account is currently suspended by an administrator. You can view your
              existing records, but submitting new applications and profile edits are disabled.
            </span>
          </div>
        )}

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500">
          {PLATFORM_DISCLAIMER}
        </footer>
      </div>
    </div>
  );
}
