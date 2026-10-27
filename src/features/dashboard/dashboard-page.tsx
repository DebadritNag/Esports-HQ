import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { EventStatusBadge, ConfirmationBadge } from '../../components/ui/badge';
import { LoadingState } from '../../components/feedback/loading-state';
import { ErrorState } from '../../components/feedback/error-state';
import {
  Clock,
  Calendar,
  AlertCircle,
  Bookmark,
  Users,
  Bell,
  CheckCircle2,
  Trophy,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useEvents, useOrganizers } from '../tournaments/api';
import { useReminders } from '../reminders/api';
import { useTeams } from '../teams/api';
import { formatDateTime, getRelativeTime, isUrgent } from '../../lib/utils';

export const DashboardPage: React.FC = () => {
  const { profile, user } = useAuth();

  // Compose dashboard from available Fastify endpoints efficiently
  const { data: upcomingEvents, isLoading: eventsLoading, isError: eventsError, error } = useEvents({
    upcoming: true,
    limit: 6,
  });
  const { data: remindersData } = useReminders({ limit: 5 });
  const { data: teamsData } = useTeams();
  const { data: organizersData } = useOrganizers({ is_verified: true });

  const events = upcomingEvents?.data || [];
  const primaryActionTarget = events[0];
  const pendingReminders = remindersData?.data?.filter((r) => r.status === 'pending') || [];
  const myTeam = teamsData?.data?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      {/* 1. Header greeting & player status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-editorial-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase tracking-widest text-editorial-green font-semibold">
              Player Command Dashboard
            </span>
            <span className="text-xs text-editorial-muted">•</span>
            <span className="font-mono text-xs text-editorial-muted">
              TZ: {profile?.timezone || 'Asia/Kolkata'}
            </span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight">
            Welcome back, {profile?.display_name || profile?.username || 'Captain'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/radar">
            <Button variant="secondary" size="sm">
              Discover Tournaments
            </Button>
          </Link>
          <Link to="/teams">
            <Button variant="primary" size="sm" leftIcon={<Users className="w-3.5 h-3.5" />}>
              Team Roster
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. TOP ACTION PRIORITY (Next Critical Deadline) */}
      {primaryActionTarget && (
        <div className="bg-editorial-surface border-2 border-editorial-charcoal rounded-md p-6 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-editorial-orange text-white">
                <Clock className="w-3 h-3" />
                Priority Action
              </span>
              <EventStatusBadge status={primaryActionTarget.event_status} />
              <ConfirmationBadge status={primaryActionTarget.confirmation_status} />
            </div>

            <h2 className="font-heading font-bold text-2xl text-editorial-charcoal">
              {primaryActionTarget.title}
            </h2>

            <p className="text-xs text-editorial-muted leading-relaxed line-clamp-2">
              {primaryActionTarget.description || 'Verified match horizon.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-8 border-t lg:border-t-0 pt-4 lg:pt-0 border-editorial-border">
            <div className="flex flex-col font-mono text-xs">
              <span className="text-[10px] text-editorial-muted uppercase">Registration Closes</span>
              <span className="text-base font-bold text-editorial-orange">
                {getRelativeTime(primaryActionTarget.registration_closes_at)}
              </span>
              <span className="text-[10px] text-editorial-muted">
                {formatDateTime(primaryActionTarget.registration_closes_at)}
              </span>
            </div>

            <Link to={`/radar/${primaryActionTarget.id}`}>
              <Button variant="urgent" size="md">
                Register Squad
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard 2-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): Upcoming Events Schedule */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Upcoming Schedule & Milestones</CardTitle>
                <p className="text-xs text-editorial-muted">Live tournaments with upcoming registration or match slots</p>
              </div>
              <Link to="/radar" className="text-xs font-semibold text-editorial-green hover:underline">
                View All →
              </Link>
            </CardHeader>

            <CardContent>
              {eventsLoading && <LoadingState message="Fetching events..." rows={3} />}

              {eventsError && (
                <ErrorState error={error} title="Could not load dashboard schedules" />
              )}

              {!eventsLoading && !eventsError && events.length === 0 && (
                <p className="text-xs text-editorial-muted py-4">No upcoming events found on radar.</p>
              )}

              {!eventsLoading && !eventsError && events.length > 0 && (
                <div className="flex flex-col divide-y divide-editorial-border/60">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex flex-col gap-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <EventStatusBadge status={ev.event_status} />
                          <span className="font-mono text-[10px] text-editorial-muted uppercase">
                            {ev.event_type}
                          </span>
                        </div>
                        <Link
                          to={`/radar/${ev.id}`}
                          className="font-heading font-semibold text-sm text-editorial-charcoal hover:text-editorial-green transition-colors"
                        >
                          {ev.title}
                        </Link>
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end font-mono">
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-editorial-muted uppercase">Match Start</span>
                          <span className="font-semibold text-editorial-charcoal">
                            {formatDateTime(ev.match_starts_at)}
                          </span>
                        </div>
                        <Link to={`/radar/${ev.id}`}>
                          <Button variant="secondary" size="sm">
                            Inspect
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Squad Status Card */}
          {myTeam ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Active Roster: {myTeam.name}</CardTitle>
                  <p className="text-xs text-editorial-muted">Tag: [{myTeam.tag || 'HQ'}] • Free Fire Competitive Roster</p>
                </div>
                <Link to={`/teams/${myTeam.id}`}>
                  <Button variant="secondary" size="sm">
                    Manage Squad
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-editorial-ivory border border-editorial-border rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-heading font-semibold text-sm text-editorial-charcoal">
                      Squad Strategy Workspace Active
                    </span>
                    <span className="text-xs text-editorial-muted">
                      Drop coordinates, loot rotations, and tactical attachments mapped.
                    </span>
                  </div>
                  <Link to="/strategy">
                    <Button variant="primary" size="sm">
                      Open Strategy Room
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Squad Organization</CardTitle>
                <p className="text-xs text-editorial-muted">You are not currently in a team roster</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-editorial-muted">
                  Create a team profile or accept an invitation to coordinate tournament check-ins and strategies with your teammates.
                </p>
                <Link to="/teams">
                  <Button variant="primary" size="sm">
                    Create or Join Team
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (4 cols): Reminders & Followed Organizers */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Reminders Dispatch Queue Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-editorial-orange" />
                Reminder Queue
              </CardTitle>
              <Link to="/reminders" className="text-xs font-semibold text-editorial-green hover:underline">
                Settings
              </Link>
            </CardHeader>
            <CardContent>
              {pendingReminders.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {pendingReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 bg-editorial-ivory border border-editorial-border rounded flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold uppercase text-editorial-orange text-[10px]">
                          {rem.reminder_type.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[10px] text-editorial-muted">
                          {getRelativeTime(rem.scheduled_for)}
                        </span>
                      </div>
                      <span className="font-semibold text-editorial-charcoal line-clamp-1">
                        {rem.event?.title || 'Tournament Alert'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-editorial-muted text-xs">
                  <p>No pending reminder jobs in queue.</p>
                  <p className="text-[11px] mt-1 text-[#777A75]">
                    Track an event on the radar to activate automated pre-drop alerts.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Followed Organizers Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-editorial-green" />
                Verified Organizers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y divide-editorial-border/60">
                {(organizersData?.data || []).slice(0, 3).map((org) => (
                  <div key={org.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="font-semibold text-editorial-charcoal">{org.name}</span>
                      <span className="font-mono text-[10px] text-editorial-muted">
                        TZ: {org.timezone}
                      </span>
                    </div>
                    <Link to={`/radar?organizer_id=${org.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs px-2 py-1">
                        Feed
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
