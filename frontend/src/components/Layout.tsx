import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { ROLE_THEME } from '../lib/roleTheme';
import type { RoleName } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV: Record<RoleName, NavItem[]> = {
  trainee: [
    { to: '/trainee', label: 'Home', end: true },
    { to: '/trainee/modules', label: 'Modules' },
    { to: '/trainee/results', label: 'Results' },
  ],
  trainer: [
    { to: '/trainer', label: 'Home', end: true },
    { to: '/trainer/queue', label: 'Grading Queue' },
    { to: '/trainer/modules', label: 'Modules' },
    { to: '/trainer/resources', label: 'Resources' },
  ],
  exam_controller: [
    { to: '/exam-controller', label: 'Home', end: true },
    { to: '/exam-controller/assessments', label: 'Assessment Approvals' },
    { to: '/exam-controller/certification', label: 'Certification Queue' },
    { to: '/exam-controller/conflicts', label: 'Sync Conflicts' },
  ],
  admin: [
    { to: '/admin', label: 'Home', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/trainees', label: 'Trainee Records' },
    { to: '/admin/institutions', label: 'Institutions & Trades' },
    { to: '/admin/modules', label: 'Modules & Classes' },
  ],
};

export function Layout() {
  const { user, activeRole, setActiveRole, logout } = useAuth();

  if (!user || !activeRole) return null;
  const theme = ROLE_THEME[activeRole];
  const navItems = NAV[activeRole];

  return (
    <div className="flex min-h-screen flex-col">
      <header className={`${theme.bg} flex items-center justify-between px-4 py-3 text-white shadow`}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">TVET e-Gateway</span>
          <span className="hidden rounded bg-white/15 px-2 py-0.5 text-xs sm:inline">{theme.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {user.roles.length > 1 && (
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as RoleName)}
              className="rounded border-none bg-white/15 px-2 py-1 text-xs text-white"
              aria-label="Switch role"
            >
              {user.roles.map((role) => (
                <option key={role} value={role} className="text-slate-900">
                  {ROLE_THEME[role].label}
                </option>
              ))}
            </select>
          )}
          <div className="rounded-full bg-white/15 p-1.5">
            <NotificationBell />
          </div>
          <button type="button" onClick={logout} className="rounded bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            Log out
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col sm:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 sm:w-56 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:px-3 sm:py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? `${theme.bg} text-white` : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
