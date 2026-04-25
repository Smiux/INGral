import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Tag, Layout, List, AlignJustify, ChevronLeft, ChevronRight, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getArticlesPaginated,
  getAllArticles,
  getArticlesContentBatch,
  type ArticleListItem,
  type ArticleWithContent
} from '../services/articleService';

interface SearchResult {
  article: ArticleWithContent;
  matchedFields: string[];
  highlightedTitle: string;
  highlightedSummary: string;
  contentMatches: ContentMatch[];
}

interface ContentMatch {
  context: string;
  highlightedContext: string;
  position: number;
  plainText: string;
}

interface SearchFilters {
  query: string;
  tags: string[];
}

function escapeRegExp (str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtmlTags (html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function highlightText (text: string, query: string): string {
  if (!query.trim()) {
    return text;
  }

  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600 text-inherit rounded px-0.5">$1</mark>');
}

function highlightSingleMatch (text: string, query: string, targetPosition: number): string {
  if (!query.trim()) {
    return text;
  }

  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(escapedQuery, 'gi');

  let result = text;
  let offset = 0;

  let match: RegExpExecArray | null = regex.exec(text);

  while (match !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    if (matchStart <= targetPosition && targetPosition < matchEnd) {
      const beforeMatch = result.slice(0, matchStart + offset);
      const matchText = match[0];
      const afterMatch = result.slice(matchEnd + offset);

      result = `${beforeMatch}<mark class="bg-yellow-200 dark:bg-yellow-600 text-inherit rounded px-0.5">${matchText}</mark>${afterMatch}`;
      offset += '<mark class="bg-yellow-200 dark:bg-yellow-600 text-inherit rounded px-0.5">'.length + '</mark>'.length;
    }

    match = regex.exec(text);
  }

  return result;
}

function extractContentContext (content: string, query: string, contextLength: number = 100): ContentMatch[] {
  const matches: ContentMatch[] = [];

  if (!query.trim()) {
    return matches;
  }

  const plainText = stripHtmlTags(content);
  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(escapedQuery, 'gi');

  const foundPositions = new Set<number>();

  let match: RegExpExecArray | null = regex.exec(plainText);

  while (match !== null) {
    const matchIndex = match.index;

    if (!foundPositions.has(matchIndex)) {
      foundPositions.add(matchIndex);

      const start = Math.max(0, matchIndex - contextLength);
      const end = Math.min(plainText.length, matchIndex + query.length + contextLength);

      let context = plainText.slice(start, end);

      if (start > 0) {
        context = `...${context}`;
      }
      if (end < plainText.length) {
        context = `${context}...`;
      }

      const highlightedContext = highlightSingleMatch(context, query, matchIndex - start + (start > 0 ? 3 : 0));

      matches.push({
        context,
        highlightedContext,
        'position': matchIndex,
        plainText
      });
    }

    match = regex.exec(plainText);
  }

  return matches;
}

function matchInText (text: string | null | undefined, query: string): boolean {
  if (!text) {
    return false;
  }

  const plainText = stripHtmlTags(text).toLowerCase();
  return plainText.includes(query.toLowerCase());
}

function matchInArray (arr: string[] | null | undefined, query: string): boolean {
  if (!arr || arr.length === 0) {
    return false;
  }

  const lowerQuery = query.toLowerCase();
  return arr.some((item) => item.toLowerCase().includes(lowerQuery));
}

function matchExactTag (tags: string[] | null | undefined, tagQuery: string): boolean {
  if (!tags || tags.length === 0) {
    return false;
  }

  const lowerTagQuery = tagQuery.toLowerCase();
  return tags.some((tag) => tag.toLowerCase() === lowerTagQuery);
}

function articleMatchesTags (article: ArticleWithContent, tags: string[]): boolean {
  return tags.every((tag) => matchExactTag(article.tags, tag));
}

function getMatchedFields (article: ArticleWithContent, query: string): string[] {
  const fields: string[] = [];

  if (matchInText(article.title, query)) {
    fields.push('title');
  }

  if (matchInText(article.summary, query)) {
    fields.push('summary');
  }

  if (matchInArray(article.tags, query)) {
    fields.push('tags');
  }

  if (matchInText(article.content, query)) {
    fields.push('content');
  }

  return fields;
}

function searchArticles (
  articles: ArticleWithContent[],
  filters: SearchFilters
): SearchResult[] {
  const { query, tags } = filters;
  const hasQuery = query.trim().length > 0;
  const hasTags = tags.length > 0;

  if (!hasQuery && !hasTags) {
    return articles.map((article) => ({
      article,
      'matchedFields': [],
      'highlightedTitle': article.title,
      'highlightedSummary': article.summary || '',
      'contentMatches': []
    }));
  }

  const results: SearchResult[] = [];

  articles.forEach((article) => {
    const matchedFields: string[] = [];
    let contentMatches: ContentMatch[] = [];

    if (hasTags) {
      if (!articleMatchesTags(article, tags)) {
        return;
      }
      matchedFields.push('tags');
    }

    if (hasQuery) {
      const fields = getMatchedFields(article, query);
      matchedFields.push(...fields);

      if (fields.includes('content')) {
        contentMatches = extractContentContext(article.content, query);
      }

      if (matchedFields.length === 0) {
        return;
      }
    }

    results.push({
      article,
      matchedFields,
      'highlightedTitle': hasQuery ? highlightText(article.title, query) : article.title,
      'highlightedSummary': hasQuery && article.summary ? highlightText(article.summary, query) : (article.summary || ''),
      contentMatches
    });
  });

  return results;
}

function formatDate (dateStr: string | null | undefined): string {
  if (!dateStr) {
    return 'N/A';
  }
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    'year': 'numeric',
    'month': 'long',
    'day': 'numeric',
    'hour': '2-digit',
    'minute': '2-digit',
    'second': '2-digit'
  };
  return date.toLocaleString('zh-CN', options);
}

type LayoutMode = 'comfortable' | 'compact' | 'dense';

interface TagClickHandlerProps {
  tag: string;
  onTagClick: (tag: string) => void;
}

function TagWithClick ({ tag, onTagClick }: TagClickHandlerProps): JSX.Element {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTagClick(tag);
  };

  return (
    <span
      onClick={handleClick}
      title={`搜索标签: ${tag}`}
      className="inline-flex items-center px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-xs cursor-pointer hover:bg-sky-200 dark:hover:bg-sky-800/50 transition-colors"
    >
      <Tag className="w-2.5 h-2.5 mr-1" />
      <span className="truncate max-w-[100px]" title={tag}>{tag}</span>
    </span>
  );
}

