import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const useMockData = !supabase;

export async function testSupabaseConnection(): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('articles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
