/*
  # Create Wiki Database Schema
  
  1. New Tables
    - `articles`: Main wiki articles
      - `id` (uuid, primary key)
      - `title` (text, unique)
      - `slug` (text, unique, for URLs)
      - `content` (text, stores markdown and LaTeX)
      - `author_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `view_count` (integer)
    
    - `article_links`: Connections between articles
      - `id` (uuid, primary key)
      - `source_id` (uuid, references articles)
      - `target_id` (uuid, references articles)
      - `relationship_type` (text, e.g., "related", "depends_on")
      - `created_at` (timestamp)
    
    - `tags`: Article tags/categories
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    
    - `article_tags`: Junction table for many-to-many
      - `article_id` (uuid, references articles)
      - `tag_id` (uuid, references tags)
  
  2. Security
    - Enable RLS on all tables
    - Public read access to articles and tags
    - Write access only to authenticated users
    - Users can only edit/delete their own articles
    - Support for future public/private article modes
  
  3. Indexes
    - Index on article slug for fast lookups
    - Index on article updated_at for recent articles
    - Index on article_links for graph queries
*/

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  content text DEFAULT '',
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  view_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS article_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  relationship_type text DEFAULT 'related',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_articles CHECK (source_id != target_id),
  CONSTRAINT unique_link UNIQUE (source_id, target_id)
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS article_tags (
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_updated_at ON articles(updated_at DESC);
CREATE INDEX idx_articles_author_id ON articles(author_id);
CREATE INDEX idx_article_links_source ON article_links(source_id);
CREATE INDEX idx_article_links_target ON article_links(target_id);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view articles"
  ON articles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create articles"
  ON articles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own articles"
  ON articles FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own articles"
  ON articles FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Anyone can view article links"
  ON article_links FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create links"
  ON article_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM articles WHERE id = source_id AND author_id = auth.uid())
  );

CREATE POLICY "Users can delete own links"
  ON article_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM articles WHERE id = source_id AND author_id = auth.uid())
  );

CREATE POLICY "Anyone can view tags"
  ON tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view article tags"
  ON article_tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create article tags"
  ON article_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM articles WHERE id = article_id AND author_id = auth.uid())
  );

CREATE POLICY "Users can delete own article tags"
  ON article_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM articles WHERE id = article_id AND author_id = auth.uid())
  );
