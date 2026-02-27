
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { EnvironmentSwitch } from './EnvironmentSwitch';

const NavItem: React.FC<{ to: string; icon: string; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`group flex items-center px-4 py-3 mb-2 rounded-xl transition-all duration-300 relative overflow-hidden ${
      active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:translate-x-1'
    }`}
  >
    <span className="text-xl mr-3 relative z-10">{icon}</span>
    <span className="font-medium relative z-10">{label}</span>
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-gold rounded-r-sm" />
    )}
  </Link>
);

export const Sidebar: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const userEmail = authService.getUser();

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-teal-primary text-white rounded-full shadow-lg"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <aside className={`
        fixed top-0 left-0 h-screen w-72 bg-gradient-to-b from-deep-teal to-teal-primary text-white z-40
        transform transition-transform duration-500 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-white/10 mb-6 text-center">
          <h1 className="font-serif text-2xl font-semibold tracking-[4px] uppercase mb-1">
            The School<br/>of Breath
          </h1>
          <p className="text-[10px] tracking-[2px] uppercase opacity-60">Admin Dashboard</p>
        </div>

        <div className="px-6 mb-4 py-4 bg-white/5 mx-4 rounded-2xl flex items-center gap-3 border border-white/5">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
            {userEmail?.[0].toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gold uppercase tracking-widest leading-none mb-1">Active Admin</p>
            <p className="text-xs text-white/80 font-medium truncate">{userEmail}</p>
          </div>
        </div>
        <div className="px-6 mb-8 mx-4">
          <EnvironmentSwitch />
        </div>

        <nav className="px-4 custom-scrollbar overflow-y-auto h-[calc(100vh-320px)]">
          <div className="mb-6">
            <p className="px-4 mb-3 text-[10px] tracking-widest uppercase opacity-40 font-bold">Overview</p>
            <NavItem to="/" icon="🏠" label="Dashboard" active={location.pathname === '/'} />
          </div>

          <div className="mb-6">
            <p className="px-4 mb-3 text-[10px] tracking-widest uppercase opacity-40 font-bold">Content</p>
            <NavItem to="/sleep-music" icon="🌙" label="Sleep Music" active={location.pathname === '/sleep-music'} />
            <NavItem to="/meditation" icon="🧘" label="Meditation" active={location.pathname === '/meditation'} />
            <NavItem to="/mantras" icon="🕉️" label="Mantras" active={location.pathname === '/mantras'} />
            <NavItem to="/chakra" icon="✨" label="Chakra Music" active={location.pathname === '/chakra'} />
            <NavItem to="/courses" icon="📖" label="My Courses" active={location.pathname === '/courses'} />
          </div>

          <div className="mb-6">
            <p className="px-4 mb-3 text-[10px] tracking-widest uppercase opacity-40 font-bold">System</p>
            <NavItem to="/notifications" icon="🔔" label="Notifications" active={location.pathname === '/notifications'} />
            <NavItem to="/settings" icon="⚙️" label="Settings" active={location.pathname === '/settings'} />
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <button 
              onClick={onLogout}
              className="w-full flex items-center px-4 py-3 text-white/60 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all group"
            >
              <span className="text-xl mr-3 group-hover:scale-110 transition-transform">🚪</span>
              <span className="font-medium">Logout Session</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};
