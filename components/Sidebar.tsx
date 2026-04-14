
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

const NavItem: React.FC<{ to: string; icon: string; label: string; active: boolean; onClick?: () => void }> = ({
  to,
  icon,
  label,
  active,
  onClick,
}) => (
  <Link
    to={to}
    onClick={onClick}
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
  const [showMobileMore, setShowMobileMore] = React.useState(false);
  const userEmail = authService.getUser();
  const closeMenu = () => setIsOpen(false);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
        setShowMobileMore(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full bg-deep-teal px-4 py-2 text-sm font-semibold text-white shadow-lg"
      >
        {isOpen ? '✕ Close' : '☰ Menu'}
      </button>

      {isOpen && (
        <button
          type="button"
          onClick={closeMenu}
          className="fixed inset-0 z-30 bg-slate-900/45 lg:hidden"
          aria-label="Close menu overlay"
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-screen w-[86vw] max-w-[320px] bg-gradient-to-b from-deep-teal to-teal-primary text-white z-40
        transform transition-transform duration-500 ease-in-out lg:translate-x-0
        lg:w-72
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="mb-5 border-b border-white/10 p-5 pt-16 text-center lg:mb-6 lg:p-8 lg:pt-8">
          <h1 className="mb-1 font-serif text-xl font-semibold uppercase tracking-[3px] lg:text-2xl lg:tracking-[4px]">
            The School<br/>of Breath
          </h1>
          <p className="text-[10px] tracking-[2px] uppercase opacity-60">Admin Dashboard</p>
        </div>

        <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 lg:px-6 lg:py-4">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
            {userEmail?.[0].toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gold uppercase tracking-widest leading-none mb-1">Active Admin</p>
            <p className="text-xs text-white/80 font-medium truncate">{userEmail}</p>
          </div>
        </div>
        <nav className="custom-scrollbar h-[calc(100vh-280px)] overflow-y-auto px-4 lg:h-[calc(100vh-320px)]">
          <div className="mb-6">
            <p className="px-4 mb-3 text-[10px] tracking-widest uppercase opacity-40 font-bold">Overview</p>
            <NavItem to="/" icon="🏠" label="Dashboard" active={location.pathname === '/'} onClick={closeMenu} />
          </div>

          <div className="mb-6">
            <p className="px-4 mb-3 text-[10px] tracking-widest uppercase opacity-40 font-bold">Core Features</p>
            <NavItem to="/gmail-ai" icon="✉️" label="Gmail AI" active={location.pathname === '/gmail-ai'} onClick={closeMenu} />
            <NavItem to="/notifications" icon="🔔" label="Notifications" active={location.pathname === '/notifications'} onClick={closeMenu} />
            <NavItem to="/membership-audit" icon="📊" label="Membership Audit" active={location.pathname === '/membership-audit'} onClick={closeMenu} />
          </div>

          <div className="hidden mb-6 lg:block">
            <p className="px-4 mb-3 text-[10px] tracking-widest uppercase opacity-40 font-bold">Content</p>
            <NavItem to="/sleep-music" icon="🌙" label="Sleep Music" active={location.pathname === '/sleep-music'} />
            <NavItem to="/meditation" icon="🧘" label="Meditation" active={location.pathname === '/meditation'} />
            <NavItem to="/mantras" icon="🕉️" label="Mantras" active={location.pathname === '/mantras'} />
            <NavItem to="/playlists" icon="🎵" label="Playlists" active={location.pathname === '/playlists'} />
            <NavItem to="/chakra" icon="✨" label="Chakra Music" active={location.pathname === '/chakra'} />
            <NavItem to="/courses" icon="📖" label="My Courses" active={location.pathname === '/courses'} />
          </div>

          <div className="mb-6 lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobileMore((value) => !value)}
              className="w-full rounded-xl border border-white/20 px-4 py-2 text-left text-sm font-semibold text-white/90"
            >
              {showMobileMore ? 'Hide extra pages' : 'Show all pages'}
            </button>

            {showMobileMore && (
              <div className="mt-3">
                <NavItem to="/sleep-music" icon="🌙" label="Sleep Music" active={location.pathname === '/sleep-music'} onClick={closeMenu} />
                <NavItem to="/meditation" icon="🧘" label="Meditation" active={location.pathname === '/meditation'} onClick={closeMenu} />
                <NavItem to="/mantras" icon="🕉️" label="Mantras" active={location.pathname === '/mantras'} onClick={closeMenu} />
                <NavItem to="/playlists" icon="🎵" label="Playlists" active={location.pathname === '/playlists'} onClick={closeMenu} />
                <NavItem to="/chakra" icon="✨" label="Chakra Music" active={location.pathname === '/chakra'} onClick={closeMenu} />
                <NavItem to="/courses" icon="📖" label="My Courses" active={location.pathname === '/courses'} onClick={closeMenu} />
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <button 
              onClick={() => {
                closeMenu();
                onLogout();
              }}
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
