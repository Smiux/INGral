/*
  # Create Graph Database Schema

  1. New Tables
    - `user_graphs`: Store user-created knowledge graphs
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `nodes` (jsonb, stores graph nodes as JSON)
      - `links` (jsonb, stores graph links as JSON)
      - `is_template` (boolean, whether this is a template)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on the table
    - Users can only access their own graphs
    - Public read access for templates
*/

CREATE TABLE IF NOT EXISTS user_graphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  nodes jsonb DEFAULT '[]'::jsonb,
  links jsonb DEFAULT '[]'::jsonb,
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_user_graphs_user_id ON user_graphs(user_id);
CREATE INDEX idx_user_graphs_is_template ON user_graphs(is_template);
CREATE INDEX idx_user_graphs_created_at ON user_graphs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_graphs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own graphs
CREATE POLICY "Users can read own graphs" 
  ON user_graphs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can read public templates
CREATE POLICY "Users can read public templates" 
  ON user_graphs FOR SELECT
  TO authenticated
  USING (is_template = true);

-- Policy: Users can create graphs
CREATE POLICY "Users can create graphs" 
  ON user_graphs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own graphs
CREATE POLICY "Users can update own graphs" 
  ON user_graphs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own graphs
CREATE POLICY "Users can delete own graphs" 
  ON user_graphs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());