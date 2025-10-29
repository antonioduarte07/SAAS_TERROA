-- Create backup_config table
CREATE TABLE IF NOT EXISTS backup_config (
  id BIGINT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('supabase', 's3')),
  bucket TEXT,
  region TEXT,
  access_key_id TEXT,
  secret_access_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS policies
ALTER TABLE backup_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON backup_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON backup_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON backup_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_backup_config_updated_at
  BEFORE UPDATE ON backup_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 