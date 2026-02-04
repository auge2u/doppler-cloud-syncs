-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Record this migration
INSERT INTO migrations (name) VALUES ('002_users') ON CONFLICT DO NOTHING;
