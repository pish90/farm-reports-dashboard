import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const BASE_NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: '🏠', roles: null },
  { to: '/reports', label: 'Reports', icon: '📋', roles: null },
];

const ADMIN_NAV_LINKS = [
  { to: '/audit-logs', label: 'Audit Log', icon: '🔍', roles: ['ADMIN', 'MANAGER', 'OPERATIONS_MANAGER'] },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/reports': 'Reports',
  '/audit-logs': 'Audit Log',
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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-green-800 text-white">
        <div className="px-6 py-5 border-b border-green-700">
          <span className="text-xl font-bold tracking-wide">🌿 Farm Reports</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
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
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="text-sm text-gray-600">{user.userName}</span>
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
              className="ml-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
