/**
 * Generic API source adapter — intentionally UNSUPPORTED.
 *
 * A generic "call any third-party API" adapter cannot be implemented safely:
 * each provider needs authorized access, a provider-specific contract, and
 * credentials managed in Vault. Rather than fake a success, every operation
 * returns a typed `unsupported` result. Concrete, authorized integrations
 * (e.g. a specific tournament platform) should be added as dedicated adapters.
 *
 * COMPLIANCE: only call external APIs with the provider's authorization and
 * within their Terms of Service.
 */

import {
  unsupported,
  type AdapterHealth,
  type AdapterResult,
  type SourceAdapter,
  type SourceEventCandidate,
  type SourceType,
  type UnsupportedResult,
} from './adapter.js';

const REASON =
  'Generic API ingestion is not implemented: it requires authorized, provider-specific access and credentials in Vault. Add a dedicated adapter for a supported provider.';

export class ApiAdapter implements SourceAdapter {
  public readonly sourceType: SourceType = 'api';
  private health: AdapterHealth = {};

  validate(): UnsupportedResult {
    return unsupported(REASON);
  }

  async discover(): Promise<AdapterResult<string[]>> {
    return unsupported(REASON);
  }

  async fetch(): Promise<AdapterResult<string>> {
    return unsupported(REASON);
  }

  async parse(): Promise<AdapterResult<SourceEventCandidate[]>> {
    return unsupported(REASON);
  }

  dedup(candidates: SourceEventCandidate[]): SourceEventCandidate[] {
    return candidates;
  }

  detectChanges(candidates: SourceEventCandidate[]): SourceEventCandidate[] {
    return candidates;
  }

  lastSuccess(): AdapterHealth {
    return this.health;
  }

  reportError(category: string, message: string): void {
    this.health = { ...this.health, lastError: `${category}: ${message}` };
  }

  retry(): boolean {
    return false;
  }
}

export function createApiAdapter(): ApiAdapter {
  return new ApiAdapter();
}
