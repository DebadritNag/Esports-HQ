import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { EventStatusBadge, ConfirmationBadge } from '../../components/ui/badge';
import { LoadingState } from '../../components/feedback/loading-state';
import { ErrorState } from '../../components/feedback/error-state';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Radio,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ShieldCheck,
  Bell,
  Users,
  Trophy,
} from 'lucide-react';
import { useEvent, useTrackEvent, useUntrackEvent } from '../tournaments/api';
import { useMatches } from '../profile/api';
import { formatDateTime, getRelativeTime, isUrgent } from '../../lib/utils';

export const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, isError, error, refetch } = useEvent(id);
  const { data: matchesData } = useMatches({ event_id: id });

  const trackMutation = useTrackEvent();
  const untrackMutation = useUntrackEvent();
  const [isTracked, setIsTracked] = React.useState(false);

  const handleToggleTrack = async () => {
    if (!event) return;
    if (isTracked) {
      await untrackMutation.mutateAsync(event.id);
      setIsTracked(false);
    } else {
      await trackMutation.mutateAsync({ eventId: event.id });
      setIsTracked(true);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <LoadingState message="Fetching verified tournament details..." rows={2} />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <ErrorState
          title="Could not find tournament"
          error={error || new Error('Event does not exist')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const urgent = isUrgent(event.registration_closes_at);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      {/* Back button */}
      <div>
        <Link
          to="/radar"
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-editorial-muted hover:text-editorial-charcoal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tournament Radar</span>
        </Link>
      </div>

      {/* Main Header Banner */}
      <div className="bg-editorial-surface border border-editorial-border rounded-md p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col gap-3 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <EventStatusBadge status={event.event_status} />
            <ConfirmationBadge status={event.confirmation_status} />
            <span className="font-mono text-xs text-editorial-muted uppercase tracking-wider">
              {event.game} • {event.event_type}
            </span>
            {event.is_recurring_occurrence && (
              <span className="font-mono text-[10px] text-editorial-charcoal bg-editorial-ivory border border-editorial-border px-2 py-0.5 rounded font-semibold uppercase">
                Recurring Horizon
              </span>
            )}
          </div>

          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight leading-tight">
            {event.title}
          </h1>

          {event.description && (
            <p className="text-sm text-editorial-muted leading-relaxed">
              {event.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs font-mono text-editorial-muted pt-2">
            <span>Timezone: {event.timezone}</span>
            {event.last_verified_at && (
              <span>Verified: {formatDateTime(event.last_verified_at)}</span>
            )}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="flex flex-col gap-3 shrink-0 sm:min-w-[200px]">
          <Button
            variant={isTracked ? 'secondary' : 'primary'}
            size="md"
            onClick={handleToggleTrack}
            leftIcon={
              isTracked ? (
                <BookmarkCheck className="w-4 h-4 text-editorial-green" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )
            }
          >
            {isTracked ? 'Tracked on Radar' : 'Track Tournament'}
          </Button>

          {event.registration_url && (
            <a href={event.registration_url} target="_blank" rel="noreferrer">
              <Button variant="urgent" size="md" className="w-full" rightIcon={<ExternalLink className="w-4 h-4" />}>
                Go to Registration
              </Button>
            </a>
          )}

          {event.stream_url && (
            <a href={event.stream_url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="w-full" leftIcon={<Radio className="w-4 h-4 text-editorial-orange" />}>
                Official Stream
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Grid: Timeline Coordinates vs Eligibility & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Timeline Schedule */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-editorial-green" />
                Verified Timeline & Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 divide-y divide-editorial-border/60">
                {/* Registration Opens */}
                <div className="flex items-center justify-between pt-3 first:pt-0">
                  <div className="flex flex-col">
                    <span className="font-heading font-semibold text-sm text-editorial-charcoal">
                      Registration Window Opens
                    </span>
                    <span className="text-xs text-editorial-muted">
                      Roster submission portal goes live
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-editorial-charcoal">
                    {formatDateTime(event.registration_opens_at)}
                  </span>
                </div>

                {/* Registration Closes */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex flex-col">
                    <span className="font-heading font-semibold text-sm text-editorial-charcoal flex items-center gap-1.5">
                      Registration Window Closes
                      {urgent && (
                        <span className="text-[10px] font-mono text-editorial-orange font-bold uppercase">
                          ({getRelativeTime(event.registration_closes_at)})
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-editorial-muted">
                      Late substitutions will not be accepted
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-editorial-orange">
                    {formatDateTime(event.registration_closes_at)}
                  </span>
                </div>

                {/* Check-in */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex flex-col">
                    <span className="font-heading font-semibold text-sm text-editorial-charcoal">
                      Mandatory Captain Check-In
                    </span>
                    <span className="text-xs text-editorial-muted">
                      Discord bot room password distribution
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-editorial-charcoal">
                    {formatDateTime(event.check_in_at)}
                  </span>
                </div>

                {/* Match Starts */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex flex-col">
                    <span className="font-heading font-semibold text-sm text-editorial-charcoal">
                      First Match Drop (Map 1)
                    </span>
                    <span className="text-xs text-editorial-muted">
                      Official broadcast and anti-cheat lock
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-editorial-green">
                    {formatDateTime(event.match_starts_at)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Matches Table if available */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-editorial-orange" />
                Scheduled Rounds & Maps
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchesData?.data && matchesData.data.length > 0 ? (
                <div className="flex flex-col divide-y divide-editorial-border/60">
                  {matchesData.data.map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between text-xs font-mono">
                      <div className="flex flex-col">
                        <span className="font-bold text-editorial-charcoal">{m.title || m.round_label}</span>
                        <span className="text-editorial-muted">Map: {m.map_name || 'Bermuda'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatDateTime(m.scheduled_at)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-editorial-ivory border text-[10px] uppercase">
                          {m.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-editorial-muted py-2">
                  Match rounds will populate once the event confirmation status is confirmed by the organizer.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 3: Rules & Reminders */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-editorial-green" />
                Participation Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-xs text-editorial-muted leading-relaxed">
              <div className="p-3 bg-editorial-ivory border border-editorial-border rounded">
                <span className="font-semibold text-editorial-charcoal block mb-1">
                  Format: Battle Royale Squad
                </span>
                Standard 4 players + up to 2 verified substitutes registered in the team roster.
              </div>
              <p>
                • <strong>Device Restrictions:</strong> Mobile phones only. Emulators (Bluestacks, LDPlayer) strictly prohibited and caught by Garena anti-cheat.
              </p>
              <p>
                • <strong>Point System:</strong> Standard FFWS placement matrix (12 pts for Booyah + 1 pt per kill).
              </p>
              <p>
                • <strong>ID Verification:</strong> Free Fire UID must match player profile on Esports HQ.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-editorial-orange" />
                Automated Push Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-xs text-editorial-muted">
              <p>
                Tracking this tournament subscribes you to automated reminders delivered:
              </p>
              <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-editorial-charcoal">
                <li>30 min prior to registration close</li>
                <li>15 min prior to captain check-in</li>
                <li>30 min prior to Match 1 start</li>
              </ul>
              <Link to="/reminders" className="text-xs font-semibold text-editorial-green hover:underline mt-2">
                Configure Lead Times & Preferences →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
