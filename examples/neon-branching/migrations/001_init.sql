-- Initial schema setup
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT INTO migrations (name) VALUES ('001_init') ON CONFLICT DO NOTHING;
