import { describe, it, expect } from 'vitest';
import { loadConfig, ConfigValidationError, hasServiceRole } from '../../src/config/index.js';

const baseEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
};

describe('config', () => {
  it('loads with only the always-required vars', () => {
    const config = loadConfig({ ...baseEnv });
    expect(config.SUPABASE_URL).toBe(baseEnv.SUPABASE_URL);
    expect(config.NODE_ENV).toBe('development');
    expect(config.DEFAULT_TIMEZONE).toBe('Asia/Kolkata');
    expect(config.USE_FAKE_NOTIFICATIONS).toBe(false);
    expect(hasServiceRole(config)).toBe(false);
  });

  it('throws a non-secret error listing missing variable names', () => {
    try {
      loadConfig({});
      throw new Error('expected loadConfig to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const validationError = err as ConfigValidationError;
      expect(validationError.missing).toContain('SUPABASE_URL');
      expect(validationError.missing).toContain('SUPABASE_ANON_KEY');
      // Must list names, never values.
      expect(validationError.message).toContain('SUPABASE_URL');
      expect(validationError.message).toContain('SUPABASE_ANON_KEY');
    }
  });

  it('reports a bad SUPABASE_URL by name', () => {
    expect(() => loadConfig({ ...baseEnv, SUPABASE_URL: 'not-a-url' })).toThrow(
      ConfigValidationError,
    );
  });

  it('recognizes a configured service-role key', () => {
    const config = loadConfig({ ...baseEnv, SUPABASE_SERVICE_ROLE_KEY: 'svc' });
    expect(hasServiceRole(config)).toBe(true);
  });

  it('coerces USE_FAKE_NOTIFICATIONS to a boolean', () => {
    const config = loadConfig({ ...baseEnv, USE_FAKE_NOTIFICATIONS: 'true' });
    expect(config.USE_FAKE_NOTIFICATIONS).toBe(true);
  });
});
