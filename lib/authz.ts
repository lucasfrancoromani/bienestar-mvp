// app/lib/authz.ts
import { supabase } from './supabase';

export async function isProUser(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_pro');
  if (error) {
    // ante cualquier error, no bloquees la UI, pero registra en consola
    console.warn('is_pro RPC error:', error);
    return false;
  }
  return Boolean(data);
}
