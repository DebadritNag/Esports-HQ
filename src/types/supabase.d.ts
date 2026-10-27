import type { GoTrueClient } from '@supabase/auth-js';

// Augment the module where SupabaseAuthClient is defined so that TypeScript,
// IDE language servers, and all call sites recognize all GoTrueClient methods
// on supabase.auth (getSession, onAuthStateChange, signInWithPassword, signOut, etc.).

declare module '@supabase/supabase-js/dist/module/lib/SupabaseAuthClient' {
  interface SupabaseAuthClient extends GoTrueClient {}
}

declare module '@supabase/supabase-js/dist/main/lib/SupabaseAuthClient' {
  interface SupabaseAuthClient extends GoTrueClient {}
}

declare module '@supabase/supabase-js' {
  interface SupabaseAuthClient extends GoTrueClient {}
}
