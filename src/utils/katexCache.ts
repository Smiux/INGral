import katex from 'katex';

/**
 * KaTeXCache class for caching rendered KaTeX formulas
 * This improves performance by avoiding repeated rendering of the same formulas
 */
export class KaTeXCache {
  private cache: Map<string, { html: string; options: katex.KatexOptions }>;
  private maxSize: number;

  /**
   * Create a new KaTeXCache instance
   * @param maxSize Maximum number of formulas to cache (default: 1000)
   */
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Render a KaTeX formula, using cache if available
   * @param formula LaTeX formula string
   * @param options KaTeX options
   * @returns Rendered HTML string
   */
  render(formula: string, options: katex.KatexOptions = {}): string {
    // Create a cache key based on formula and options
    const cacheKey = this.createCacheKey(formula, options);

    // Check if formula is already in cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // Move to end of map to keep recently used formulas
        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, cached);
        return cached.html;
      }
    }

    // Render formula if not in cache
    try {
      const html = katex.renderToString(formula, options);
      
      // Add to cache
      this.addToCache(cacheKey, html, options);
      
      return html;
    } catch (error) {
      console.error('Error rendering KaTeX formula:', error);
      // Return a fallback if rendering fails
      return `<span class="text-red-500">Error rendering formula: ${formula}</span>`;
    }
  }

  /**
   * Create a cache key from formula and options
   * @param formula LaTeX formula string
   * @param options KaTeX options
   * @returns Cache key string
   */
  private createCacheKey(formula: string, options: katex.KatexOptions): string {
    // Include only relevant options in cache key
    const relevantOptions = {
      displayMode: options.displayMode,
      throwOnError: options.throwOnError,
      errorColor: options.errorColor,
      strict: options.strict,
      trust: options.trust,
    };
    
    return `${formula}__${JSON.stringify(relevantOptions)}`;
  }

  /**
   * Add a rendered formula to the cache
   * @param key Cache key
   * @param html Rendered HTML
   * @param options KaTeX options
   */
  private addToCache(key: string, html: string, options: katex.KatexOptions): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, { html, options });
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current cache size
   * @returns Number of formulas in cache
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Remove a specific formula from the cache
   * @param formula LaTeX formula string
   * @param options KaTeX options
   */
  remove(formula: string, options: katex.KatexOptions = {}): void {
    const cacheKey = this.createCacheKey(formula, options);
    this.cache.delete(cacheKey);
  }
}

// Create a singleton instance of KaTeXCache
export const katexCache = new KaTeXCache();
