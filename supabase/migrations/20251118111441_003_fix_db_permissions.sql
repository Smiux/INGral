/*
  # Fix Database Permissions and Create Test Verification Table
  
  1. Create test verification table for connection testing
  2. Adjust RLS policies to fix permission issues
  3. Add utility functions for database testing
*/

-- Create test_verification table if not exists
CREATE TABLE IF NOT EXISTS test_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_data text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on test_verification table
ALTER TABLE test_verification ENABLE ROW LEVEL SECURITY;

-- Create policies for test_verification table
CREATE POLICY "Public can read test verification data" 
  ON test_verification FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create test verification data" 
  ON test_verification FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add missing columns to articles table based on code requirements
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS allow_contributions boolean DEFAULT false;

-- Update RLS policies for articles table to account for new columns
DROP POLICY IF EXISTS "Users can update own articles" ON articles;

CREATE POLICY "Users can update own articles" 
  ON articles FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Add select permission for authenticated role on articles table (explicit)
GRANT SELECT ON TABLE articles TO authenticated;
GRANT INSERT ON TABLE articles TO authenticated;
GRANT UPDATE ON TABLE articles TO authenticated;
GRANT DELETE ON TABLE articles TO authenticated;

-- Add select permission for public role on articles table (explicit)
GRANT SELECT ON TABLE articles TO public;

-- Add select permission for authenticated role on article_links table
GRANT SELECT ON TABLE article_links TO authenticated;
GRANT INSERT ON TABLE article_links TO authenticated;
GRANT DELETE ON TABLE article_links TO authenticated;

-- Add select permission for public role on article_links table
GRANT SELECT ON TABLE article_links TO public;

-- Add select permission for authenticated role on user_graphs table
GRANT SELECT ON TABLE user_graphs TO authenticated;
GRANT INSERT ON TABLE user_graphs TO authenticated;
GRANT UPDATE ON TABLE user_graphs TO authenticated;
GRANT DELETE ON TABLE user_graphs TO authenticated;

-- Create a function to test database connection and permissions
CREATE OR REPLACE FUNCTION public.test_database_connection()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Test read access
  PERFORM id FROM articles LIMIT 1;
  
  -- Test if we can insert into test_verification (requires authentication)
  BEGIN
    INSERT INTO test_verification (test_data) VALUES ('Connection test successful')
    RETURNING jsonb_build_object('success', true, 'message', 'Insert successful') INTO result;
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object('success', false, 'message', 'Insert failed: ' || SQLERRM);
  END;
  
  RETURN jsonb_build_object(
    'read_access', true,
    'write_test', result,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION public.test_database_connection() TO public;

-- Insert initial test data into test_verification
INSERT INTO test_verification (test_data) 
VALUES ('Database initialization test') 
ON CONFLICT DO NOTHING;
