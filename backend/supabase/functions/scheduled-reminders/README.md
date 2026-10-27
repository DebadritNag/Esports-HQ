# `scheduled-reminders` Edge Function

Optional Deno Edge Function that drives the reminder/recurrence engine from
**Supabase Cron** — the **primary** scheduling path in production.

## What it does

On each invocation it calls the service-role RPCs:

1. `generate_recurrence_occurrences(p_horizon_days)` — rolls the recurrence
   horizon forward.
2. `requeue_stuck_reminder_jobs()` — recovers jobs left `processing` by a
   crashed worker.
3. `expire_stale_reminder_jobs()` — expires jobs whose window has passed.
4. `claim_due_reminder_jobs(p_worker, p_limit)` — advances due jobs.

> **Delivery note:** this stub only moves jobs through the reminder-engine
> state machine. Actual web-push / email delivery is performed by the persistent
> Node reminder worker (`npm run worker:reminder`) or by a delivery function you
> wire into the edge runtime. If you rely solely on this function, jobs are
> claimed but not pushed until a delivery process runs.

## Primary (Supabase Cron) vs. alternative (standalone Node worker)

| Concern                 | Supabase Cron + this function (primary) | Standalone Node worker (alternative) |
| ----------------------- | --------------------------------------- | ------------------------------------ |
| Scheduling              | Supabase Cron (`pg_cron`)               | `setInterval` in a long-lived process |
| Hosting                 | Managed by Supabase                     | You run a persistent Node host        |
| Recurrence generation   | ✅ this function                         | ✅ `npm run worker:recurrence`         |
| Job state transitions   | ✅ this function                         | ✅ `npm run worker:reminder`           |
| Web-push / email sending | ❌ (add a provider or run the Node worker) | ✅ `npm run worker:reminder`           |

Pick **one** scheduler to own recurrence/claim so the two don't double-run. You
can use Cron for scheduling and keep the Node worker only for delivery, or run
the Node workers for everything and skip this function.

## Deploy

```bash
# From the backend/ directory, with the Supabase CLI installed and linked:
supabase login
supabase link --project-ref pivamlbexbpnlqbhqljm

# Secrets the function reads at runtime (never commit these):
supabase secrets set SUPABASE_URL="https://pivamlbexbpnlqbhqljm.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set RECURRENCE_HORIZON_DAYS="30"
supabase secrets set REMINDER_BATCH_SIZE="50"

supabase functions deploy scheduled-reminders
```

## Schedule with Supabase Cron

Create a cron schedule (in the SQL editor or a migration) that invokes the
function every minute (tune to taste):

```sql
select cron.schedule(
  'scheduled-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://pivamlbexbpnlqbhqljm.functions.supabase.co/scheduled-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);
```

> This file is **not** part of the Node/TypeScript build (`tsconfig` excludes
> `supabase/`). It targets the Deno runtime and uses an `esm.sh` import for
> `@supabase/supabase-js`.
