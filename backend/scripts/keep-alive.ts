/**
 * Standalone keep-alive pinger.
 *
 * Periodically GETs KEEP_ALIVE_URL (your deployed /ready endpoint) so a
 * free-tier Render web service does not idle-sleep, and so the Supabase
 * project registers activity (the /ready probe does a real DB read).
 *
 * This is an ALTERNATIVE to the GitHub Actions workflow in
 * .github/workflows/keep-alive.yml. Prefer the GitHub Actions version in
 * production: an external scheduler can keep a sleeping service awake, whereas
 * running this on the same host that sleeps defeats the purpose. Run this on a
 * DIFFERENT always-on host, or locally for testing.
 *
 * Usage:
 *   KEEP_ALIVE_URL=https://your-api.onrender.com/ready npm run keep-alive
 *
 * Env:
 *   KEEP_ALIVE_URL          required - full readiness URL to ping
 *   KEEP_ALIVE_INTERVAL_MS  optional - ping interval (default 600000 = 10 min)
 */

import { setTimeout as sleep } from 'node:timers/promises';

const url = process.env.KEEP_ALIVE_URL?.trim();
const intervalMs = Number.parseInt(process.env.KEEP_ALIVE_INTERVAL_MS ?? '600000', 10);

function log(message: string, extra?: Record<string, unknown>): void {
  const line = { ts: new Date().toISOString(), msg: message, ...extra };
  // Plain stdout; never logs secrets (there are none here).
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line));
}

if (!url) {
  log('KEEP_ALIVE_URL is not set; nothing to ping. Exiting cleanly.');
  process.exit(0);
}

if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
  log('KEEP_ALIVE_INTERVAL_MS must be a positive integer >= 1000. Exiting.');
  process.exit(1);
}

let running = true;

async function pingOnce(target: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(target, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'user-agent': 'ffhq-keep-alive/1.0' },
    });
    // 200 = ready, 503 = up-but-degraded; both mean the process is awake.
    if (res.status === 200 || res.status === 503) {
      log('ping ok', { status: res.status });
    } else {
      log('ping unexpected status', { status: res.status });
    }
  } catch (err) {
    log('ping failed', { error: err instanceof Error ? err.message : 'unknown' });
  } finally {
    clearTimeout(timeout);
  }
}

function stop(signal: NodeJS.Signals): void {
  log('shutting down', { signal });
  running = false;
}

process.on('SIGTERM', stop);
process.on('SIGINT', stop);

async function main(): Promise<void> {
  log('keep-alive started', { url, intervalMs });
  // Ping immediately on start, then on the interval.
  while (running) {
    await pingOnce(url as string);
    if (!running) break;
    await sleep(intervalMs);
  }
  log('keep-alive stopped');
  process.exit(0);
}

void main();
