/**
 * Supabase Edge Function (Deno) — scheduled-reminders (OPTIONAL stub).
 *
 * This is the PRIMARY production scheduling path: a Supabase Cron schedule
 * invokes this function on an interval, and it calls the same service-role
 * RPCs the standalone Node workers use. Running this means you do NOT need the
 * long-lived Node `worker:reminder` / `worker:recurrence` processes for
 * scheduling — though you still need a persistent host for the Discord bot and
 * for actually delivering web-push/email (the RPCs here only move jobs through
 * the reminder-engine state machine).
 *
 * This file is a STUB intended to be deployed with the Supabase CLI
 * (`supabase functions deploy scheduled-reminders`). It is written for the Deno
 * runtime and is intentionally NOT part of the Node/TypeScript build — the root
 * tsconfig excludes `supabase/`. See README.md in this folder for setup, the
 * cron schedule, and the required secrets.
 *
 * Security: the service-role key is read from the function's environment
 * (set via `supabase secrets set`); it is never hard-coded here.
 */

// @ts-nocheck — this file targets the Deno runtime, not the Node build.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

Deno.serve(async (req: Request): Promise<Response> => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const horizonDays = Number(Deno.env.get('RECURRENCE_HORIZON_DAYS') ?? '30');

  if (!url || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const worker = `edge-scheduled-reminders#${crypto.randomUUID().slice(0, 8)}`;
  const results: Record<string, unknown> = {};

  // 1. Roll the recurrence horizon forward.
  {
    const { data, error } = await supabase.rpc('generate_recurrence_occurrences', {
      p_horizon_days: horizonDays,
    });
    results.recurrence = error ? { error: error.message } : { generated: data };
  }

  // 2. Requeue stuck jobs and expire stale ones (housekeeping).
  {
    const { data, error } = await supabase.rpc('requeue_stuck_reminder_jobs', {});
    results.requeued = error ? { error: error.message } : data;
  }
  {
    const { data, error } = await supabase.rpc('expire_stale_reminder_jobs');
    results.expired = error ? { error: error.message } : data;
  }

  // 3. Claim due jobs. NOTE: delivery (web-push / email) is performed by the
  //    persistent Node worker or your delivery function — this stub only
  //    advances the reminder-engine state machine. Extend here if you wire a
  //    push provider into the edge runtime.
  {
    const { data, error } = await supabase.rpc('claim_due_reminder_jobs', {
      p_worker: worker,
      p_limit: Number(Deno.env.get('REMINDER_BATCH_SIZE') ?? '50'),
    });
    results.claimed = error ? { error: error.message } : (data?.length ?? 0);
  }

  return new Response(JSON.stringify({ ok: true, worker, results }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
