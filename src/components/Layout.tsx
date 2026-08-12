import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const BASE_NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: '🏠', roles: null },
  { to: '/reports', label: 'Reports', icon: '📋', roles: null },
  { to: '/payroll', label: 'Payroll', icon: '💰', roles: null },
  { to: '/casual-labour', label: 'Casual Labour', icon: '👷', roles: null },
  { to: '/settings', label: 'Farm Settings', icon: '⚙️', roles: null },
];

const ADMIN_NAV_LINKS = [
  { to: '/employees', label: 'Employees', icon: '🧑‍🌾', roles: ['ADMIN'] },
  { to: '/audit-logs', label: 'Audit Log', icon: '🔍', roles: ['ADMIN', 'MANAGER', 'OPERATIONS_MANAGER'] },
  { to: '/tools', label: 'Tools', icon: '🛠️', roles: ['ADMIN'] },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/reports': 'Reports',
  '/payroll': 'Payroll',
  '/casual-labour': 'Casual Labour',
  '/settings': 'Farm Settings',
  '/employees': 'Employees',
  '/audit-logs': 'Audit Log',
  '/tools': 'Tools',
};

function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'bg-red-100 text-red-800 border border-red-300';
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 border border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300';
  }
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/reports/') ? 'Report Detail' : 'Farm Reports');

  const visibleAdminLinks = ADMIN_NAV_LINKS.filter(
    (l) => !l.roles || (user?.role && l.roles.includes(user.role)),
  );

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-700 hover:text-white'
    }`;

  const navContent = (
    <>
      <div className="px-6 py-5 border-b border-green-700 flex items-center justify-between">
        <span className="text-xl font-bold tracking-wide">🌿 Farm Reports</span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-green-200 hover:text-white text-xl leading-none"
          aria-label="Close menu"
        >
          ×
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {BASE_NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className={navLinkClass}>
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}

        {visibleAdminLinks.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-green-400">
                Admin
              </span>
            </div>
            {visibleAdminLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="px-4 py-4 border-t border-green-700 text-xs text-green-300">
        Farm Reports v0.1
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — off-canvas drawer on mobile, static on lg+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-green-800 text-white transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 lg:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {navContent}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-800 text-xl leading-none flex-shrink-0"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-lg font-semibold text-gray-800 truncate">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {user && (
              <>
                <span className="hidden sm:inline text-sm text-gray-600">{user.userName}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </>
            )}
            <button
              onClick={logout}
              className="ml-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
