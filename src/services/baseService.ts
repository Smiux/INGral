import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const getSupabaseConfig = (): { url: string; anonKey: string } => {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  return {
    'url': url || 'https://mock-url.supabase.co',
    'anonKey': anonKey || 'mock-anon-key'
  };
};

const supabaseClient = createClient(
  getSupabaseConfig().url,
  getSupabaseConfig().anonKey
);

export abstract class BaseService {
  protected supabase: SupabaseClient = supabaseClient;

  protected async getById<T> (table: string, id: string | number): Promise<T | null> {
    try {
      const result = await this.supabase.from(table).select('*')
        .eq('id', id)
        .single<T>();
      return result.data;
    } catch {
      return null;
    }
  }

  protected async create<T> (table: string, data: Record<string, unknown>): Promise<T | null> {
    try {
      const result = await this.supabase.from(table).insert(data)
        .select()
        .single<T>();
      return result.data;
    } catch {
      return null;
    }
  }
}
