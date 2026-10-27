import { APP_CONFIG } from './constants';
import { supabase } from './supabase';
import type { ApiErrorEnvelope } from '../types/api';

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly requestId?: string;
  public readonly details?: unknown;

  constructor(message: string, status: number, code = 'INTERNAL_ERROR', requestId?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  requiresAuth?: boolean;
}

/**
 * Core API Client for interacting with the Free Fire Esports HQ Fastify backend.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    body,
    params,
    requiresAuth = true,
    headers: customHeaders,
    ...customOptions
  } = options;

  // Build full URL
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${APP_CONFIG.apiBaseUrl}${normalizedEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Build headers
  const headers = new Headers(customHeaders);
  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach Supabase bearer token if available / required
  if (requiresAuth) {
    const authClient = supabase.auth as unknown as import('./supabase').GoTrueClient;
    const { data } = await authClient.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else if (requiresAuth) {
      // If endpoint strictly requires auth and user is logged out
      throw new ApiError('Authentication required. Please sign in.', 401, 'UNAUTHORIZED');
    }
  }

  const response = await fetch(url, {
    ...customOptions,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  // Handle No Content
  if (response.status === 204) {
    return {} as T;
  }

  // Parse JSON response
  let json: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  } else {
    json = await response.text();
  }

  if (!response.ok) {
    const errorData = json as ApiErrorEnvelope | undefined;
    const errorObj = errorData?.error;
    const message = errorObj?.message || response.statusText || 'Request failed';
    const code = errorObj?.code || `HTTP_${response.status}`;
    const requestId = errorObj?.requestId;
    const details = errorObj?.details;

    throw new ApiError(message, response.status, code, requestId, details);
  }

  return json as T;
}
