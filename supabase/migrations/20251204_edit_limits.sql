-- Add edit limit fields to articles table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS edit_count_24h INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS edit_count_7d INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_edit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_change_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_slow_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slow_mode_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_unstable BOOLEAN DEFAULT FALSE;

-- Add edit limit fields to user_graphs table
ALTER TABLE user_graphs
ADD COLUMN IF NOT EXISTS edit_count_24h INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS edit_count_7d INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_edit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_change_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_slow_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slow_mode_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_unstable BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_articles_edit_count_24h ON articles(edit_count_24h);
CREATE INDEX IF NOT EXISTS idx_articles_edit_count_7d ON articles(edit_count_7d);
CREATE INDEX IF NOT EXISTS idx_articles_last_edit_date ON articles(last_edit_date);
CREATE INDEX IF NOT EXISTS idx_user_graphs_edit_count_24h ON user_graphs(edit_count_24h);
CREATE INDEX IF NOT EXISTS idx_user_graphs_edit_count_7d ON user_graphs(edit_count_7d);
CREATE INDEX IF NOT EXISTS idx_user_graphs_last_edit_date ON user_graphs(last_edit_date);

-- Update existing records to have proper default values
UPDATE articles
SET last_edit_date = created_at
WHERE last_edit_date IS NULL;

UPDATE user_graphs
SET last_edit_date = created_at
WHERE last_edit_date IS NULL;
