import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Building2,
  MapPin,
  Sliders,
  History,
  FileBarChart,
  Bell,
  BellRing,
  TrendingUp,
  Clock3,
  Workflow,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  FolderArchive,
  FileCheck,
  AlertCircle,
  ClipboardCheck,
  UploadCloud,
  UserCircle,
  FilePlus2,
  Compass,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterAlertsForUser } from '../../services/rbacService';
import { Avatar, IconButton } from '../ui';
import { cn } from '../../utils/cn';
import type { UserRole } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, alerts } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const openAlertCount = filterAlertsForUser(alerts, user).filter(
    (alert) => alert.status !== 'Resolved'
  ).length;

  const getNavGroups = (): NavGroup[] => {
    switch (user?.role as UserRole | undefined) {
      case 'SUPER_ADMIN':
        return [
          {
            title: 'Workspace',
            items: [
              { name: 'Dashboard', path: '/', icon: LayoutDashboard },
              { name: 'User management', path: '/admin/users', icon: Users },
              { name: 'Roles & permissions', path: '/admin/roles', icon: KeyRound },
              { name: 'Institutions', path: '/institutes', icon: Building2 },
              { name: 'Regional offices', path: '/regions-officials', icon: MapPin }
            ]
          },
          {
            title: 'Oversight',
            items: [
              { name: 'Pendency & workload', path: '/pendency', icon: TrendingUp },
              { name: 'Reports', path: '/reports', icon: FileBarChart },
              { name: 'Alert center', path: '/alerts', icon: BellRing, badge: openAlertCount },
              { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
            ]
          },
          {
            title: 'System',
            items: [
              { name: 'Configuration', path: '/admin/system-config', icon: Sliders },
              { name: 'Audit logs', path: '/admin/audit-logs', icon: History }
            ]
          }
        ];

      case 'AICTE_ADMIN':
        return [
          {
            title: 'Workspace',
            items: [
              { name: 'Dashboard', path: '/', icon: LayoutDashboard },
              { name: 'Applications', path: '/applications', icon: Clock3 },
              { name: 'Institutions', path: '/institutes', icon: Building2 },
              { name: 'Stages & workflow', path: '/workflow', icon: Workflow }
            ]
          },
          {
            title: 'Operations',
            items: [
              { name: 'Pendency & workload', path: '/pendency', icon: TrendingUp },
              { name: 'EVC scheduling', path: '/evc-scheduling', icon: CalendarDays },
              { name: 'EVC queue', path: '/evc/queue', icon: ClipboardList },
              { name: 'Compliance', path: '/compliance', icon: ShieldCheck },
              { name: 'Documents', path: '/documents', icon: FolderArchive }
            ]
          },
          {
            title: 'Oversight',
            items: [
              { name: 'Reports', path: '/reports', icon: FileBarChart },
              { name: 'Alert center', path: '/alerts', icon: BellRing, badge: openAlertCount },
              { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
            ]
          }
        ];

      case 'REGIONAL_OFFICER':
        return [
          {
            title: 'Workspace',
            items: [
              { name: 'Dashboard', path: '/', icon: LayoutDashboard },
              { name: 'Regional applications', path: '/applications', icon: Clock3 },
              { name: 'Institutions', path: '/institutes', icon: Building2 },
              { name: 'Document verification', path: '/documents', icon: FileCheck },
              { name: 'EVC coordination', path: '/evc-scheduling', icon: CalendarDays },
              { name: 'EVC queue', path: '/evc/queue', icon: ClipboardList }
            ]
          },
          {
            title: 'Oversight',
            items: [
              { name: 'Compliance monitoring', path: '/compliance', icon: ShieldCheck },
              { name: 'Pendency & workload', path: '/pendency', icon: TrendingUp },
              { name: 'Escalations', path: '/regional/escalations', icon: AlertCircle },
              { name: 'Regional reports', path: '/reports', icon: FileBarChart },
              { name: 'Alert center', path: '/alerts', icon: BellRing, badge: openAlertCount },
              { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
            ]
          }
        ];

      case 'EVC_MEMBER':
        return [
          {
            title: 'Workspace',
            items: [
              { name: 'Dashboard', path: '/', icon: LayoutDashboard },
              { name: 'My assigned visits', path: '/evc/my-visits', icon: CalendarDays },
              { name: 'EVC queue', path: '/evc/queue', icon: ClipboardList },
              { name: 'EVC calendar', path: '/evc-scheduling', icon: Clock3 },
              { name: 'Institution details', path: '/institutes', icon: Building2 }
            ]
          },
          {
            title: 'Fieldwork',
            items: [
              { name: 'Inspection checklist', path: '/evc/checklist', icon: ClipboardCheck },
              { name: 'Evidence upload', path: '/evc/evidence', icon: UploadCloud }
            ]
          },
          {
            title: 'Oversight',
            items: [
              { name: 'Alert center', path: '/alerts', icon: BellRing, badge: openAlertCount },
              { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
            ]
          }
        ];

      case 'INSTITUTION_ADMIN':
        return [
          {
            title: 'Workspace',
            items: [
              { name: 'Dashboard', path: '/', icon: LayoutDashboard },
              { name: 'Institution profile', path: '/institution/profile', icon: UserCircle },
              { name: 'My applications', path: '/applications', icon: Clock3 },
              { name: 'Submit application', path: '/institution/apply', icon: FilePlus2 },
              { name: 'Application tracking', path: '/institution/tracking', icon: Compass }
            ]
          },
          {
            title: 'Compliance',
            items: [
              { name: 'Documents', path: '/documents', icon: FolderArchive },
              { name: 'Undertakings', path: '/compliance', icon: ShieldCheck },
              { name: 'EVC visits', path: '/evc-scheduling', icon: CalendarDays }
            ]
          },
          {
            title: 'Oversight',
            items: [
              { name: 'Alert center', path: '/alerts', icon: BellRing, badge: openAlertCount },
              { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
            ]
          }
        ];

      default:
        return [
          {
            title: 'Workspace',
            items: [
              { name: 'Dashboard', path: '/', icon: LayoutDashboard },
              { name: 'Applications', path: '/applications', icon: Clock3 },
              { name: 'Institutions', path: '/institutes', icon: Building2 },
              { name: 'Reports', path: '/reports', icon: FileBarChart },
              { name: 'Alert center', path: '/alerts', icon: BellRing, badge: openAlertCount },
              { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
            ]
          }
        ];
    }
  };

  const navGroups = getNavGroups();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="overlay-enter fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-line bg-paper transition-transform duration-300 ease-swift',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <Link to="/" onClick={closeOnMobile} className="flex min-w-0 items-center gap-2.5">
            <img
              src="/apoorvasetu-icon.png"
              alt=""
              className="h-8 w-8 shrink-0 object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight tracking-tight text-ink">
                ApoorvaSetu
              </span>
              <span className="block truncate text-xs leading-tight text-ink-2">
                AICTE approvals
              </span>
            </span>
          </Link>
          <IconButton label="Close navigation" size="sm" className="lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1 pt-4 text-xs font-medium text-ink-3">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={`${group.title}-${item.name}`}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={closeOnMobile}
                      className={({ isActive }) =>
                        cn(
                          'group flex h-9 items-center justify-between gap-2 rounded-control px-3 text-label transition-colors duration-150',
                          isActive
                            ? 'bg-surface font-semibold text-ink shadow-raise'
                            : 'font-medium text-ink-2 hover:bg-surface/60 hover:text-ink'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Icon
                              className={cn(
                                'h-[18px] w-[18px] shrink-0',
                                isActive ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2'
                              )}
                              strokeWidth={1.75}
                            />
                            <span className="truncate">{item.name}</span>
                          </span>

                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-1.5 text-xs font-medium',
                                isActive
                                  ? 'bg-accent-soft text-accent'
                                  : 'bg-danger-soft text-danger'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center justify-between gap-2 rounded-control px-2 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar initials={user?.initials || 'AS'} />
              <div className="min-w-0">
                <p className="truncate text-label font-semibold text-ink">
                  {user?.name || 'Signed in'}
                </p>
                <p className="text-xs leading-tight text-ink-2">
                  {user?.roleTitle || 'AICTE official'}
                </p>
              </div>
            </div>
            <IconButton label="Sign out" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </aside>
    </>
  );
};
