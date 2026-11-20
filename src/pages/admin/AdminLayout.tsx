import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  FileCheck2,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../../components/NotificationDrawer';

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Manage Students', icon: Users },
  { to: '/admin/opportunities', label: 'Manage Opportunities', icon: Briefcase },
  { to: '/admin/companies', label: 'Manage Companies', icon: Building2 },
  { to: '/admin/applications', label: 'Manage Applications', icon: FileCheck2 },
  { to: '/admin/events', label: 'Manage Events', icon: Calendar },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/profile', label: 'Admin Profile', icon: Shield },
];

export function AdminLayout() {
  const { user, adminProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentNav = ADMIN_NAV.find((item) => location.pathname.startsWith(item.to));
  const breadcrumbTitle = currentNav?.label || 'Admin Operations';

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Dark Structural Admin Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-950 text-slate-200 shrink-0 sticky top-0 h-screen border-r border-slate-800">
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <Link
            to="/admin/dashboard"
            className="text-base font-display font-extrabold tracking-tight text-white whitespace-nowrap"
          >
            CampusConnect Admin
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-700 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-950/60 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex bg-slate-950/60">
          <aside className="w-64 bg-slate-950 text-slate-200 h-full flex flex-col border-r border-slate-800">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <span className="text-base font-display font-extrabold text-white">
                CampusConnect Admin
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin menu"
                className="p-2 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive ? 'bg-blue-700 text-white' : 'text-slate-400 hover:bg-slate-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-950/60"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Operations Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <span className="hidden sm:inline">Admin Console</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-950 truncate">{breadcrumbTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user && <NotificationBell role="admin" uid={user.uid} />}
            <Link
              to="/admin/profile"
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-slate-950 text-white text-xs font-bold flex items-center justify-center">
                {(adminProfile?.fullName || user?.displayName || 'A')[0]}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-800 max-w-[150px] truncate">
                {adminProfile?.fullName || user?.displayName || 'Administrator'}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
