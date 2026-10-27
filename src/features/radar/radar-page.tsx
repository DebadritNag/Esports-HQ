import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { EventStatusBadge, ConfirmationBadge } from '../../components/ui/badge';
import { LoadingState } from '../../components/feedback/loading-state';
import { EmptyState } from '../../components/feedback/empty-state';
import { ErrorState } from '../../components/feedback/error-state';
import {
  Compass,
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Clock,
  Radio,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useEvents, useOrganizers, useTrackEvent, useUntrackEvent } from '../tournaments/api';
import { formatDateTime, getRelativeTime, isUrgent } from '../../lib/utils';
import type { EventStatus, EventType } from '../../types/api';

export const RadarPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<EventStatus | ''>(
    (searchParams.get('status') as EventStatus) || ''
  );
  const [selectedType, setSelectedType] = useState<EventType | ''>(
    (searchParams.get('type') as EventType) || ''
  );
  const [selectedOrganizer, setSelectedOrganizer] = useState<string>(
    searchParams.get('organizer_id') || ''
  );
  const [trackedOnly, setTrackedOnly] = useState<boolean>(
    searchParams.get('tracked') === 'true'
  );

  const { data: organizersData } = useOrganizers();
  const {
    data: eventsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useEvents({
    event_status: selectedStatus || undefined,
    event_type: selectedType || undefined,
    organizer_id: selectedOrganizer || undefined,
    tracked: trackedOnly || undefined,
  });

  const trackMutation = useTrackEvent();
  const untrackMutation = useUntrackEvent();

  // Local tracked events map for instant responsive feedback
  const [trackedEventIds, setTrackedEventIds] = useState<Set<string>>(new Set());

  const handleToggleTrack = async (eventId: string, isCurrentlyTracked: boolean) => {
    if (isCurrentlyTracked || trackedEventIds.has(eventId)) {
      await untrackMutation.mutateAsync(eventId);
      setTrackedEventIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } else {
      await trackMutation.mutateAsync({ eventId });
      setTrackedEventIds((prev) => new Set(prev).add(eventId));
    }
  };

  // Filter events locally by search term
  const filteredEvents = useMemo(() => {
    if (!eventsResponse?.data) return [];
    if (!searchTerm.trim()) return eventsResponse.data;

    const term = searchTerm.toLowerCase();
    return eventsResponse.data.filter((e) => {
      return (
        e.title.toLowerCase().includes(term) ||
        (e.description && e.description.toLowerCase().includes(term)) ||
        e.game.toLowerCase().includes(term)
      );
    });
  }, [eventsResponse?.data, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-editorial-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-editorial-green animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-editorial-green font-semibold">
              Live Tournament Radar
            </span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight">
            Free Fire Competitive Horizon
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted mt-1 max-w-2xl">
            Real-time verified registration windows, check-in cutoffs, and stream schedules. All dates normalized to your timezone.
          </p>
        </div>

        {/* Quick filter tabs */}
        <div className="flex items-center gap-2 self-start md:self-end">
          <Button
            variant={trackedOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTrackedOnly(!trackedOnly)}
            leftIcon={<Bookmark className="w-3.5 h-3.5" />}
          >
            {trackedOnly ? 'Tracked Events' : 'Show All Events'}
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-editorial-surface border border-editorial-border p-4 rounded-md shadow-subtle flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-editorial-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tournament, cup, scrims, or qualifier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-editorial-ivory border border-editorial-border rounded text-editorial-charcoal placeholder:text-editorial-muted focus:outline-none focus:border-editorial-charcoal"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as EventStatus)}
            className="text-xs bg-editorial-ivory border border-editorial-border rounded px-3 py-2 text-editorial-charcoal focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="registration_open">Registration Open</option>
            <option value="scheduled">Upcoming</option>
            <option value="live">Live Now</option>
            <option value="registration_closed">Closed</option>
            <option value="completed">Completed</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as EventType)}
            className="text-xs bg-editorial-ivory border border-editorial-border rounded px-3 py-2 text-editorial-charcoal focus:outline-none"
          >
            <option value="">All Formats</option>
            <option value="tournament">Tournament</option>
            <option value="scrim">Scrim</option>
            <option value="qualifier">Qualifier</option>
            <option value="showmatch">Showmatch</option>
          </select>

          {/* Organizer Filter */}
          <select
            value={selectedOrganizer}
            onChange={(e) => setSelectedOrganizer(e.target.value)}
            className="text-xs bg-editorial-ivory border border-editorial-border rounded px-3 py-2 text-editorial-charcoal focus:outline-none max-w-[160px]"
          >
            <option value="">All Organizers</option>
            {(organizersData?.data || []).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Events List */}
      <div className="flex flex-col gap-3">
        {isLoading && <LoadingState message="Connecting to Fastify events pipeline..." rows={4} />}

        {isError && (
          <ErrorState
            title="Could not load tournament radar"
            error={error}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && filteredEvents.length === 0 && (
          <EmptyState
            title="No events match your radar filters"
            description="Try loosening your search term or clearing the status and organizer filters to see all available circuit events."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchTerm('');
              setSelectedStatus('');
              setSelectedType('');
              setSelectedOrganizer('');
              setTrackedOnly(false);
            }}
          />
        )}

        {!isLoading &&
          !isError &&
          filteredEvents.map((event) => {
            const isTracked = trackedEventIds.has(event.id);
            const urgentDeadline = isUrgent(event.registration_closes_at);

            return (
              <div
                key={event.id}
                className="bg-editorial-surface border border-editorial-border hover:border-editorial-charcoal/50 transition-all duration-150 p-5 rounded-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-subtle"
              >
                {/* Column 1: Info & Badges */}
                <div className="flex flex-col gap-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <EventStatusBadge status={event.event_status} />
                    <ConfirmationBadge status={event.confirmation_status} />
                    <span className="font-mono text-[10px] text-editorial-muted uppercase tracking-wider">
                      {event.game} • {event.event_type}
                    </span>
                    {urgentDeadline && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-editorial-orange bg-editorial-orange-light border border-[#F6CEB4] px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        CLOSING {getRelativeTime(event.registration_closes_at)}
                      </span>
                    )}
                  </div>

                  <div>
                    <Link
                      to={`/radar/${event.id}`}
                      className="font-heading font-bold text-lg sm:text-xl text-editorial-charcoal hover:text-editorial-green transition-colors leading-tight"
                    >
                      {event.title}
                    </Link>
                    {event.description && (
                      <p className="text-xs text-editorial-muted line-clamp-2 mt-1 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 2: Exact Timeline Coordinates */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-6 py-3 lg:py-0 border-y lg:border-y-0 border-editorial-border/60 text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-editorial-muted text-[10px] uppercase">Reg Closes</span>
                    <span className="font-semibold text-editorial-charcoal">
                      {formatDateTime(event.registration_closes_at)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-editorial-muted text-[10px] uppercase">Check-In</span>
                    <span className="font-semibold text-editorial-charcoal">
                      {formatDateTime(event.check_in_at)}
                    </span>
                  </div>

                  <div className="flex flex-col col-span-2 sm:col-span-1">
                    <span className="text-editorial-muted text-[10px] uppercase">Match Start</span>
                    <span className="font-semibold text-editorial-charcoal">
                      {formatDateTime(event.match_starts_at)}
                    </span>
                  </div>
                </div>

                {/* Column 3: Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => handleToggleTrack(event.id, isTracked)}
                    disabled={trackMutation.isPending || untrackMutation.isPending}
                    className={`p-2 rounded border transition-colors ${
                      isTracked
                        ? 'bg-editorial-green text-white border-editorial-green'
                        : 'border-editorial-border text-editorial-muted hover:text-editorial-charcoal hover:bg-editorial-ivory'
                    }`}
                    title={isTracked ? 'Untrack event' : 'Track and receive reminders'}
                  >
                    {isTracked ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>

                  <Link to={`/radar/${event.id}`}>
                    <Button variant="secondary" size="sm">
                      Details
                    </Button>
                  </Link>

                  {event.registration_url && (
                    <a
                      href={event.registration_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex"
                    >
                      <Button variant="urgent" size="sm">
                        Register
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
