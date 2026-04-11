import { useState, useEffect, useCallback, useRef } from 'react';
import type { ArticleMetadataMaps } from '../types';

interface ArticleMetadata {
  title: string;
  summary: string;
  tags: string[];
  coverImage: string | null;
}

interface ArticleMetadataActions {
  setTitle: (title: string) => void;
  setSummary: (summary: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setCoverImage: (coverImage: string | null) => void;
  clearAll: () => void;
}

type ProviderWithSync = {
  synced?: boolean;
  on?: (event: string, handler: (isSynced: boolean) => void) => void;
  off?: (event: string, handler: (isSynced: boolean) => void) => void;
};

export function useArticleMetadata (
  metadata: ArticleMetadataMaps | null,
  provider: unknown,
  initialData?: Partial<ArticleMetadata>
): [ArticleMetadata, ArticleMetadataActions, boolean] {
  const [title, setTitleState] = useState(initialData?.title ?? '');
  const [summary, setSummaryState] = useState(initialData?.summary ?? '');
  const [tags, setTagsState] = useState<string[]>(initialData?.tags ?? []);
  const [coverImage, setCoverImageState] = useState<string | null>(initialData?.coverImage ?? null);
  const [isSynced, setIsSynced] = useState(false);

  const localChangeRef = useRef(false);
  const titleRef = useRef(title);
  const summaryRef = useRef(summary);
  const tagsRef = useRef(tags);
  const coverImageRef = useRef(coverImage);
  const isMountedRef = useRef(false);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  useEffect(() => {
    coverImageRef.current = coverImage;
  }, [coverImage]);

  useEffect(() => {
    if (!metadata) {
      queueMicrotask(() => {
        if (isMountedRef.current) {
          setIsSynced(false);
        }
      });
      return undefined;
    }

    isMountedRef.current = true;

    const metaTitle = metadata.title;
    const metaSummary = metadata.summary;
    const metaTags = metadata.tags;
    const metaCoverImage = metadata.coverImage;

    const syncFromRemote = () => {
      if (!isMountedRef.current) {
        return;
      }

      const remoteTitle = metaTitle.get('value');
      const remoteSummary = metaSummary.get('value');
      const remoteTags = metaTags.toArray();
      const remoteCoverImage = metaCoverImage.get('value');

      if (remoteTitle !== undefined && remoteTitle !== titleRef.current) {
        localChangeRef.current = true;
        setTitleState(remoteTitle);
      }

      if (remoteSummary !== undefined && remoteSummary !== summaryRef.current) {
        localChangeRef.current = true;
        setSummaryState(remoteSummary);
      }

      const remoteTagsStr = JSON.stringify(remoteTags);
      const localTagsStr = JSON.stringify(tagsRef.current);
      if (remoteTagsStr !== localTagsStr) {
        localChangeRef.current = true;
        setTagsState(remoteTags);
      }

      if (remoteCoverImage !== undefined && remoteCoverImage !== coverImageRef.current) {
        localChangeRef.current = true;
        setCoverImageState(remoteCoverImage);
      }
    };

    const titleObserver = () => {
      if (localChangeRef.current) {
        localChangeRef.current = false;
        return;
      }
      if (!isMountedRef.current) {
        return;
      }
      const remoteTitle = metaTitle.get('value');
      if (remoteTitle !== undefined && remoteTitle !== titleRef.current) {
        setTitleState(remoteTitle);
      }
    };

    const summaryObserver = () => {
      if (localChangeRef.current) {
        localChangeRef.current = false;
        return;
      }
      if (!isMountedRef.current) {
        return;
      }
      const remoteSummary = metaSummary.get('value');
      if (remoteSummary !== undefined && remoteSummary !== summaryRef.current) {
        setSummaryState(remoteSummary);
      }
    };

    const tagsObserver = () => {
      if (localChangeRef.current) {
        localChangeRef.current = false;
        return;
      }
      if (!isMountedRef.current) {
        return;
      }
      const remoteTags = metaTags.toArray();
      const remoteTagsStr = JSON.stringify(remoteTags);
      const localTagsStr = JSON.stringify(tagsRef.current);
      if (remoteTagsStr !== localTagsStr) {
        setTagsState(remoteTags);
      }
    };

    const coverImageObserver = () => {
      if (localChangeRef.current) {
        localChangeRef.current = false;
        return;
      }
      if (!isMountedRef.current) {
        return;
      }
      const remoteCoverImage = metaCoverImage.get('value');
      if (remoteCoverImage !== undefined && remoteCoverImage !== coverImageRef.current) {
        setCoverImageState(remoteCoverImage);
      }
    };

    metaTitle.observe(titleObserver);
    metaSummary.observe(summaryObserver);
    metaTags.observe(tagsObserver);
    metaCoverImage.observe(coverImageObserver);

    const typedProvider = provider as ProviderWithSync | null;
    let syncHandler: ((isSynced: boolean) => void) | null = null;

    const handleSync = (synced: boolean) => {
      if (!isMountedRef.current) {
        return;
      }
      if (synced) {
        syncFromRemote();
        setIsSynced(true);
      }
    };

    if (typedProvider && typeof typedProvider.synced === 'boolean') {
      if (typedProvider.synced) {
        syncFromRemote();
        queueMicrotask(() => {
          if (isMountedRef.current) {
            setIsSynced(true);
          }
        });
      }

      syncHandler = handleSync;
      if (typedProvider.on) {
        typedProvider.on('sync', syncHandler);
      }
    } else {
      syncFromRemote();
      queueMicrotask(() => {
        if (isMountedRef.current) {
          setIsSynced(true);
        }
      });
    }

    return () => {
      isMountedRef.current = false;
      metaTitle.unobserve(titleObserver);
      metaSummary.unobserve(summaryObserver);
      metaTags.unobserve(tagsObserver);
      metaCoverImage.unobserve(coverImageObserver);

      if (typedProvider && syncHandler && typedProvider.off) {
        typedProvider.off('sync', syncHandler);
      }

      queueMicrotask(() => {
        if (isMountedRef.current) {
          setIsSynced(false);
        }
      });
    };
  }, [metadata, provider]);

  const setTitle = useCallback((newTitle: string) => {
    setTitleState(newTitle);
    if (metadata?.title) {
      metadata.title.set('value', newTitle);
    }
  }, [metadata]);

  const setSummary = useCallback((newSummary: string) => {
    setSummaryState(newSummary);
    if (metadata?.summary) {
      metadata.summary.set('value', newSummary);
    }
  }, [metadata]);

  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tagsRef.current.includes(trimmedTag)) {
      return;
    }

