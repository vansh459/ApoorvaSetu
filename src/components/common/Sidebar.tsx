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
  Users2,
  FileBarChart,
  Bell,
  Landmark,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { notifications } = useApp();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Applications', path: '/applications', icon: Clock3 },
    { name: 'Institutes', path: '/institutes', icon: Building2 },
    { name: 'Stages & Workflow', path: '/workflow', icon: Workflow },
    { name: 'EVC Scheduling', path: '/evc-scheduling', icon: CalendarDays },
    { name: 'Undertakings & Compliance', path: '/compliance', icon: ShieldCheck },
    { name: 'Documents', path: '/documents', icon: FolderArchive },
    { name: 'Regions & Officials', path: '/regions-officials', icon: Users2 },
    { name: 'Reports', path: '/reports', icon: FileBarChart },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
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

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a1526] text-slate-200 flex flex-col transition-transform duration-300 ease-in-out border-r border-[#15233c] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#15233c]">
          <div className="flex items-center space-x-3">
            {/* AICTE Gold Emblem Seal */}
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 p-0.5 flex items-center justify-center shadow-xs">
              <div className="w-full h-full rounded-full bg-[#0a1526] flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border border-amber-400/90 flex items-center justify-center">
                  <span className="text-[7px] font-black tracking-tighter text-amber-300">
                    AICTE
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-wide">
                AICTE
              </div>
              <div className="text-[11px] text-slate-400 font-normal leading-tight">
                Approval Management System
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
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#2563eb] text-white shadow-xs'
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
                            ? 'bg-white text-blue-700'
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

        {/* Bottom AICTE Motto Card matching reference screenshot */}
        <div className="p-4 border-t border-[#15233c]">
          <div className="bg-[#0e1d35] border border-[#1b2f52] rounded-xl p-3 text-center">
            <div className="text-white font-bold text-xs tracking-wider">
              AICTE
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug font-normal">
              Facilitating Quality Technical Education for a Better Tomorrow
            </p>
            {/* Greek pillar landmark icon at the bottom */}
            <div className="mt-3 flex justify-center text-blue-400/80">
              <Landmark className="w-6 h-6 stroke-[1.5]" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
