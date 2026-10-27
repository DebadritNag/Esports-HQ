import { createClient, type GoTrueClient, type User, type Session } from '@supabase/supabase-js';
import { APP_CONFIG } from './constants';

const client = createClient(
  APP_CONFIG.supabaseUrl,
  APP_CONFIG.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export type TypedSupabaseClient = Omit<typeof client, 'auth'> & {
  auth: GoTrueClient;
};

export const supabase: TypedSupabaseClient = client as TypedSupabaseClient;
export type { User, Session, GoTrueClient };
