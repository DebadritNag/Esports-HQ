import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Modal } from '../../components/ui/modal';
import { Input, Textarea } from '../../components/ui/input';
import { LoadingState } from '../../components/feedback/loading-state';
import { ErrorState } from '../../components/feedback/error-state';
import {
  ArrowLeft,
  Users,
  UserPlus,
  ShieldCheck,
  Megaphone,
  Compass,
  Plus,
  ArrowRight,
  Send,
} from 'lucide-react';
import {
  useTeam,
  useTeamMembers,
  useTeamAnnouncements,
  useAddMember,
  useCreateAnnouncement,
} from './api';
import { useStrategyRooms, useCreateStrategyRoom } from '../strategy/api';
import { TEAM_ROLE_LABELS } from '../../lib/constants';
import { formatDateTime } from '../../lib/utils';
import type { TeamRole } from '../../types/api';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: team, isLoading: teamLoading, isError, error, refetch } = useTeam(id);
  const { data: members, isLoading: membersLoading } = useTeamMembers(id);
  const { data: announcements } = useTeamAnnouncements(id);
  const { data: strategyRooms } = useStrategyRooms(id);

  const addMemberMutation = useAddMember();
  const createAnnouncementMutation = useCreateAnnouncement();
  const createStrategyRoomMutation = useCreateStrategyRoom();

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);

  // Form states
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<TeamRole>('member');
  const [memberJersey, setMemberJersey] = useState<number | ''>('');

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');

  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');

  if (teamLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <LoadingState message="Loading squad roster..." rows={2} />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <ErrorState error={error} title="Squad not found" onRetry={() => refetch()} />
      </div>
    );
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !memberUserId.trim()) return;
    await addMemberMutation.mutateAsync({
      teamId: id,
      userId: memberUserId.trim(),
      role: memberRole,
      jerseyNumber: memberJersey === '' ? undefined : Number(memberJersey),
    });
    setMemberUserId('');
    setMemberJersey('');
    setMemberModalOpen(false);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !announcementTitle.trim()) return;
    await createAnnouncementMutation.mutateAsync({
      teamId: id,
      title: announcementTitle.trim(),
      body: announcementBody.trim(),
    });
    setAnnouncementTitle('');
    setAnnouncementBody('');
    setAnnouncementModalOpen(false);
  };

  const handleCreateStrategyRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !roomName.trim()) return;
    await createStrategyRoomMutation.mutateAsync({
      teamId: id,
      name: roomName.trim(),
      description: roomDesc.trim(),
    });
    setRoomName('');
    setRoomDesc('');
    setStrategyModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      {/* Back button */}
      <div>
        <Link
          to="/teams"
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-editorial-muted hover:text-editorial-charcoal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Teams Directory</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="bg-editorial-surface border border-editorial-border rounded-md p-6 sm:p-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-editorial-green bg-editorial-green/10 border border-editorial-green/20 px-2.5 py-0.5 rounded uppercase">
              [{team.tag || 'HQ'}]
            </span>
            <span className="font-mono text-xs text-editorial-muted uppercase">
              {team.game}
            </span>
          </div>

          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight">
            {team.name}
          </h1>

          {team.bio && (
            <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl leading-relaxed">
              {team.bio}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMemberModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add Player
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setStrategyModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Strategy Room
          </Button>
        </div>
      </div>

      {/* Main Grid: Roster (Left 7 cols) vs Announcements & Strategy (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Active Team Roster */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-editorial-green" />
                  Active Squad Lineup
                </CardTitle>
                <p className="text-xs text-editorial-muted">Standard 4-player competitive roster & substitutes</p>
              </div>
              <span className="font-mono text-xs font-bold bg-editorial-ivory border px-2 py-0.5 rounded">
                {members?.length || 0} / 6 Registered
              </span>
            </CardHeader>
            <CardContent>
              {membersLoading && <LoadingState message="Loading squad members..." rows={2} />}

              {!membersLoading && (!members || members.length === 0) && (
                <p className="text-xs text-editorial-muted py-4">No roster members found.</p>
              )}

              {!membersLoading && members && (
                <div className="flex flex-col divide-y divide-editorial-border/60">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="py-3 flex items-center justify-between gap-4 text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-editorial-ivory border border-editorial-border flex items-center justify-center font-heading font-bold text-editorial-charcoal text-xs">
                          {member.jersey_number !== null ? `#${member.jersey_number}` : '•'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-heading font-bold text-sm text-editorial-charcoal tracking-tight font-sans">
                            {member.profile?.display_name || member.profile?.username || 'Roster Player'}
                          </span>
                          <span className="text-[10px] text-editorial-muted">
                            Joined {formatDateTime(member.joined_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-editorial-ivory border border-editorial-border text-editorial-charcoal">
                          {TEAM_ROLE_LABELS[member.role] || member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Announcements Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-editorial-orange" />
                  Squad Notice Board
                </CardTitle>
                <p className="text-xs text-editorial-muted">Internal check-in directives and scrim schedules</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setAnnouncementModalOpen(true)}>
                Post Notice
              </Button>
            </CardHeader>
            <CardContent>
              {announcements && announcements.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 bg-editorial-ivory border border-editorial-border rounded flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm text-editorial-charcoal">
                          {ann.title}
                        </span>
                        <span className="font-mono text-[10px] text-editorial-muted">
                          {formatDateTime(ann.created_at)}
                        </span>
                      </div>
                      {ann.body && (
                        <p className="text-xs text-editorial-muted leading-relaxed">
                          {ann.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-editorial-muted py-2">No active announcements on the squad notice board.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Strategy Rooms */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Compass className="w-4 h-4 text-editorial-green" />
                  Tactical Strategy Rooms
                </CardTitle>
                <p className="text-xs text-editorial-muted">Bermuda, Purgatory & Alpine rotations</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setStrategyModalOpen(true)}>
                New Room
              </Button>
            </CardHeader>
            <CardContent>
              {strategyRooms && strategyRooms.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {strategyRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-4 bg-editorial-surface border border-editorial-border hover:border-editorial-charcoal/40 transition-colors rounded-md flex flex-col gap-2 shadow-subtle"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-heading font-bold text-sm text-editorial-charcoal">
                          {room.name}
                        </h4>
                        <span className="font-mono text-[10px] text-editorial-muted">
                          Updated {formatDateTime(room.updated_at)}
                        </span>
                      </div>
                      {room.description && (
                        <p className="text-xs text-editorial-muted line-clamp-2">
                          {room.description}
                        </p>
                      )}
                      <div className="mt-2 pt-2 border-t border-editorial-border/60 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-editorial-green font-semibold">
                          Tactical Notes Attached
                        </span>
                        <Link to={`/strategy/${room.id}`}>
                          <Button variant="secondary" size="sm" className="text-xs">
                            Open Room →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-editorial-muted text-xs">
                  <p>No strategy rooms initialized.</p>
                  <Button variant="secondary" size="sm" onClick={() => setStrategyModalOpen(true)} className="mt-2">
                    Create Strategy Room
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Add Member */}
      <Modal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title="Add Player to Lineup"
        description="Assign player UID or UUID to roster slot with competitive jersey number and role."
      >
        <form onSubmit={handleAddMember} className="flex flex-col gap-4">
          <Input
            label="Player User UUID or UID"
            placeholder="e.g. 893c5d64-2cf9-4ee7-9e79-50ebbc2a22cc"
            value={memberUserId}
            onChange={(e) => setMemberUserId(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-editorial-charcoal font-heading">
                Role
              </label>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as TeamRole)}
                className="w-full px-3 py-2 text-sm bg-editorial-surface border border-editorial-border rounded text-editorial-charcoal focus:outline-none"
              >
                <option value="captain">Captain</option>
                <option value="member">Active Roster</option>
                <option value="substitute">Substitute</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <Input
              label="Jersey Number"
              type="number"
              placeholder="e.g. 7"
              value={memberJersey}
              onChange={(e) => setMemberJersey(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-editorial-border">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMemberModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={addMemberMutation.isPending}>
              Add to Roster
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Post Notice */}
      <Modal
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        title="Post Squad Notice"
        description="Announcement will be surfaced to all verified roster members on this team."
      >
        <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-4">
          <Input
            label="Announcement Title"
            placeholder="e.g. Scrims Discord Room Passwords & Drop Order"
            value={announcementTitle}
            onChange={(e) => setAnnouncementTitle(e.target.value)}
            required
          />

          <Textarea
            label="Details & Directives"
            placeholder="Instructions for lineup, warmups, and voice comms channel..."
            value={announcementBody}
            onChange={(e) => setAnnouncementBody(e.target.value)}
            rows={4}
          />

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-editorial-border">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAnnouncementModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={createAnnouncementMutation.isPending}>
              Post Notice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Strategy Room */}
      <Modal
        isOpen={strategyModalOpen}
        onClose={() => setStrategyModalOpen(false)}
        title="Create Strategy Room"
        description="Initialize a dedicated tactical plan for a specific tournament map or rotation pattern."
      >
        <form onSubmit={handleCreateStrategyRoom} className="flex flex-col gap-4">
          <Input
            label="Strategy Room Name"
            placeholder="e.g. Bermuda Factory Roof & Early Aggression"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />

          <Textarea
            label="Tactical Brief"
            placeholder="Overview of loot zones, vehicle priority, and designated marksman perches..."
            value={roomDesc}
            onChange={(e) => setRoomDesc(e.target.value)}
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-editorial-border">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStrategyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={createStrategyRoomMutation.isPending}>
              Initialize Room
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
