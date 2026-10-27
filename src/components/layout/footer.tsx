import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Compass, Terminal, Trophy } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-editorial-dark text-editorial-ivory border-t border-editorial-dark-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Brand & Stance */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-editorial-green flex items-center justify-center font-heading font-bold text-xs text-white">
                HQ
              </div>
              <span className="font-heading font-bold tracking-tight text-lg text-white">
                ESPORTS HQ
              </span>
            </div>
            <p className="text-xs text-[#9B9E98] leading-relaxed mt-1">
              Independent Free Fire tournament discovery, registration radar, and squad strategy workspace. Built for competitive rosters.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-editorial-dark-surface border border-editorial-dark-border text-[#B2B5AF]">
                <ShieldCheck className="w-3 h-3 text-editorial-green" />
                Postgres 17 RLS Enforced
              </span>
            </div>
          </div>

          {/* Column 2: Platform Navigation */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-heading font-semibold text-xs uppercase tracking-widest text-white/90">
              Tournament Radar
            </h4>
            <ul className="flex flex-col gap-1.5 text-xs text-[#9B9E98]">
              <li>
                <Link to="/radar" className="hover:text-white transition-colors">
                  Live Radar Feed
                </Link>
              </li>
              <li>
                <Link to="/radar?type=scrim" className="hover:text-white transition-colors">
                  Daily Tier-1 Scrims
                </Link>
              </li>
              <li>
                <Link to="/radar?type=tournament" className="hover:text-white transition-colors">
                  Major Championships
                </Link>
              </li>
              <li>
                <Link to="/organizers" className="hover:text-white transition-colors">
                  Verified Organizers
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Rosters & Squads */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-heading font-semibold text-xs uppercase tracking-widest text-white/90">
              Squad Operations
            </h4>
            <ul className="flex flex-col gap-1.5 text-xs text-[#9B9E98]">
              <li>
                <Link to="/teams" className="hover:text-white transition-colors">
                  Team Directory
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Player Dashboard
                </Link>
              </li>
              <li>
                <Link to="/reminders" className="hover:text-white transition-colors">
                  Deadline Reminders
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-white transition-colors">
                  Match History & Stats
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: System Integration Status */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-heading font-semibold text-xs uppercase tracking-widest text-white/90">
              System Invariants
            </h4>
            <div className="flex flex-col gap-2 text-xs text-[#9B9E98]">
              <div className="p-3 bg-editorial-dark-surface rounded border border-editorial-dark-border flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#CCC7BA]">Backend Engine</span>
                  <span className="text-editorial-green font-semibold">Fastify v4</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#CCC7BA]">Timezone</span>
                  <span className="text-white">Asia/Kolkata</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#CCC7BA]">Match Generation</span>
                  <span className="text-white">Confirmed Only</span>
                </div>
              </div>
              <p className="text-[11px] text-[#777A75]">
                No fake statistics. Only verified tournament schedules and match results.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-editorial-dark-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#777A75]">
          <p>© {new Date().getFullYear()} Esports HQ. Free Fire is a trademark of Garena International.</p>
          <div className="flex items-center gap-6">
            <a
              href="http://localhost:3000/docs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1 font-mono text-[11px]"
            >
              <Terminal className="w-3 h-3" />
              API Docs (/docs)
            </a>
            <span className="font-mono text-[11px]">Version 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
