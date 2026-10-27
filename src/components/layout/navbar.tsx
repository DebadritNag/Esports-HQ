import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/button';
import {
  Compass,
  Trophy,
  Users,
  Bell,
  Crosshair,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Navbar: React.FC = () => {
  const { user, profile, signOut, isDemoMode, setDemoMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicNavLinks = [
    { label: 'Tournaments', path: '/radar', icon: Compass },
    { label: 'Organizers', path: '/organizers', icon: Trophy },
    { label: 'Teams', path: '/teams', icon: Users },
  ];

  const authenticatedNavLinks = [
    { label: 'Radar', path: '/radar', icon: Compass },
    { label: 'Dashboard', path: '/dashboard', icon: Crosshair },
    { label: 'Teams & Strats', path: '/teams', icon: Users },
    { label: 'Reminders', path: '/reminders', icon: Bell },
  ];

  const links = user ? authenticatedNavLinks : publicNavLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-editorial-surface/95 backdrop-blur-sm border-b border-editorial-border">
      {/* Demo Mode Notice Banner if active */}
      {isDemoMode && (
        <div className="bg-editorial-orange text-white text-[11px] font-mono py-1 px-4 text-center font-semibold tracking-wider flex items-center justify-center gap-2">
          <span>DEMO PREVIEW MODE ACTIVE (Displaying sample tournament rosters)</span>
          <button
            onClick={() => setDemoMode(false)}
            className="underline hover:text-white/80 transition-colors ml-2"
          >
            Switch to Live API
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-editorial-dark flex items-center justify-center text-editorial-ivory font-heading font-bold text-sm tracking-tighter border border-editorial-charcoal group-hover:bg-editorial-green transition-colors">
              HQ
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-base tracking-tight leading-none text-editorial-charcoal">
                ESPORTS HQ
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-editorial-muted leading-tight mt-0.5">
                Free Fire Circuit
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive =
                location.pathname === link.path ||
                (link.path !== '/' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors',
                    isActive
                      ? 'bg-editorial-ivory text-editorial-charcoal border border-editorial-border'
                      : 'text-editorial-muted hover:text-editorial-charcoal hover:bg-editorial-ivory/60'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right CTA / User Menu */}
        <div className="hidden md:flex items-center gap-3">
          {/* Demo toggle */}
          <button
            onClick={() => setDemoMode(!isDemoMode)}
            className={cn(
              'px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider border transition-colors flex items-center gap-1.5',
              isDemoMode
                ? 'bg-editorial-orange-light text-editorial-orange border-[#F6CEB4]'
                : 'bg-transparent text-editorial-muted border-editorial-border hover:border-editorial-muted'
            )}
            title="Toggle between live backend connection and demo preview data"
          >
            <Sparkles className="w-3 h-3" />
            <span>{isDemoMode ? 'Demo Active' : 'Live Mode'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 text-xs font-medium text-editorial-charcoal hover:text-editorial-green transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-editorial-ivory border border-editorial-border flex items-center justify-center font-heading font-semibold text-xs text-editorial-charcoal">
                  {profile?.username?.charAt(0).toUpperCase() || (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="font-semibold">{profile?.display_name || profile?.username || 'Player'}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded text-editorial-muted hover:text-editorial-charcoal hover:bg-editorial-ivory transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Join HQ
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded text-editorial-charcoal hover:bg-editorial-ivory"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-editorial-border bg-editorial-surface px-4 py-4 flex flex-col gap-3">
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded',
                    isActive
                      ? 'bg-editorial-ivory text-editorial-charcoal'
                      : 'text-editorial-muted hover:bg-editorial-ivory/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-editorial-border flex flex-col gap-2">
            <button
              onClick={() => {
                setDemoMode(!isDemoMode);
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 py-2 text-xs font-mono uppercase tracking-wider rounded border border-editorial-border"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isDemoMode ? 'Disable Demo Data' : 'Enable Demo Data'}</span>
            </button>

            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-editorial-charcoal"
                >
                  <User className="w-4 h-4" />
                  <span>Profile ({profile?.username || 'Player'})</span>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Join HQ
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
