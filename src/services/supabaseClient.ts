import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://mock-url.supabase.co';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'mock-anon-key';

export const supabase = createClient(url, anonKey);

const BUCKET_NAME = 'articles-content';
const COVER_BUCKET_NAME = 'article-covers';

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

export async function uploadCoverImage (articleId: string, file: File | Blob): Promise<string | null> {
  const ext = file.type.split('/')[1] || 'png';
  const fileName = `${articleId}/cover.${ext}`;

  const { error } = await supabase.storage
    .from(COVER_BUCKET_NAME)
    .upload(fileName, file, {
      'contentType': file.type,
      'upsert': true
    });

  if (error) {
    return null;
  }

  return fileName;
}

export async function deleteCoverImage (path: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from(COVER_BUCKET_NAME)
    .remove([path]);

  return !error;
}

export async function deleteContent (path: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  return !error;
}

export function getCoverImageUrl (path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  const { data } = supabase.storage
    .from(COVER_BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}
