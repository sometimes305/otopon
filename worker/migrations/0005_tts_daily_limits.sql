CREATE TABLE IF NOT EXISTS tts_daily_limits (
  day_started_at INTEGER PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0
);
