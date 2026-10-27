import type { GoTrueClient } from '@supabase/auth-js';

declare module '@supabase/supabase-js' {
  // Merge GoTrueClient methods (getSession, onAuthStateChange, signInWithPassword, signUp, signOut, etc.)
  // into SupabaseAuthClient so TypeScript and IDE language servers resolve all auth methods.
  interface SupabaseAuthClient extends GoTrueClient {}
}
