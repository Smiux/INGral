/*
  # Add User Profiles
  
  1. New Tables
    - `user_profiles`: Store user profile information
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique)
      - `bio` (text)
      - `avatar_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on user_profiles table
    - Users can read all profiles
    - Users can only update their own profile
  
  3. Indexes
    - Index on username for searches
  
  4. Important Notes
    - Profile is optional and created on demand
    - Username must be unique when set
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for username searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read user profiles
CREATE POLICY "Anyone can read user profiles"
  ON user_profiles FOR SELECT
  TO public
  USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();