export interface ArticleDraft {
  'id': string;
  'title': string;
  'content': string;
  'createdAt': string;
  'lastSaved': string;
}

const DRAFT_KEY_PREFIX = 'draft_anonymous_';

const isValidDraft = (draft: unknown): draft is ArticleDraft => {
  if (!draft || typeof draft !== 'object') {
    return false;
  }
  const d = draft as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    d.id.length > 0 &&
    typeof d.title === 'string' &&
    typeof d.content === 'string' &&
    typeof d.createdAt === 'string' &&
    typeof d.lastSaved === 'string' &&
    !isNaN(new Date(d.createdAt as string).getTime()) &&
    !isNaN(new Date(d.lastSaved as string).getTime())
  );
};

export const getAllDrafts = (): ArticleDraft[] => {
  const drafts: ArticleDraft[] = [];
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_KEY_PREFIX)) {
      keys.push(key);
    }
  }

  keys.forEach(key => {
    try {
      const draft = JSON.parse(localStorage.getItem(key) || '{}');
      if (isValidDraft(draft)) {
        drafts.push(draft);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  });

  return drafts.sort((a, b) =>
    new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
  );
};

export const saveDraft = (draft: ArticleDraft): boolean => {
  try {
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${draft.id}`, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
};

export const createDraft = (title: string = '', content: string = ''): ArticleDraft => {
  const now = new Date().toISOString();
  const draft: ArticleDraft = {
    'id': `draft_${Date.now()}_${Math.random().toString(36)
      .substring(2, 9)}`,
    title,
    content,
    'createdAt': now,
    'lastSaved': now
  };
  saveDraft(draft);
  return draft;
};

export const updateDraft = (draft: ArticleDraft): boolean => {
  return saveDraft({ ...draft, 'lastSaved': new Date().toISOString() });
};

export const deleteDraft = (draftId: string): boolean => {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${draftId}`);
    return true;
  } catch {
    return false;
  }
};

export const getDraftById = (draftId: string): ArticleDraft | null => {
  try {
    const draft = JSON.parse(localStorage.getItem(`${DRAFT_KEY_PREFIX}${draftId}`) || '{}');
    return isValidDraft(draft) ? draft : null;
  } catch {
    return null;
  }
};
