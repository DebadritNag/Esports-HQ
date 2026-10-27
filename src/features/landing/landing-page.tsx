import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { EventStatusBadge, ConfirmationBadge } from '../../components/ui/badge';
import {
  Compass,
  ArrowRight,
  Clock,
  Radio,
  CheckCircle2,
  Users,
  Bell,
  ShieldCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { useEvents, useOrganizers } from '../tournaments/api';
import { formatDateTime, getRelativeTime, isUrgent } from '../../lib/utils';

export const LandingPage: React.FC = () => {
  const { data: eventsData, isLoading: eventsLoading } = useEvents({ upcoming: true, limit: 4 });
  const { data: organizersData } = useOrganizers();

  const featuredTournament = eventsData?.data?.[0];
  const upcomingTournaments = eventsData?.data?.slice(1, 4) || [];

  return (
    <div className="flex flex-col gap-16 sm:gap-24 pb-16">
      {/* 1. EDITORIAL HERO SECTION */}
      <section className="relative pt-10 sm:pt-16 pb-12 border-b border-editorial-border bg-editorial-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7 flex flex-col items-start gap-5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-editorial-ivory border border-editorial-border text-xs font-mono font-semibold uppercase tracking-wider text-editorial-charcoal">
                <span className="w-2 h-2 rounded-full bg-editorial-orange animate-pulse" />
                South Asia Free Fire Circuit • 2026 Season
              </div>

              <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-editorial-charcoal leading-[1.08] text-balance">
                Every tournament. <br className="hidden sm:inline" />
                Your next opportunity.
              </h1>

              <p className="text-base sm:text-lg text-editorial-muted max-w-xl leading-relaxed">
                Track every Tier-1 scrim, open qualifier, and national championship in one verified radar. Never miss a registration window or check-in deadline again.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/radar">
                  <Button variant="primary" size="lg" rightIcon={<Compass className="w-4 h-4" />}>
                    Explore Tournaments
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="secondary" size="lg">
                    How it works
                  </Button>
                </a>
              </div>

              {/* Verified Trust Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6 mt-4 border-t border-editorial-border/60 w-full max-w-lg">
                <div>
                  <div className="font-heading font-bold text-2xl text-editorial-charcoal">100%</div>
                  <div className="font-mono text-[11px] text-editorial-muted uppercase tracking-wider mt-0.5">
                    Verified Schedules
                  </div>
                </div>
                <div>
                  <div className="font-heading font-bold text-2xl text-editorial-green">30 min</div>
                  <div className="font-mono text-[11px] text-editorial-muted uppercase tracking-wider mt-0.5">
                    Prior Reminders
                  </div>
                </div>
                <div>
                  <div className="font-heading font-bold text-2xl text-editorial-charcoal">30-day</div>
                  <div className="font-mono text-[11px] text-editorial-muted uppercase tracking-wider mt-0.5">
                    Rolling Horizon
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Real Editorial Tournament Spotlight Card */}
            <div className="lg:col-span-5">
              {featuredTournament ? (
                <div className="bg-editorial-ivory border-2 border-editorial-charcoal rounded-md p-6 relative shadow-card">
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-editorial-border mb-4">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-editorial-charcoal flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-editorial-orange" />
                      Featured Championship
                    </span>
                    <ConfirmationBadge status={featuredTournament.confirmation_status} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <EventStatusBadge status={featuredTournament.event_status} />
                      <span className="text-xs font-mono text-editorial-muted uppercase">
                        {featuredTournament.event_type}
                      </span>
                    </div>

                    <h2 className="font-heading font-bold text-xl sm:text-2xl text-editorial-charcoal leading-snug">
                      {featuredTournament.title}
                    </h2>

                    <p className="text-xs text-editorial-muted line-clamp-3 leading-relaxed">
                      {featuredTournament.description}
                    </p>
                  </div>

                  {/* Deadline Callout Box */}
                  <div className="my-5 p-3.5 bg-editorial-surface border border-editorial-border rounded flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-editorial-muted flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-editorial-orange" />
                        Registration Closes:
                      </span>
                      <span className="font-mono font-semibold text-editorial-charcoal">
                        {formatDateTime(featuredTournament.registration_closes_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-editorial-muted flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-editorial-green" />
                        Match Start:
                      </span>
                      <span className="font-mono font-semibold text-editorial-charcoal">
                        {formatDateTime(featuredTournament.match_starts_at)}
                      </span>
                    </div>

                    {isUrgent(featuredTournament.registration_closes_at) && (
                      <div className="mt-1 pt-2 border-t border-editorial-border/60 flex items-center justify-between font-mono text-[11px] text-editorial-orange font-bold uppercase">
                        <span>URGENT DEADLINE</span>
                        <span>{getRelativeTime(featuredTournament.registration_closes_at)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Link to={`/radar/${featuredTournament.id}`} className="flex-1">
                      <Button variant="urgent" size="md" className="w-full">
                        View Details & Schedule
                      </Button>
                    </Link>
                    {featuredTournament.registration_url && (
                      <a
                        href={featuredTournament.registration_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded border border-editorial-border hover:bg-editorial-surface text-editorial-charcoal transition-colors"
                        title="Official External Registration"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-editorial-surface border border-editorial-border p-6 rounded text-center">
                  <p className="text-sm text-editorial-muted">Loading spotlight tournament...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. TOURNAMENT RADAR PREVIEW (SCHEDULE TABLE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-editorial-border">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-editorial-green font-semibold mb-1">
              Live Horizon
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-editorial-charcoal">
              Upcoming Registration & Match Schedules
            </h2>
          </div>
          <Link to="/radar">
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open Full Radar
            </Button>
          </Link>
        </div>

        {eventsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-editorial-surface border border-editorial-border animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingTournaments.map((event) => (
              <div
                key={event.id}
                className="bg-editorial-surface border border-editorial-border hover:border-editorial-charcoal/40 transition-colors p-4 sm:p-5 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-subtle"
              >
                {/* Event Name & Badges */}
                <div className="flex flex-col gap-1.5 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <EventStatusBadge status={event.event_status} />
                    <ConfirmationBadge status={event.confirmation_status} />
                    <span className="font-mono text-[11px] text-editorial-muted">
                      {event.game} • {event.event_type.toUpperCase()}
                    </span>
                  </div>
                  <Link
                    to={`/radar/${event.id}`}
                    className="font-heading font-semibold text-base sm:text-lg text-editorial-charcoal hover:text-editorial-green transition-colors"
                  >
                    {event.title}
                  </Link>
                </div>

                {/* Deadlines & Timelines */}
                <div className="flex items-center gap-6 sm:gap-8 text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-editorial-muted text-[10px] uppercase">Registration Closes</span>
                    <span className="font-semibold text-editorial-charcoal">
                      {formatDateTime(event.registration_closes_at)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-editorial-muted text-[10px] uppercase">Match Starts</span>
                    <span className="font-semibold text-editorial-charcoal">
                      {formatDateTime(event.match_starts_at)}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex items-center gap-2">
                  <Link to={`/radar/${event.id}`}>
                    <Button variant="secondary" size="sm">
                      Inspect
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. HOW IT WORKS (EDITORIAL THREE PILLARS) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="font-mono text-xs uppercase tracking-widest text-editorial-orange font-semibold mb-1">
            Engine Architecture
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal">
            Engineered for Competitive Reliability
          </h2>
          <p className="text-sm text-editorial-muted mt-2">
            Most tournament portals rely on manually entered, outdated listings. Esports HQ connects pure announcement parsers, verified recurrence rules, and automated push workers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="bg-editorial-surface border border-editorial-border p-6 rounded-md flex flex-col gap-3 shadow-subtle">
            <div className="w-10 h-10 rounded bg-editorial-ivory border border-editorial-border flex items-center justify-center text-editorial-green">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-editorial-charcoal">
              1. Automated Radar Ingestion
            </h3>
            <p className="text-xs text-editorial-muted leading-relaxed">
              Recurring tournament rules automatically roll forward 30 days ahead. Parsers never invent dates—ambiguous announcements are marked for review, guaranteeing that match times you see are confirmed.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-editorial-surface border border-editorial-border p-6 rounded-md flex flex-col gap-3 shadow-subtle">
            <div className="w-10 h-10 rounded bg-editorial-ivory border border-editorial-border flex items-center justify-center text-editorial-orange">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-editorial-charcoal">
              2. Pre-Drop Reminders
            </h3>
            <p className="text-xs text-editorial-muted leading-relaxed">
              Standalone background workers deliver web push and email alerts 30 minutes before registration opens, 15 minutes before check-in, and 30 minutes before the lobby starts.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-editorial-surface border border-editorial-border p-6 rounded-md flex flex-col gap-3 shadow-subtle">
            <div className="w-10 h-10 rounded bg-editorial-ivory border border-editorial-border flex items-center justify-center text-editorial-charcoal">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-editorial-charcoal">
              3. Squad Strategy & Rosters
            </h3>
            <p className="text-xs text-editorial-muted leading-relaxed">
              Coordinate your 4-player roster and substitutes. Maintain strategy rooms for Bermuda, Purgatory, and Alpine drop rotations with private tactical storage.
            </p>
          </div>
        </div>
      </section>

      {/* 4. VERIFIED ORGANIZERS BANNER */}
      <section className="bg-editorial-dark text-editorial-ivory py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-editorial-dark-border mb-8">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-editorial-green font-semibold">
                Verified Publishers & Leagues
              </span>
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mt-1">
                Follow Official Tournament Organizers
              </h2>
            </div>
            <p className="text-xs text-[#9B9E98] max-w-md">
              Follow authorized leagues to receive immediate notification whenever new scrim horizons or open brackets are materialized.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(organizersData?.data || []).map((org) => (
              <div
                key={org.id}
                className="bg-editorial-dark-surface border border-editorial-dark-border p-5 rounded-md flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-base text-white">
                      {org.name}
                    </span>
                    {org.is_verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-editorial-green bg-editorial-green/10 border border-editorial-green/30 px-1.5 py-0.5 rounded uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9B9E98] leading-relaxed line-clamp-2">
                    {org.description || 'Official competitive circuit organizer.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-editorial-dark-border/60 flex items-center justify-between text-xs">
                  <span className="font-mono text-[#777A75]">TZ: {org.timezone}</span>
                  <Link to={`/radar?organizer_id=${org.id}`}>
                    <Button variant="secondary" size="sm" className="text-xs">
                      View Events
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FINAL CALL TO ACTION */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <div className="bg-editorial-surface border-2 border-editorial-charcoal rounded-md p-8 sm:p-12 flex flex-col items-center gap-4 shadow-card">
          <div className="w-12 h-12 rounded bg-editorial-green text-white flex items-center justify-center font-heading font-bold text-lg">
            HQ
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight text-balance">
            Ready to secure your spot in the next qualifier?
          </h2>
          <p className="text-sm text-editorial-muted max-w-lg leading-relaxed">
            Create your player profile, organize your squad roster, and track real-time registration deadlines.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link to="/register">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Create Free Profile
              </Button>
            </Link>
            <Link to="/radar">
              <Button variant="outline" size="lg">
                Browse Radar
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
