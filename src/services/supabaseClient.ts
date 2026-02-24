import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://mock-url.supabase.co';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'mock-anon-key';

export const supabase = createClient(url, anonKey);

const BUCKET_NAME = 'articles-content';

export async function uploadContent (articleId: string, content: string): Promise<string | null> {
  const fileName = `${articleId}/content.html`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, content, {
      'contentType': 'text/html',
      'upsert': true
    });

  if (error) {
    return null;
  }

  return fileName;
}

export async function downloadContent (path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(path);

  if (error || !data) {
    return null;
  }

  return data.text();
}
