export function htmlToPlainText (html: string): string {
  if (!html) {
    return '';
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
}

export function getContentExcerpt (html: string, maxLength: number = 160): string {
  const text = htmlToPlainText(html);
  const chars = Array.from(text);

  if (chars.length <= maxLength) {
    return text;
  }

  const truncated = chars
    .slice(0, maxLength)
    .join('')
    .trimEnd();

  return `${truncated}...`;
}

export function escapeHtml (text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
