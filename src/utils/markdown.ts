import MarkdownIt from 'markdown-it';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

md.renderer.rules.text = function(tokens: Array<{ content: string }>, idx: number) {
  const token = tokens[idx];
  const text = token.content;

  let result = text;

  result = result.replace(/\[\[([^\]]+)\]\]/g, (_match: string, p1: string) => {
    const [title, displayText] = p1.split('|').map((s: string) => s.trim());
    const slug = titleToSlug(title || displayText);
    return `<a href="/article/${slug}" class="wiki-link">${displayText || title}</a>`;
  });

  result = result.replace(/\$\$([^$]+)\$\$/g, (_match: string, p1: string) => {
    try {
      const html = katex.renderToString(p1, { displayMode: true });
      return html;
    } catch {
      return _match;
    }
  });

  result = result.replace(/\$([^$]+)\$/g, (_match: string, p1: string) => {
    try {
      const html = katex.renderToString(p1, { displayMode: false });
      return html;
    } catch {
      return _match;
    }
  });

  return result;
};

export function renderMarkdown(content: string): string {
  return md.render(content);
}

export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractWikiLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches.map(match => {
    const [title] = match.slice(2, -2).split('|').map(s => s.trim());
    return title;
  });
}
