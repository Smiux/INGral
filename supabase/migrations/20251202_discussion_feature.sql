-- Create discussion feature tables

-- 1. Categories table
CREATE TABLE IF NOT EXISTS discussion_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Topics table
CREATE TABLE IF NOT EXISTS discussion_topics (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255),
  category_id INTEGER REFERENCES discussion_categories(id),
  reply_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Replies table
CREATE TABLE IF NOT EXISTS discussion_replies (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES discussion_topics(id),
  content TEXT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255),
  parent_id INTEGER REFERENCES discussion_replies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tags table
CREATE TABLE IF NOT EXISTS discussion_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Topic-tags relationship table
CREATE TABLE IF NOT EXISTS topic_tags (
  topic_id INTEGER REFERENCES discussion_topics(id),
  tag_id INTEGER REFERENCES discussion_tags(id),
  PRIMARY KEY (topic_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_topics_category ON discussion_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_replies_topic ON discussion_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON discussion_replies(parent_id);
CREATE INDEX IF NOT EXISTS idx_topic_tags_topic ON topic_tags(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_tags_tag ON topic_tags(tag_id);

-- Insert initial categories
INSERT INTO discussion_categories (name, slug, description) VALUES
('Academic', 'academic', 'Discussion about mathematical concepts, research, and academic topics'),
('Website', 'website', 'Feedback, suggestions, and questions about the website itself'),
('Casual', 'casual', 'General discussions and casual conversations about mathematics and related topics');

-- Create trigger to update topic updated_at when a reply is added
CREATE OR REPLACE FUNCTION update_topic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discussion_topics
  SET updated_at = NOW(),
      reply_count = reply_count + 1
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_topic_updated_at
AFTER INSERT ON discussion_replies
FOR EACH ROW
EXECUTE FUNCTION update_topic_updated_at();

-- Create trigger to increment tag usage count when a topic is tagged
CREATE OR REPLACE FUNCTION increment_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discussion_tags
  SET usage_count = usage_count + 1
  WHERE id = NEW.tag_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_tag_usage
AFTER INSERT ON topic_tags
FOR EACH ROW
EXECUTE FUNCTION increment_tag_usage();

-- Create trigger to decrement tag usage count when a topic is untagged
CREATE OR REPLACE FUNCTION decrement_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discussion_tags
  SET usage_count = GREATEST(0, usage_count - 1)
  WHERE id = OLD.tag_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_tag_usage
AFTER DELETE ON topic_tags
FOR EACH ROW
EXECUTE FUNCTION decrement_tag_usage();
