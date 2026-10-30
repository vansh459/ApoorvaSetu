import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock3,
  Building2,
  Workflow,
  CalendarDays,
  ShieldCheck,
  FolderArchive,
  FileBarChart,
  Bell,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { notifications, currentUser } = useApp();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems = [
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
        {/* Brand Header with stylized ApoorvaSetu 'A' emblem */}
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
                ApprovaSetu
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

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
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
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0284c7] text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
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

        {/* Bottom User Profile Section in Sidebar matching reference screenshot */}
        <div className="p-3.5 border-t border-[#15233c]/80 bg-[#070e1b]/60">
          <div className="flex items-center space-x-3 p-1.5 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white/10 shrink-0">
              AS
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-xs truncate">
                Amit Sharma
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                AICTE Official
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
