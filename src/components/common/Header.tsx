import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, RotateCcw, Check, ExternalLink, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const {
    searchQuery,
    setSearchQuery,
    applications,
    institutes,
    notifications,
    setSelectedApplication,
    setActiveModal,
    resetToInitialData,
    markAllNotificationsAsRead,
    currentUser,
    randomizeCurrentUser,
    randomizeAllNames
  } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter((n) => !n.read);

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

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Menu Toggle & Global Search Bar */}
      <div className="flex items-center space-x-3 flex-1 max-w-2xl">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar matching screenshot */}
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
              placeholder="Search by Application ID / Institute Name / Region / Stage..."
              className="w-full pl-10 pr-4 py-2 bg-[#f1f5f9] hover:bg-[#eaf0f7] focus:bg-white text-slate-800 text-xs sm:text-sm rounded-xl border border-transparent focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
              <div className="p-2 border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500 flex justify-between">
                <span>Search Results for "{searchQuery}"</span>
                <span className="text-slate-400">{filteredApps.length + filteredInsts.length} matches</span>
              </div>

              {filteredApps.length === 0 && filteredInsts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No applications or institutes match your search term.
                </div>
              ) : (
                <div className="py-2">
                  {filteredApps.length > 0 && (
                    <div className="px-3 py-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
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
                            <div className="text-xs font-semibold text-slate-800 flex items-center space-x-2">
                              <span className="text-blue-600">{app.id}</span>
                              <span className="text-slate-400">•</span>
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
                    <div className="px-3 py-1 border-t border-slate-100 mt-2 pt-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Institutes
                      </div>
                      {filteredInsts.slice(0, 3).map((inst) => (
                        <div
                          key={inst.id}
                          onClick={() => {
                            navigate('/institutes');
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              {inst.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {inst.city}, {inst.state} ({inst.region} Region)
                            </div>
                          </div>
                          <span className="text-[11px] text-blue-600 font-medium">
                            View Directory →
                          </span>
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

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center space-x-4 pl-3">
        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-slate-800">Notifications</span>
                  <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">
                    {unreadNotifications.length} new
                  </span>
                </div>
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all as read
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.slice(0, 4).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (notif.link) navigate(notif.link);
                      setIsNotifOpen(false);
                    }}
                    className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !notif.read ? 'bg-blue-50/40' : ''
                    }`}
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
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                >
                  View all notifications <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile with Random Name support */}
        <div ref={profileRef} className="relative">
          <div
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2.5 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {/* Avatar Pill circle */}
            <div className="w-9 h-9 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shadow-xs tracking-wider">
              {currentUser.initials}
            </div>

            {/* User details */}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">
                {currentUser.role}
              </div>
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Regional Officer (Class-I)
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    randomizeCurrentUser();
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-600 group-hover:rotate-180 transition-transform" />
                    <span className="font-semibold">Shuffle Profile Name</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-sm">Random</span>
                </button>

                <button
                  onClick={() => {
                    randomizeAllNames();
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-purple-700 hover:bg-purple-50 flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span className="font-semibold">Randomize All Names</span>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-sm">System</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/regions-officials');
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Jurisdiction & Office</span>
                </button>

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
              </div>

              <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 flex items-center justify-between">
                <span>AICTE Portal v4.2</span>
                <span className="text-emerald-600 font-medium flex items-center">
                  <Check className="w-2.5 h-2.5 mr-0.5" /> Online
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