function HighlightedText ({ html }: { html: string }): JSX.Element {
  return <span dangerouslySetInnerHTML={{ '__html': html }} />;
}

function ContentMatchPreview ({ matches, articleSlug, onMatchClick, searchQuery }: {
  matches: ContentMatch[];
  articleSlug: string;
  onMatchClick: (url: string) => void;
  searchQuery: string;
}): JSX.Element {
  if (matches.length === 0) {
    return <></>;
  }

  return (
    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
      {matches.map((match, index) => (
        <div
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = `/articles/${articleSlug}?q=${encodeURIComponent(searchQuery)}&match=${index}#content-match`;
            onMatchClick(url);
          }}
          className="text-sm text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded border-l-2 border-sky-400 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <HighlightedText html={match.highlightedContext} />
        </div>
      ))}
    </div>
  );
}

const ComfortableArticleCard = ({
  result,
  onTagClick,
  onMatchClick,
  searchQuery
}: {
  result: SearchResult;
  onTagClick: (tag: string) => void;
  onMatchClick: (url: string) => void;
  searchQuery: string;
}): JSX.Element => {
  const { article, highlightedTitle, highlightedSummary, contentMatches, matchedFields } = result;
  const coverUrl = article.cover_image;
  const hasContentMatches = matchedFields.length > 0 && matchedFields.includes('content');

  return (
    <Link
      key={article.id}
      to={`/articles/${article.slug}`}
      className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 group overflow-hidden"
    >
      <div className="flex flex-col">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-72 lg:w-80 flex-shrink-0">
            <div className="aspect-video md:aspect-[4/3] bg-neutral-100 dark:bg-neutral-700 relative overflow-hidden">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl font-bold text-neutral-300 dark:text-neutral-600">
                    {article.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 p-6 flex flex-col">
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-3">
              <HighlightedText html={highlightedTitle} />
              {hasContentMatches && (
                <span className="ml-2 text-xs font-normal text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded">
                  内容匹配
                </span>
              )}
            </h2>
            {highlightedSummary && (
              <p className="text-neutral-600 dark:text-neutral-400 mb-4 flex-1 line-clamp-3">
                <HighlightedText html={highlightedSummary} />
              </p>
            )}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {article.tags.slice(0, 3).map((tag, index) => (
                  <TagWithClick key={index} tag={tag} onTagClick={onTagClick} />
                ))}
                {article.tags.length > 3 && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    +{article.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-auto">
              更新于 {formatDate(article.updated_at)}
            </div>
          </div>
        </div>
        {hasContentMatches && contentMatches.length > 0 && (
          <div className="px-6 pb-6 pt-2 border-t border-neutral-100 dark:border-neutral-700">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              内容匹配 ({contentMatches.length} 处):
            </div>
            <ContentMatchPreview
              matches={contentMatches}
              articleSlug={article.slug}
              onMatchClick={onMatchClick}
              searchQuery={searchQuery}
            />
          </div>
        )}
      </div>
    </Link>
  );
};

const CompactArticleCard = ({
  result,
  onTagClick,
  onMatchClick,
  searchQuery
}: {
  result: SearchResult;
  onTagClick: (tag: string) => void;
  onMatchClick: (url: string) => void;
  searchQuery: string;
}): JSX.Element => {
  const { article, highlightedTitle, highlightedSummary, contentMatches, matchedFields } = result;
  const coverUrl = article.cover_image;
  const hasContentMatches = matchedFields.length > 0 && matchedFields.includes('content');

  return (
    <Link
      key={article.id}
      to={`/articles/${article.slug}`}
      className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 group overflow-hidden"
    >
      <div className="flex flex-col">
        <div className="w-full h-[75vh] bg-neutral-100 dark:bg-neutral-700 relative overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-bold text-neutral-300 dark:text-neutral-600">
                {article.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="p-6">
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-3">
            <HighlightedText html={highlightedTitle} />
            {hasContentMatches && (
              <span className="ml-2 text-xs font-normal text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded">
                内容匹配 ({contentMatches.length} 处)
              </span>
            )}
          </h2>
          {highlightedSummary && (
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-3">
              <HighlightedText html={highlightedSummary} />
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            <span>{formatDate(article.updated_at)}</span>
          </div>
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.tags.slice(0, 5).map((tag, index) => (
                <span
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTagClick(tag);
                  }}
                  title={`搜索标签: ${tag}`}
                  className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    'backgroundColor': `hsl(${index * 60 % 360}, 70%, 90%)`,
                    'color': `hsl(${index * 60 % 360}, 70%, 30%)`
                  }}
                >
                  {tag}
                </span>
              ))}
              {article.tags.length > 5 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  +{article.tags.length - 5}
                </span>
              )}
            </div>
          )}
          {hasContentMatches && contentMatches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                内容匹配:
              </div>
              <ContentMatchPreview
                matches={contentMatches}
                articleSlug={article.slug}
                onMatchClick={onMatchClick}
                searchQuery={searchQuery}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const DenseArticleCard = ({
  result,
  onTagClick,
  onMatchClick,
  searchQuery
}: {
  result: SearchResult;
  onTagClick: (tag: string) => void;
  onMatchClick: (url: string) => void;
  searchQuery: string;
}): JSX.Element => {
  const { article, highlightedTitle, highlightedSummary, contentMatches, matchedFields } = result;
  const hasContentMatches = matchedFields.length > 0 && matchedFields.includes('content');

  return (
    <Link
      key={article.id}
      to={`/articles/${article.slug}`}
      className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 group p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-1 truncate" title={article.title}>
            <HighlightedText html={highlightedTitle} />
            {hasContentMatches && (
              <span className="ml-2 text-xs font-normal text-sky-500 dark:text-sky-400">
                [内容匹配 {contentMatches.length} 处]
              </span>
            )}
          </h2>
          {highlightedSummary && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-1">
              <HighlightedText html={highlightedSummary} />
            </p>
          )}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTagClick(tag);
                  }}
                  title={`搜索标签: ${tag}`}
                  className="inline-flex items-center px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-xs cursor-pointer hover:bg-sky-200 dark:hover:bg-sky-800/50 transition-colors"
                >
                  <span className="truncate max-w-[50px]">{tag}</span>
                </span>
              ))}
              {article.tags.length > 3 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  +{article.tags.length - 3}
                </span>
              )}
            </div>
          )}
          {hasContentMatches && contentMatches.length > 0 && (
            <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
              <ContentMatchPreview
                matches={contentMatches}
                articleSlug={article.slug}
                onMatchClick={onMatchClick}
                searchQuery={searchQuery}
              />
            </div>
          )}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0 whitespace-nowrap">
          {formatDate(article.updated_at)}
        </div>
      </div>
    </Link>
  );
};

