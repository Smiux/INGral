export interface Comment {
  id: string;
  article_id: string;
  user_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  upvotes: number;
  downvotes: number;
  is_deleted: boolean;
  replies?: Comment[];
}

export interface CreateCommentData {
  article_id: string;
  content: string;
  parent_id?: string | null;
}

export interface UpdateCommentData {
  content: string;
}

export interface DeleteCommentData {
  is_deleted: boolean;
}