    setTagsState(prev => {
      const newTags = [...prev, trimmedTag];
      if (metadata?.tags) {
        metadata.tags.push([trimmedTag]);
      }
      return newTags;
    });
  }, [metadata]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTagsState(prev => {
      const index = prev.indexOf(tagToRemove);
      if (index === -1) {
        return prev;
      }

      const newTags = prev.filter(tag => tag !== tagToRemove);

      if (metadata?.tags) {
        const remoteTags = metadata.tags.toArray();
        const remoteIndex = remoteTags.indexOf(tagToRemove);
        if (remoteIndex !== -1) {
          metadata.tags.delete(remoteIndex, 1);
        }
      }

      return newTags;
    });
  }, [metadata]);

  const setCoverImage = useCallback((newCoverImage: string | null) => {
    setCoverImageState(newCoverImage);
    if (metadata?.coverImage) {
      metadata.coverImage.set('value', newCoverImage);
    }
  }, [metadata]);

  const clearAll = useCallback(() => {
    setTitleState('');
    setSummaryState('');
    setTagsState([]);
    setCoverImageState(null);

    if (metadata) {
      if (metadata.title) {
        metadata.title.set('value', '');
      }
      if (metadata.summary) {
        metadata.summary.set('value', '');
      }
      if (metadata.tags) {
        metadata.tags.delete(0, metadata.tags.length);
      }
      if (metadata.coverImage) {
        metadata.coverImage.set('value', null);
      }
    }
  }, [metadata]);

  return [
    { title, summary, tags, coverImage },
    { setTitle, setSummary, addTag, removeTag, setCoverImage, clearAll },
    isSynced
  ];
}