const ARTICLES_PER_PAGE = 20;

export function ArticlesPage (): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [allArticlesForSearch, setAllArticlesForSearch] = useState<ArticleListItem[]>([]);
  const [articlesWithContent, setArticlesWithContent] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAllArticles, setIsLoadingAllArticles] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tagsParam = searchParams.get('tags');
    return tagsParam ? tagsParam.split(',').filter(Boolean) : [];
  });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('comfortable');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);

  const loadArticles = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const result = await getArticlesPaginated(page, ARTICLES_PER_PAGE);
      setArticles(result.articles);
      setTotalArticles(result.total);
      setTotalPages(result.totalPages);

      const tagSet = new Set<string>();
      result.articles.forEach((article) => {
        if (article.tags) {
          article.tags.forEach((tag) => tagSet.add(tag));
        }
      });
      setAllTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'zh-CN')));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllArticlesForSearch = useCallback(async () => {
    if (allArticlesForSearch.length > 0) {
      return;
    }

    setIsLoadingAllArticles(true);
    try {
      const allArticles = await getAllArticles();
      setAllArticlesForSearch(allArticles);

      const tagSet = new Set<string>();
      allArticles.forEach((article) => {
        if (article.tags) {
          article.tags.forEach((tag) => tagSet.add(tag));
        }
      });
      setAllTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'zh-CN')));
    } finally {
      setIsLoadingAllArticles(false);
    }
  }, [allArticlesForSearch.length]);

  useEffect(() => {
    loadArticles(currentPage);
  }, [currentPage, loadArticles]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }
    setSearchParams(params, { 'replace': true });
  }, [searchQuery, selectedTags, setSearchParams]);

  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) {
      return allTags;
    }
    const lowerQuery = tagSearchQuery.toLowerCase();
    return allTags.filter((tag) => tag.toLowerCase().includes(lowerQuery));
  }, [allTags, tagSearchQuery]);

  const displayTags = showAllTags ? filteredTags : filteredTags.slice(0, 10);

  const loadContentForSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      return;
    }

    setIsLoadingContent(true);
    try {
      const articleIds = allArticlesForSearch.map(a => a.id);
      const contentMap = await getArticlesContentBatch(articleIds);
      setArticlesWithContent(contentMap);
    } finally {
      setIsLoadingContent(false);
    }
  }, [allArticlesForSearch]);

  useEffect(() => {
    if (searchQuery.trim() || selectedTags.length > 0) {
      loadAllArticlesForSearch();
    }
  }, [searchQuery, selectedTags, loadAllArticlesForSearch]);

  useEffect(() => {
    if (searchQuery.trim() && allArticlesForSearch.length > 0) {
      loadContentForSearch(searchQuery);
    }
  }, [searchQuery, allArticlesForSearch.length, loadContentForSearch]);

  const searchResults = useMemo(() => {
    if (allArticlesForSearch.length === 0) {
      return [];
    }

    const articlesWithContentLoaded = allArticlesForSearch.map(article => ({
      ...article,
      'content': articlesWithContent.get(article.id) || ''
    }));

    return searchArticles(articlesWithContentLoaded, {
      'query': searchQuery,
      'tags': selectedTags
    });
  }, [allArticlesForSearch, articlesWithContent, searchQuery, selectedTags]);

  const isSearchMode = searchQuery.trim() || selectedTags.length > 0;

  const displayTotalPages = isSearchMode
    ? Math.ceil(searchResults.length / ARTICLES_PER_PAGE)
    : totalPages;

  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;

  const currentResults: SearchResult[] = isSearchMode
    ? searchResults.slice(startIndex, endIndex)
    : articles.map(article => ({
      'article': { ...article, 'content': '' },
      'matchedFields': [],
      'highlightedTitle': article.title,
      'highlightedSummary': article.summary || '',
      'contentMatches': []
    }));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    if (!e.target.value.trim()) {
      setArticlesWithContent(new Map());
    }
  };

  const handleTagClick = useCallback((tag: string) => {
    const url = new URL(window.location.href);
    url.pathname = '/articles';
    url.searchParams.set('tags', tag);
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    }
    window.open(url.toString(), '_blank');
  }, [searchQuery]);

  const handleMatchClick = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  const handleTagFilter = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      return [...prev, tag];
    });
    setCurrentPage(1);
  }, []);

  const removeTagFilter = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
    setCurrentPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedTags([]);
    setSearchQuery('');
    setCurrentPage(1);
    setArticlesWithContent(new Map());
  }, []);

  const handleJumpToPage = useCallback(() => {
    const page = parseInt(jumpPageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= displayTotalPages) {
      setCurrentPage(page);
      setJumpPageInput('');
    }
  }, [jumpPageInput, displayTotalPages]);

  const handleJumpInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  }, [handleJumpToPage]);

  const renderArticle = (result: SearchResult) => {
    switch (layoutMode) {
      case 'comfortable':
        return <ComfortableArticleCard key={result.article.id} result={result} onTagClick={handleTagClick} onMatchClick={handleMatchClick} searchQuery={searchQuery} />;
      case 'compact':
        return <CompactArticleCard key={result.article.id} result={result} onTagClick={handleTagClick} onMatchClick={handleMatchClick} searchQuery={searchQuery} />;
      case 'dense':
        return <DenseArticleCard key={result.article.id} result={result} onTagClick={handleTagClick} onMatchClick={handleMatchClick} searchQuery={searchQuery} />;
      default:
        return <ComfortableArticleCard key={result.article.id} result={result} onTagClick={handleTagClick} onMatchClick={handleMatchClick} searchQuery={searchQuery} />;
    }
  };

  const renderPagination = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(displayTotalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i += 1) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {(() => {
            const displayCount = searchQuery.trim() || selectedTags.length > 0
              ? searchResults.length
              : totalArticles;
            return (
              <>
                显示 {startIndex + 1}-{Math.min(endIndex, displayCount)} 条，共 {displayCount} 条
              </>
            );
          })()}
          {isLoadingAllArticles && (
            <span className="ml-2 text-sky-500">(正在加载所有文章进行搜索...)</span>
          )}
          {isLoadingContent && !isLoadingAllArticles && (
            <span className="ml-2 text-sky-500">(正在加载文章内容...)</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => setCurrentPage(1)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                1
              </button>
              {startPage > 2 && (
                <span className="text-neutral-400 dark:text-neutral-500">...</span>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-sky-500 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {page}
            </button>
          ))}

          {endPage < displayTotalPages && (
            <>
              {endPage < displayTotalPages - 1 && (
                <span className="text-neutral-400 dark:text-neutral-500">...</span>
              )}
              <button
                onClick={() => setCurrentPage(displayTotalPages)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {displayTotalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage(Math.min(displayTotalPages, currentPage + 1))}
            disabled={currentPage === displayTotalPages}
            className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">跳转到</span>
          <input
            type="number"
            min={1}
            max={displayTotalPages}
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            onKeyDown={handleJumpInputKeyDown}
            placeholder="页码"
            className="w-20 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          />
          <button
            onClick={handleJumpToPage}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            跳转
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading || isLoadingAllArticles) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">
            {isLoadingAllArticles ? '正在加载所有文章进行搜索...' : '加载中...'}
          </p>
        </div>
      );
    }

    if (currentResults.length > 0) {
      return (
        <>
          <div className={layoutMode === 'dense' ? 'space-y-3' : 'space-y-6'}>
            {currentResults.map(renderArticle)}
          </div>
          {displayTotalPages > 1 && renderPagination()}
        </>
      );
    }

    return (
      <div className="text-center py-12 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          {searchQuery || selectedTags.length > 0 ? '没有匹配的文章。' : '暂无文章。'}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-8 transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">所有文章</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setLayoutMode('compact')}
              className={`p-2 rounded-md transition-all duration-200 ${
                layoutMode === 'compact'
                  ? 'bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
              title="大图模式"
            >
              <Layout className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('comfortable')}
              className={`p-2 rounded-md transition-all duration-200 ${
                layoutMode === 'comfortable'
                  ? 'bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
              title="标准模式"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('dense')}
              className={`p-2 rounded-md transition-all duration-200 ${
                layoutMode === 'dense'
                  ? 'bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
              title="紧凑模式"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
          <Link
            to="/articles/create"
            className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-6 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-200 dark:hover:border-green-700 transition-all duration-200 transform hover:scale-105 font-medium"
          >
            <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
            创建文章
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="搜索文章标题、简介、内容或标签..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600 focus:border-sky-200 dark:focus:border-sky-600 outline-none transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
        />
      </div>

      {allTags.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">按标签筛选:</span>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
                >
                  清除全部
                </button>
              )}
            </div>
            {allTags.length > 10 && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1"
              >
                {showAllTags ? (
                  <>
                    收起 <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    展开全部 ({allTags.length}) <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
          {allTags.length > 10 && (
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="搜索标签..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600 focus:border-sky-200 dark:focus:border-sky-600 outline-none transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                />
                {tagSearchQuery && (
                  <button
                    onClick={() => setTagSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {displayTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagFilter(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? 'bg-sky-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {tag}
              </button>
            ))}
            {filteredTags.length === 0 && tagSearchQuery && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                没有匹配的标签
              </span>
            )}
          </div>
        </div>
      )}

      {selectedTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">已选标签:</span>
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm"
            >
              <Tag className="w-3 h-3" />
              {tag}
              <button
                onClick={() => removeTagFilter(tag)}
                className="ml-1 hover:text-sky-900 dark:hover:text-sky-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {renderContent()}
    </div>
  );
}
