import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { LoadingState } from '../../components/feedback/loading-state';
import { ErrorState } from '../../components/feedback/error-state';
import {
  ArrowLeft,
  Compass,
  FileText,
  Paperclip,
  CheckSquare,
  ShieldCheck,
  Plus,
  Save,
  Check,
} from 'lucide-react';
import { useStrategyRoom, useStrategyAttachments, useUpdateStrategyRoom } from './api';
import { formatDateTime } from '../../lib/utils';

export const StrategyPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { data: room, isLoading, isError, error, refetch } = useStrategyRoom(roomId || 'room-1');
  const { data: attachments } = useStrategyAttachments(roomId || 'room-1');
  const updateRoomMutation = useUpdateStrategyRoom();

  const [tacticNotes, setTacticNotes] = useState<string[]>(() => {
    const raw = (room?.content as { tactics?: string[] })?.tactics;
    return raw || [
      'Primary drop: Factory roofs and ground compound',
      'Fallback drop: Clock tower edge houses',
      'First rotation: Cut off Mars Electric flankers by 3:00',
    ];
  });

  const [newTactic, setNewTactic] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Checklists state
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Confirm all 4 players have updated anti-cheat client', done: true },
    { id: 2, text: 'Verify Discord voice room noise-suppression enabled', done: true },
    { id: 3, text: 'Assign designated AWM sniper & backup shotgun rusher', done: false },
    { id: 4, text: 'Check-in on organizer portal 15m before first drop', done: false },
  ]);

  const toggleChecklist = (id: number) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleAddTactic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTactic.trim()) return;
    setTacticNotes((prev) => [...prev, newTactic.trim()]);
    setNewTactic('');
  };

  const handleSaveNotes = async () => {
    if (!room) return;
    await updateRoomMutation.mutateAsync({
      roomId: room.id,
      content: { tactics: tacticNotes },
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <LoadingState message="Loading squad tactical strategy workspace..." rows={2} />
      </div>
    );
  }

  if (isError || !room) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <ErrorState error={error} title="Strategy Room Not Found" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      <div>
        <Link
          to="/teams"
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-editorial-muted hover:text-editorial-charcoal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Squad Hub</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-editorial-surface border border-editorial-border rounded-md p-6 sm:p-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-editorial-green bg-editorial-green/10 border border-editorial-green/20 px-2 py-0.5 rounded uppercase">
              Tactical Strategy Room
            </span>
            <span className="font-mono text-xs text-editorial-muted">
              Updated {formatDateTime(room.updated_at)}
            </span>
          </div>

          <h1 className="font-heading font-bold text-3xl text-editorial-charcoal tracking-tight">
            {room.name}
          </h1>

          {room.description && (
            <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl leading-relaxed">
              {room.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={saveSuccess ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleSaveNotes}
            isLoading={updateRoomMutation.isPending}
            leftIcon={saveSuccess ? <Check className="w-4 h-4 text-editorial-green" /> : <Save className="w-4 h-4" />}
          >
            {saveSuccess ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Tactical Drop Directives & Preparation Checklist */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Compass className="w-4 h-4 text-editorial-green" />
                  Tactical Drop Directives & Rotation Notes
                </CardTitle>
                <p className="text-xs text-editorial-muted">Live tactical plan for team voice coordination</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {tacticNotes.map((tactic, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-editorial-ivory border border-editorial-border rounded text-xs font-mono text-editorial-charcoal flex items-start gap-2.5"
                  >
                    <span className="text-editorial-green font-bold shrink-0">{idx + 1}.</span>
                    <span className="leading-relaxed">{tactic}</span>
                  </div>
                ))}
              </div>

              {/* Add directive */}
              <form onSubmit={handleAddTactic} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add drop rotation checkpoint..."
                  value={newTactic}
                  onChange={(e) => setNewTactic(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-editorial-surface border border-editorial-border rounded text-editorial-charcoal placeholder:text-editorial-muted focus:outline-none focus:border-editorial-charcoal"
                />
                <Button type="submit" variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Match Preparation Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-editorial-orange" />
                Pre-Match Squad Checklist
              </CardTitle>
              <p className="text-xs text-editorial-muted">Verification steps before entering tournament lobby</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2.5">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklist(item.id)}
                    className="flex items-center gap-3 p-3 text-left rounded border border-editorial-border hover:bg-editorial-ivory transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        item.done
                          ? 'bg-editorial-green border-editorial-green text-white'
                          : 'border-editorial-border bg-editorial-surface'
                      }`}
                    >
                      {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs ${
                        item.done
                          ? 'text-editorial-muted line-through'
                          : 'text-editorial-charcoal font-medium'
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Storage Attachments & Access Boundaries */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-editorial-charcoal" />
                Tactical Map Attachments
              </CardTitle>
              <p className="text-xs text-editorial-muted">
                Governed by Supabase Storage `strategy-attachments` bucket RLS
              </p>
            </CardHeader>
            <CardContent>
              {attachments && attachments.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 bg-editorial-ivory border border-editorial-border rounded flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-editorial-green shrink-0" />
                          <span className="font-heading font-semibold text-xs text-editorial-charcoal truncate">
                            {att.file_name}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-editorial-muted shrink-0">
                          {att.size_bytes ? `${Math.round(att.size_bytes / 1024)} KB` : ''}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-[#777A75] truncate">
                        Path: {att.storage_path}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-editorial-muted">
                  <p>No map heatmaps or strategy PDFs uploaded.</p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-editorial-border flex items-center justify-between text-xs font-mono text-editorial-muted">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-editorial-green" />
                  Team-Only RLS Bucket
                </span>
                <span>Metadata Only</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
