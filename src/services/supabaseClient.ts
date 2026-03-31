import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://mock-url.supabase.co';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'mock-anon-key';

export const supabase = createClient(url, anonKey);

const BUCKET_NAME = 'articles-content';
const COVER_BUCKET_NAME = 'article-covers';

export async function uploadContent (slug: string, content: string): Promise<string | null> {
  const fileName = `${slug}/content.html`;

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
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  try {
    const response = await fetch(data.publicUrl);
    if (!response.ok) {
      return null;
    }
    return response.text();
  } catch {
    return null;
  }
}

async function deleteFolderFiles (bucketName: string, folderPath: string): Promise<void> {
  const { data } = await supabase.storage
    .from(bucketName)
    .list(folderPath);

  if (!data?.length) {
    return;
  }

  const filesToDelete = data
    .filter(item => item.name)
    .map(item => `${folderPath}/${item.name}`);

  if (filesToDelete.length > 0) {
    await supabase.storage
      .from(bucketName)
      .remove(filesToDelete);
  }
}

export async function uploadCoverImage (slug: string, file: File | Blob): Promise<string | null> {
  await deleteFolderFiles(COVER_BUCKET_NAME, slug);

  const ext = file.type.split('/')[1] || 'png';
  const timestamp = Date.now();
  const fileName = `${slug}/cover_${timestamp}.${ext}`;

  const { error } = await supabase.storage
    .from(COVER_BUCKET_NAME)
    .upload(fileName, file, {
      'contentType': file.type,
      'upsert': false
    });

  if (error) {
    return null;
  }

  return fileName;
}

export async function deleteArticleFolder (slug: string): Promise<void> {
  await deleteFolderFiles(BUCKET_NAME, slug);
  await deleteFolderFiles(COVER_BUCKET_NAME, slug);
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
