import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Modal } from '../../components/ui/modal';
import { Input, Textarea } from '../../components/ui/input';
import { LoadingState } from '../../components/feedback/loading-state';
import { EmptyState } from '../../components/feedback/empty-state';
import { ErrorState } from '../../components/feedback/error-state';
import { Users, Plus, ShieldCheck, ArrowRight, UserPlus } from 'lucide-react';
import { useTeams, useCreateTeam } from './api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(120),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  tag: z.string().max(10).optional(),
  bio: z.string().max(2000).optional(),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

export const TeamsPage: React.FC = () => {
  const { data: teamsResponse, isLoading, isError, error, refetch } = useTeams();
  const createTeamMutation = useCreateTeam();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
  });

  const onSubmit = async (data: CreateTeamFormData) => {
    await createTeamMutation.mutateAsync(data);
    reset();
    setModalOpen(false);
  };

  const teams = teamsResponse?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-editorial-border">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-editorial-green font-semibold mb-1">
            Squad Operations
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight">
            Team Rosters & Strategy Rooms
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted mt-1 max-w-xl">
            Manage your competitive Free Fire line-up, assigned roles, team announcements, and tactical drop strategies.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Register New Squad
        </Button>
      </div>

      {/* Teams Grid */}
      {isLoading && <LoadingState message="Loading squad rosters..." rows={2} />}

      {isError && (
        <ErrorState error={error} title="Could not load teams" onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && teams.length === 0 && (
        <EmptyState
          title="No teams registered yet"
          description="Create your team roster to coordinate match check-ins, record achievements, and maintain private strategy documents."
          actionLabel="Create Team"
          onAction={() => setModalOpen(true)}
          icon={<Users className="w-6 h-6" />}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <Card key={team.id} className="flex flex-col justify-between hover:border-editorial-charcoal/40 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-editorial-green bg-editorial-green/10 border border-editorial-green/20 px-2 py-0.5 rounded uppercase">
                  [{team.tag || 'HQ'}]
                </span>
                <span className="font-mono text-[10px] text-editorial-muted">
                  {team.game}
                </span>
              </div>
              <CardTitle className="text-xl mt-2">{team.name}</CardTitle>
              {team.bio && (
                <p className="text-xs text-editorial-muted mt-1 line-clamp-2 leading-relaxed">
                  {team.bio}
                </p>
              )}
            </CardHeader>

            <CardContent className="pt-0">
              <div className="p-3 bg-editorial-ivory border border-editorial-border rounded flex items-center justify-between text-xs font-mono text-editorial-charcoal">
                <span className="text-editorial-muted">RLS Security</span>
                <span className="flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-editorial-green" />
                  Owner Controlled
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-editorial-border/60 flex items-center justify-between">
                <Link to={`/teams/${team.id}`} className="w-full">
                  <Button variant="secondary" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View Roster & Strategy
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register Competitive Squad"
        description="Creates a team record under your ownership. Postgres RLS ensures only roster members can view strategy rooms."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Team Name"
            placeholder="e.g. Total Gaming Esports"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Slug"
              placeholder="e.g. total-gaming"
              error={errors.slug?.message}
              helperText="Lowercase alphanumeric with dashes"
              {...register('slug')}
            />

            <Input
              label="Tag (Initials)"
              placeholder="e.g. TG"
              error={errors.tag?.message}
              {...register('tag')}
            />
          </div>

          <Textarea
            label="Squad Bio / Description"
            placeholder="Brief description of your squad focus and competitive tier..."
            error={errors.bio?.message}
            {...register('bio')}
          />

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-editorial-border">
            <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Register Squad
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
