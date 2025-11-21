/*
  # Add Community and Contribution Features
  
  1. New Columns
    - `visibility` (text): Article visibility setting ('public', 'community', 'private')
    - `allow_contributions` (boolean): Whether community can contribute
    - `contributors` (jsonb): Array of contributor information
    - `upvotes` (integer): Number of upvotes
    - `comment_count` (integer): Number of comments
  
  2. Security
    - Update RLS policies to respect visibility settings
    - Add policies for community contributions
  
  3. Important Notes
    - Maintains data integrity by using safe DDL operations
    - All changes are backward compatible
*/

-- Add new columns to articles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE articles ADD COLUMN visibility text DEFAULT 'public';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'allow_contributions'
  ) THEN
    ALTER TABLE articles ADD COLUMN allow_contributions boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'contributors'
  ) THEN
    ALTER TABLE articles ADD COLUMN contributors jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'upvotes'
  ) THEN
    ALTER TABLE articles ADD COLUMN upvotes integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'comment_count'
  ) THEN
    ALTER TABLE articles ADD COLUMN comment_count integer DEFAULT 0;
  END IF;
END $$;

-- Create index on visibility for faster filtering
CREATE INDEX IF NOT EXISTS idx_articles_visibility ON articles(visibility);

-- Update RLS policies to handle visibility settings
DROP POLICY IF EXISTS "Anyone can view articles" ON articles;

CREATE POLICY "Public can view public articles"
  ON articles FOR SELECT
  TO public
  USING (visibility = 'public');

CREATE POLICY "Authenticated users can view community articles"
  ON articles FOR SELECT
  TO authenticated
  USING (visibility IN ('public', 'community') OR author_id = auth.uid());

CREATE POLICY "Users can view own private articles"
  ON articles FOR SELECT
  TO authenticated
  USING (visibility = 'private' AND author_id = auth.uid());

-- Update policies for community contributions
DROP POLICY IF EXISTS "Users can update own articles" ON articles;

CREATE POLICY "Authors can update own articles"
  ON articles FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Community can contribute to open articles"
  ON articles FOR UPDATE
  TO authenticated
  USING (allow_contributions = true AND visibility IN ('public', 'community'))
  WITH CHECK (allow_contributions = true AND visibility IN ('public', 'community'));