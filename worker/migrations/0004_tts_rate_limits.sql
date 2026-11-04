CREATE TABLE IF NOT EXISTS tts_rate_limits (
  user_id TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  last_request_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tts_rate_limits_window
  ON tts_rate_limits(window_started_at);
