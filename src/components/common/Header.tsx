import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  RotateCcw,
  Check,
  ExternalLink,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Building2,
  Users,
  Compass,
  FileCheck2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { filterNotificationsForUser } from '../../services/rbacService';
import { UserRole } from '../../types';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    searchQuery,
    setSearchQuery,
    applications,
    institutes,
    notifications,
    setSelectedApplication,
    setActiveModal,
    resetToInitialData,
    markAllNotificationsAsRead
  } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Scoped notifications for this specific user role & jurisdiction
  const roleNotifications = filterNotificationsForUser(notifications, user);
  const unreadNotifications = roleNotifications.filter((n) => !n.read);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered results for global search dropdown
  const filteredApps = searchQuery.trim()
    ? applications.filter(
        (a) =>
          a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.instituteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.stage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredInsts = searchQuery.trim()
    ? institutes.filter(
        (i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle & Global Search Bar */}
      <div className="flex items-center space-x-3 flex-1 max-w-xl">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div ref={searchRef} className="relative w-full">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search by Application ID, Institution Name, Region / State..."
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] text-slate-800 text-xs sm:text-sm rounded-xl border border-slate-200/60 focus:bg-white focus:border-blue-400 focus:outline-hidden transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
              <div className="p-2 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 flex justify-between">
                <span>Search Results for "{searchQuery}"</span>
                <span className="text-slate-400">
                  {filteredApps.length + filteredInsts.length} matches
                </span>
              </div>

              {filteredApps.length === 0 && filteredInsts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No applications or institutes match your search.
                </div>
              ) : (
                <div className="py-2">
                  {filteredApps.length > 0 && (
                    <div className="px-3 py-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Applications
                      </div>
                      {filteredApps.slice(0, 4).map((app) => (
                        <div
                          key={app.id}
                          onClick={() => {
                            setSelectedApplication(app);
                            setActiveModal('app-detail');
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              <span className="text-blue-600">{app.id}</span>
                              <span className="text-slate-400 mx-1.5">•</span>
                              <span>{app.instituteName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {app.stage} — {app.region} Region
                            </div>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {app.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredInsts.length > 0 && (
                    <div className="px-3 py-1 border-t border-slate-100 mt-1 pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Institutes
                      </div>
                      {filteredInsts.slice(0, 3).map((inst) => (
                        <div
                          key={inst.id}
                          onClick={() => {
                            navigate('/institutes');
                            setIsSearchOpen(false);
                          }}
                          className="p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="text-xs font-semibold text-slate-800">
                            {inst.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            PID: {inst.code} — {inst.city}, {inst.state}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* AICTE National Banner Logo (Hidden on mobile, elegant on tablet/desktop) */}
        <div className="hidden md:flex items-center pr-3 border-r border-slate-200/80">
          <img
            src="/aicte-banner.png"
            alt="All India Council for Technical Education"
            className="h-8 lg:h-9 w-auto object-contain drop-shadow-xs"
          />
        </div>

        {/* Notifications Popover */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-800">
                    Notifications
                  </span>
                  {unreadNotifications.length > 0 && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">
                      {unreadNotifications.length} New
                    </span>
                  )}
                </div>
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Mark all as read
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {roleNotifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                      !notif.read ? 'bg-blue-50/30' : ''
                    }`}
                    onClick={() => {
                      if (notif.link) navigate(notif.link);
                      setIsNotifOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-semibold text-slate-800 leading-snug">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                      {notif.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setIsNotifOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center cursor-pointer"
                >
                  View all notifications <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Popover */}
        <div ref={profileRef} className="relative">
          <div
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2.5 cursor-pointer p-1 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {/* Avatar Pill circle */}
            <div className="w-9 h-9 rounded-full bg-[#1e40af] text-white flex items-center justify-center font-bold text-xs shadow-xs tracking-wider">
              {user?.initials || 'AS'}
            </div>

            {/* User details */}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user?.name || 'Amit Sharma'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">
                {user?.roleTitle || 'AICTE Official'}
              </div>
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center space-x-1.5 flex-wrap gap-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {user?.roleTitle}
                  </span>
                  {user?.region && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      {user.region}
                    </span>
                  )}
                </div>
              </div>

              {/* Active Role & Jurisdiction Metadata (Role switching strictly removed for security) */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Designation</span>
                  <span className="text-slate-800 font-semibold">{user?.designation || user?.roleTitle}</span>
                </div>
                {user?.instituteName && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Institution</span>
                    <span className="text-slate-800 font-semibold">{user.instituteName}</span>
                  </div>
                )}
                {user?.instituteId && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">AICTE PID</span>
                    <span className="text-slate-800 font-mono font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                      {user.instituteId}
                    </span>
                  </div>
                )}
                {user?.region && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Jurisdiction</span>
                    <span className="text-teal-700 font-bold">{user.region} Region</span>
                  </div>
                )}
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Session Status</span>
                  <span className="text-emerald-600 font-bold flex items-center">
                    <Check className="w-3 h-3 mr-0.5" /> Authenticated
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    resetToInitialData();
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center space-x-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Reset Demo Data</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="border-t border-slate-100 px-4 py-1.5 text-[10px] text-slate-400 flex items-center justify-between">
                <span>ApprovaSetu v4.2 RBAC</span>
                <span className="text-emerald-600 font-medium flex items-center">
                  <Check className="w-2.5 h-2.5 mr-0.5" /> Secure
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
