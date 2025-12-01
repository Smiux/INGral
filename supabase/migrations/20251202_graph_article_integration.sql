-- Graph and Article Integration Tables
-- Adds structured graph storage and article-node mapping

-- 1. Graph Nodes Table
-- Stores individual graph nodes with their properties
CREATE TABLE IF NOT EXISTS graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid REFERENCES user_graphs(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text CHECK (type IN ('article', 'concept', 'resource')) DEFAULT 'concept',
  description text,
  content text,
  color text DEFAULT '#6B7280',
  size integer DEFAULT 20,
  x numeric DEFAULT 0,
  y numeric DEFAULT 0,
  z numeric DEFAULT 0,
  connections integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Graph Links Table
-- Stores connections between graph nodes
CREATE TABLE IF NOT EXISTS graph_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid REFERENCES user_graphs(id) ON DELETE CASCADE,
  source_id uuid REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_id uuid REFERENCES graph_nodes(id) ON DELETE CASCADE,
  type text DEFAULT 'related',
  label text,
  weight numeric DEFAULT 1.0,
  color text DEFAULT '#9CA3AF',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Article-Node Mapping Table
-- Maps graph nodes to articles for bidirectional navigation
CREATE TABLE IF NOT EXISTS article_node_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  node_id uuid REFERENCES graph_nodes(id) ON DELETE CASCADE,
  mapping_type text DEFAULT 'primary',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (article_id, node_id)
);

-- 4. Graph Categories Table
-- For organizing graphs into categories
CREATE TABLE IF NOT EXISTS graph_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#6B7280',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Graph-Category Mapping Table
-- Maps graphs to categories
CREATE TABLE IF NOT EXISTS graph_category_mappings (
  graph_id uuid REFERENCES user_graphs(id) ON DELETE CASCADE,
  category_id uuid REFERENCES graph_categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (graph_id, category_id)
);

-- 6. Add category_id column to user_graphs table
ALTER TABLE user_graphs 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES graph_categories(id) ON DELETE SET NULL;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_graph_nodes_graph_id ON graph_nodes(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_graph_links_graph_id ON graph_links(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_links_source_id ON graph_links(source_id);
CREATE INDEX IF NOT EXISTS idx_graph_links_target_id ON graph_links(target_id);
CREATE INDEX IF NOT EXISTS idx_article_node_mappings_article_id ON article_node_mappings(article_id);
CREATE INDEX IF NOT EXISTS idx_article_node_mappings_node_id ON article_node_mappings(node_id);
CREATE INDEX IF NOT EXISTS idx_graph_categories_name ON graph_categories(name);
CREATE INDEX IF NOT EXISTS idx_graph_category_mappings_graph_id ON graph_category_mappings(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_category_mappings_category_id ON graph_category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_user_graphs_category_id ON user_graphs(category_id);

-- 8. Triggers for updated_at
DROP TRIGGER IF EXISTS graph_nodes_set_updated_at ON graph_nodes;
CREATE TRIGGER graph_nodes_set_updated_at
BEFORE UPDATE ON graph_nodes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS graph_links_set_updated_at ON graph_links;
CREATE TRIGGER graph_links_set_updated_at
BEFORE UPDATE ON graph_links
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS graph_categories_set_updated_at ON graph_categories;
CREATE TRIGGER graph_categories_set_updated_at
BEFORE UPDATE ON graph_categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 9. Trigger to update connections count on nodes
CREATE OR REPLACE FUNCTION update_node_connections()
RETURNS TRIGGER AS $$
BEGIN
  -- Update source node connections
  UPDATE graph_nodes
  SET connections = (SELECT COUNT(*) FROM graph_links WHERE source_id = NEW.source_id OR target_id = NEW.source_id)
  WHERE id = NEW.source_id;
  
  -- Update target node connections
  UPDATE graph_nodes
  SET connections = (SELECT COUNT(*) FROM graph_links WHERE source_id = NEW.target_id OR target_id = NEW.target_id)
  WHERE id = NEW.target_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS graph_links_update_node_connections ON graph_links;
CREATE TRIGGER graph_links_update_node_connections
AFTER INSERT OR UPDATE OR DELETE ON graph_links
FOR EACH ROW
EXECUTE FUNCTION update_node_connections();

-- 10. RLS Policies
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_node_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_category_mappings ENABLE ROW LEVEL SECURITY;

-- Graph nodes RLS
DROP POLICY IF EXISTS "Allow public access to public graph nodes" ON graph_nodes;
CREATE POLICY "Allow public access to public graph nodes" ON graph_nodes
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_graphs 
    WHERE user_graphs.id = graph_nodes.graph_id 
    AND user_graphs.visibility = 'public'
  ));

-- Graph links RLS
DROP POLICY IF EXISTS "Allow public access to public graph links" ON graph_links;
CREATE POLICY "Allow public access to public graph links" ON graph_links
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_graphs 
    WHERE user_graphs.id = graph_links.graph_id 
    AND user_graphs.visibility = 'public'
  ));

-- Article-node mappings RLS
DROP POLICY IF EXISTS "Allow public access to article node mappings" ON article_node_mappings;
CREATE POLICY "Allow public access to article node mappings" ON article_node_mappings
  FOR SELECT
  USING (true);

-- Graph categories RLS
DROP POLICY IF EXISTS "Allow public access to graph categories" ON graph_categories;
CREATE POLICY "Allow public access to graph categories" ON graph_categories
  FOR SELECT
  USING (true);

-- Graph category mappings RLS
DROP POLICY IF EXISTS "Allow public access to graph category mappings" ON graph_category_mappings;
CREATE POLICY "Allow public access to graph category mappings" ON graph_category_mappings
  FOR SELECT
  USING (true);

-- 11. Initial graph categories
INSERT INTO graph_categories (name, description, color)
VALUES
  ('数学概念', '数学相关概念图谱', '#3B82F6'),
  ('物理模型', '物理相关模型图谱', '#EF4444'),
  ('化学结构', '化学相关结构图谱', '#10B981'),
  ('计算机科学', '计算机科学相关图谱', '#8B5CF6'),
  ('生物学', '生物学相关图谱', '#F59E0B'),
  ('通用知识', '通用知识图谱', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- 12. Update permissions
GRANT INSERT, UPDATE, DELETE ON graph_nodes, graph_links, article_node_mappings, graph_categories, graph_category_mappings TO public;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE ON TABLES TO public;
