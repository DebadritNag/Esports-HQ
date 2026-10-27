import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { LoadingState } from '../../components/feedback/loading-state';
import { ErrorState } from '../../components/feedback/error-state';
import {
  User,
  Trophy,
  ShieldCheck,
  Calendar,
  Save,
  Check,
  Award,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useProfile, useUpdateProfile, useAchievements } from './api';
import { useTeams } from '../teams/api';
import { formatDateTime } from '../../lib/utils';

export const ProfilePage: React.FC = () => {
  const { user, profile: authProfile } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const { data: achievementsData } = useAchievements();
  const { data: teamsData } = useTeams();
  const updateProfileMutation = useUpdateProfile();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setTimezone(profile.timezone || 'Asia/Kolkata');
    }
  }, [profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileMutation.mutateAsync({
      username: username.trim(),
      display_name: displayName.trim() || null,
      timezone: timezone.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const achievements = achievementsData?.data || [];
  const teams = teamsData?.data || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <LoadingState message="Loading player profile and verified records..." rows={2} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <ErrorState error={error} title="Failed to load profile" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-editorial-border">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-editorial-dark border-2 border-editorial-charcoal text-white flex items-center justify-center font-heading font-bold text-2xl">
            {profile?.username?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className="flex flex-col">
            <h1 className="font-heading font-bold text-3xl text-editorial-charcoal tracking-tight">
              {profile?.display_name || profile?.username || 'Player Profile'}
            </h1>
            <span className="font-mono text-xs text-editorial-muted">
              UID: {profile?.id} • Joined {formatDateTime(profile?.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Edit Profile (Left 6 cols) vs Verified Records (Right 6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Account Settings */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-editorial-green" />
                Player Information
              </CardTitle>
              <p className="text-xs text-editorial-muted">Manage your handle and regional tournament timezone</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="flex flex-col gap-4">
                <Input
                  label="Player Tag / Handle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />

                <Input
                  label="Display Name"
                  placeholder="Real Name or Competitive Alias"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-editorial-charcoal font-heading">
                    Preferred Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-editorial-surface border border-editorial-border rounded text-editorial-charcoal focus:outline-none"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST • UTC+5:30)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (ICT • UTC+7:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT • UTC+8:00)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST • UTC+4:00)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-editorial-muted">
                    Updated via PATCH /api/v1/me
                  </span>
                  <Button
                    type="submit"
                    variant={saveSuccess ? 'secondary' : 'primary'}
                    size="sm"
                    isLoading={updateProfileMutation.isPending}
                    leftIcon={saveSuccess ? <Check className="w-4 h-4 text-editorial-green" /> : <Save className="w-4 h-4" />}
                  >
                    {saveSuccess ? 'Changes Saved' : 'Save Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Team Memberships */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-editorial-charcoal" />
                Squad Memberships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teams.length > 0 ? (
                <div className="flex flex-col divide-y divide-editorial-border/60">
                  {teams.map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <span className="font-heading font-bold text-sm text-editorial-charcoal">
                          {t.name}
                        </span>
                        <span className="font-mono text-[10px] text-editorial-muted">
                          Tag: [{t.tag || 'HQ'}] • {t.game}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] bg-editorial-ivory border px-2 py-0.5 rounded uppercase font-semibold">
                        Owner / Member
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-editorial-muted py-2">No active team roster associations.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Verified Achievements */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-editorial-orange" />
                Verified Tournament Achievements
              </CardTitle>
              <p className="text-xs text-editorial-muted">Evidence-backed placements in official championships</p>
            </CardHeader>
            <CardContent>
              {achievements.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-4 bg-editorial-ivory border border-editorial-border rounded-md flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-editorial-orange" />
                          <h4 className="font-heading font-bold text-sm text-editorial-charcoal">
                            {ach.title}
                          </h4>
                        </div>
                        {ach.placement && (
                          <span className="font-mono text-xs font-bold text-editorial-green bg-editorial-green/10 border border-editorial-green/20 px-2 py-0.5 rounded">
                            Placement #{ach.placement}
                          </span>
                        )}
                      </div>

                      {ach.description && (
                        <p className="text-xs text-editorial-muted leading-relaxed">
                          {ach.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] font-mono text-editorial-muted pt-2 border-t border-editorial-border/60">
                        <span>Scope: {ach.scope.toUpperCase()}</span>
                        {ach.awarded_at && (
                          <span>Awarded: {formatDateTime(ach.awarded_at)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-editorial-muted">
                  <p>No verified achievements recorded yet.</p>
                  <p className="mt-1 text-[11px] text-[#777A75]">
                    Tournament awards are stamped after official brackets conclude.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
