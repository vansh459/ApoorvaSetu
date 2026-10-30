import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Clock3,
  Workflow,
  CalendarDays,
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
import { UserRole } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: any;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Build role-specific navigation strictly matching prompt specifications
  const getNavItems = (): NavItem[] => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'User Management', path: '/admin/users', icon: Users },
          { name: 'Role & Permissions', path: '/admin/roles', icon: KeyRound },
          { name: 'Institution Management', path: '/institutes', icon: Building2 },
          { name: 'Regional Management', path: '/regions-officials', icon: MapPin },
          { name: 'System Configuration', path: '/admin/system-config', icon: Sliders },
          { name: 'Audit Logs', path: '/admin/audit-logs', icon: History },
          { name: 'Reports & Analytics', path: '/reports', icon: FileBarChart },
          { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount || 3 }
        ];

      case 'AICTE_ADMIN':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'Applications', path: '/applications', icon: Clock3 },
          { name: 'Institutes', path: '/institutes', icon: Building2 },
          { name: 'Stages & Workflow', path: '/workflow', icon: Workflow },
          { name: 'EVC Scheduling', path: '/evc-scheduling', icon: CalendarDays },
          { name: 'Undertakings & Compliance', path: '/compliance', icon: ShieldCheck },
          { name: 'Documents', path: '/documents', icon: FolderArchive },
          { name: 'Reports & Evidence', path: '/reports', icon: FileBarChart },
          { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount || 3 }
        ];

      case 'REGIONAL_OFFICER':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'Regional Applications', path: '/applications', icon: Clock3 },
          { name: 'Institutes', path: '/institutes', icon: Building2 },
          { name: 'Document Verification', path: '/documents', icon: FileCheck },
          { name: 'EVC Coordination', path: '/evc-scheduling', icon: CalendarDays },
          { name: 'Compliance Monitoring', path: '/compliance', icon: ShieldCheck },
          { name: 'Escalations', path: '/regional/escalations', icon: AlertCircle },
          { name: 'Regional Reports', path: '/reports', icon: FileBarChart },
          { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount || 2 }
        ];

      case 'EVC_MEMBER':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'My Assigned Visits', path: '/evc/my-visits', icon: CalendarDays },
          { name: 'EVC Calendar', path: '/evc-scheduling', icon: Clock3 },
          { name: 'Institution Details', path: '/institutes', icon: Building2 },
          { name: 'Inspection Checklist', path: '/evc/checklist', icon: ClipboardCheck },
          { name: 'Evidence Upload', path: '/evc/evidence', icon: UploadCloud },
          { name: 'Inspection Reports', path: '/evc/my-visits', icon: FolderArchive },
          { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount || 1 }
        ];

      case 'INSTITUTION_ADMIN':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'Institution Profile', path: '/institution/profile', icon: UserCircle },
          { name: 'My Applications', path: '/applications', icon: Clock3 },
          { name: 'Submit New Application', path: '/institution/apply', icon: FilePlus2 },
          { name: 'Application Tracking', path: '/institution/tracking', icon: Compass },
          { name: 'Documents', path: '/documents', icon: FolderArchive },
          { name: 'Undertakings & Compliance', path: '/compliance', icon: ShieldCheck },
          { name: 'EVC Visits', path: '/evc-scheduling', icon: CalendarDays },
          { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount || 2 }
        ];

      default:
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'Applications', path: '/applications', icon: Clock3 },
          { name: 'Institutes', path: '/institutes', icon: Building2 },
          { name: 'Reports', path: '/reports', icon: FileBarChart },
          { name: 'Notifications', path: '/notifications', icon: Bell }
        ];
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container with deep navy/midnight gradient matching reference */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a1426] text-slate-200 flex flex-col transition-transform duration-300 ease-in-out border-r border-[#15233c] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#15233c]/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <img
                src="/apoorvasetu-icon.png"
                alt="ApoorvaSetu Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>

            <div>
              <div className="text-white font-bold text-base leading-tight tracking-wide">
                ApoorvaSetu
              </div>
              <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                AICTE Approvals, Simplified
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge Indicator */}
        <div className="px-3.5 pt-3 pb-1">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-between">
            <span className="truncate">{user?.roleTitle || 'AICTE User'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-180 ease-out cursor-pointer ${
                    isActive
                      ? 'bg-[#0284c7] text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 active:scale-[0.99]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-4 h-4 transition-transform duration-200 ease-out ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:scale-110 group-hover:text-sky-300'
                        }`}
                      />
                      <span className="transition-colors duration-150">{item.name}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-transform duration-200 group-hover:scale-105 ${
                          isActive
                            ? 'bg-white text-sky-700'
                            : 'bg-rose-500 text-white'
                        }`}
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

        {/* User Card at bottom of sidebar */}
        <div className="p-3.5 border-t border-[#15233c]/80 bg-[#070e1b]/80">
          <div className="flex items-center justify-between p-1.5 rounded-xl">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white/10 shrink-0 transition-transform duration-200 hover:scale-105">
                {user?.initials || 'AS'}
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold text-xs truncate">
                  {user?.name || 'Amit Sharma'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user?.roleTitle || 'AICTE Official'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
