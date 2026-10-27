import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { LoadingState } from '../../components/feedback/loading-state';
import { ErrorState } from '../../components/feedback/error-state';
import {
  Trophy,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Clock,
  Compass,
} from 'lucide-react';
import { useOrganizers } from './api';

export const OrganizersPage: React.FC = () => {
  const { data: organizersData, isLoading, isError, error, refetch } = useOrganizers();
  const organizers = organizersData?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-editorial-border">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-editorial-green font-semibold mb-1">
            Publishers & Leagues
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight">
            Verified Tournament Organizers
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted mt-1 max-w-xl">
            Official Free Fire championship organizers and daily scrim providers with verified schedule feeds.
          </p>
        </div>
      </div>

      {/* Grid */}
      {isLoading && <LoadingState message="Loading verified organizers feed..." rows={3} />}

      {isError && (
        <ErrorState error={error} title="Could not load organizers" onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizers.map((org) => (
            <Card key={org.id} className="flex flex-col justify-between hover:border-editorial-charcoal/40 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-editorial-muted uppercase">
                    {org.game}
                  </span>
                  {org.is_verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-editorial-green bg-editorial-green/10 border border-editorial-green/30 px-1.5 py-0.5 rounded uppercase font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>

                <CardTitle className="text-xl mt-2">{org.name}</CardTitle>
                {org.description && (
                  <p className="text-xs text-editorial-muted mt-1.5 leading-relaxed line-clamp-3">
                    {org.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0 flex flex-col gap-4">
                <div className="p-3 bg-editorial-ivory border border-editorial-border rounded flex flex-col gap-1.5 text-xs font-mono text-editorial-charcoal">
                  <div className="flex items-center justify-between">
                    <span className="text-editorial-muted">Timezone:</span>
                    <span>{org.timezone}</span>
                  </div>
                  {org.default_registration_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-editorial-muted">Default Reg:</span>
                      <span>{org.default_registration_time}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <Link to={`/radar?organizer_id=${org.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full" leftIcon={<Compass className="w-3.5 h-3.5" />}>
                      View Radar Feed
                    </Button>
                  </Link>

                  {org.discord_invite_url && (
                    <a
                      href={org.discord_invite_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded border border-editorial-border hover:bg-editorial-ivory text-editorial-charcoal transition-colors"
                      title="Discord Community"
                    >
                      <MessageSquare className="w-4 h-4 text-[#5865F2]" />
                    </a>
                  )}

                  {org.website_url && (
                    <a
                      href={org.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded border border-editorial-border hover:bg-editorial-ivory text-editorial-charcoal transition-colors"
                      title="Official Website"
                    >
                      <ExternalLink className="w-4 h-4 text-editorial-muted" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
