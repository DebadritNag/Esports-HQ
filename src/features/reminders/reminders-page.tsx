import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { LoadingState } from '../../components/feedback/loading-state';
import { ErrorState } from '../../components/feedback/error-state';
import {
  Bell,
  Clock,
  Radio,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Save,
  Check,
} from 'lucide-react';
import {
  useReminders,
  useReminderPreferences,
  useUpdateReminderPreferences,
} from './api';
import { formatDateTime, getRelativeTime } from '../../lib/utils';
import type { ReminderPreference } from '../../types/api';

export const RemindersPage: React.FC = () => {
  const { data: remindersResponse, isLoading: remindersLoading, isError, error, refetch } = useReminders();
  const { data: prefs, isLoading: prefsLoading } = useReminderPreferences();
  const updatePrefsMutation = useUpdateReminderPreferences();

  const [formState, setFormState] = useState<Partial<ReminderPreference>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync initial state when preferences arrive
  React.useEffect(() => {
    if (prefs) {
      setFormState({
        registration_reminders_enabled: prefs.registration_reminders_enabled,
        registration_lead_minutes: prefs.registration_lead_minutes,
        check_in_reminders_enabled: prefs.check_in_reminders_enabled,
        check_in_lead_minutes: prefs.check_in_lead_minutes,
        stream_reminders_enabled: prefs.stream_reminders_enabled,
        stream_lead_minutes: prefs.stream_lead_minutes,
        match_reminders_enabled: prefs.match_reminders_enabled,
        match_lead_minutes: prefs.match_lead_minutes,
      });
    }
  }, [prefs]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePrefsMutation.mutateAsync(formState);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const reminderJobs = remindersResponse?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-editorial-border">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-editorial-orange font-semibold mb-1">
            Automated Alert Delivery
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal tracking-tight">
            Tournament Pre-Drop Reminders
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted mt-1 max-w-xl">
            Configure automated web-push and email notifications. Standalone background workers deliver alerts according to your customized lead times.
          </p>
        </div>
      </div>

      {/* Grid: Preferences (Left 7 cols) vs Live Queue (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Lead-Time Configuration */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-editorial-green" />
                  Default Lead Time Preferences
                </CardTitle>
                <p className="text-xs text-editorial-muted">
                  Precedence: Event-override &gt; Organizer-override &gt; User-defaults
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {prefsLoading ? (
                <LoadingState message="Loading preferences..." rows={2} />
              ) : (
                <form onSubmit={handleSavePreferences} className="flex flex-col gap-5">
                  {/* Registration Close */}
                  <div className="p-4 bg-editorial-ivory border border-editorial-border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="font-heading font-semibold text-sm text-editorial-charcoal">
                        Registration Close Alerts
                      </span>
                      <span className="text-xs text-editorial-muted">
                        Alert dispatched before portal locks
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={formState.registration_lead_minutes ?? 30}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            registration_lead_minutes: Number(e.target.value),
                          }))
                        }
                        className="text-xs bg-editorial-surface border border-editorial-border rounded px-3 py-1.5 font-mono text-editorial-charcoal focus:outline-none"
                      >
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before (Default)</option>
                        <option value={60}>1 hour before</option>
                        <option value={120}>2 hours before</option>
                      </select>

                      <input
                        type="checkbox"
                        checked={formState.registration_reminders_enabled ?? true}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            registration_reminders_enabled: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-editorial-green rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Check-In */}
                  <div className="p-4 bg-editorial-ivory border border-editorial-border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="font-heading font-semibold text-sm text-editorial-charcoal">
                        Captain Check-In Alerts
                      </span>
                      <span className="text-xs text-editorial-muted">
                        Password distribution and discord attendance
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={formState.check_in_lead_minutes ?? 15}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            check_in_lead_minutes: Number(e.target.value),
                          }))
                        }
                        className="text-xs bg-editorial-surface border border-editorial-border rounded px-3 py-1.5 font-mono text-editorial-charcoal focus:outline-none"
                      >
                        <option value={10}>10 minutes before</option>
                        <option value={15}>15 minutes before (Default)</option>
                        <option value={30}>30 minutes before</option>
                      </select>

                      <input
                        type="checkbox"
                        checked={formState.check_in_reminders_enabled ?? true}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            check_in_reminders_enabled: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-editorial-green rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Match Starts */}
                  <div className="p-4 bg-editorial-ivory border border-editorial-border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="font-heading font-semibold text-sm text-editorial-charcoal">
                        Match Start Alerts
                      </span>
                      <span className="text-xs text-editorial-muted">
                        Only generated for <strong>confirmed</strong> events
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={formState.match_lead_minutes ?? 30}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            match_lead_minutes: Number(e.target.value),
                          }))
                        }
                        className="text-xs bg-editorial-surface border border-editorial-border rounded px-3 py-1.5 font-mono text-editorial-charcoal focus:outline-none"
                      >
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before (Default)</option>
                        <option value={45}>45 minutes before</option>
                      </select>

                      <input
                        type="checkbox"
                        checked={formState.match_reminders_enabled ?? true}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            match_reminders_enabled: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-editorial-green rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-editorial-muted">
                      Updated in `reminder_preferences` via Fastify API
                    </span>
                    <Button
                      type="submit"
                      variant={saveSuccess ? 'secondary' : 'primary'}
                      size="sm"
                      isLoading={updatePrefsMutation.isPending}
                      leftIcon={saveSuccess ? <Check className="w-4 h-4 text-editorial-green" /> : <Save className="w-4 h-4" />}
                    >
                      {saveSuccess ? 'Preferences Saved' : 'Save Preferences'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actual Reminder Jobs (Queue) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-editorial-orange" />
                  Your Scheduled Reminder Jobs
                </CardTitle>
                <p className="text-xs text-editorial-muted">Managed by Postgres reminder engine RPCs</p>
              </div>
            </CardHeader>
            <CardContent>
              {remindersLoading && <LoadingState message="Checking queue..." rows={2} />}

              {isError && (
                <ErrorState error={error} title="Could not load reminders" onRetry={() => refetch()} />
              )}

              {!remindersLoading && !isError && reminderJobs.length === 0 && (
                <div className="text-center py-6 text-xs text-editorial-muted">
                  <p>No active reminder jobs in queue.</p>
                  <p className="mt-1 text-[11px] text-[#777A75]">
                    Track an event on the tournament radar to schedule automated alerts.
                  </p>
                </div>
              )}

              {!remindersLoading && !isError && reminderJobs.length > 0 && (
                <div className="flex flex-col gap-3">
                  {reminderJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3.5 bg-editorial-surface border border-editorial-border rounded flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase text-editorial-orange bg-editorial-orange/10 px-2 py-0.5 rounded">
                          {job.reminder_type.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[10px] text-editorial-muted">
                          Status: {job.status}
                        </span>
                      </div>

                      <div className="font-heading font-semibold text-editorial-charcoal">
                        {job.event?.title || 'Tournament Reminder'}
                      </div>

                      <div className="flex items-center justify-between font-mono text-[11px] text-editorial-muted pt-1 border-t border-editorial-border/60">
                        <span>Scheduled:</span>
                        <span className="font-semibold text-editorial-charcoal">
                          {formatDateTime(job.scheduled_for)} ({getRelativeTime(job.scheduled_for)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
