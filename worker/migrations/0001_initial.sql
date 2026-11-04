PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sounds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 30),
  color TEXT NOT NULL CHECK(color IN ('coral', 'mint', 'amber', 'blue', 'violet', 'pink')),
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 5242880),
  sha256 TEXT NOT NULL,
  uploader_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected', 'hidden')),
  like_count INTEGER NOT NULL DEFAULT 0 CHECK(like_count >= 0),
  report_count INTEGER NOT NULL DEFAULT 0 CHECK(report_count >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE TABLE likes (
  sound_id TEXT NOT NULL REFERENCES sounds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sound_id, user_id)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  sound_id TEXT NOT NULL REFERENCES sounds(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 200),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (sound_id, reporter_id)
);

CREATE INDEX sounds_status_created_idx ON sounds(status, created_at DESC);
CREATE INDEX sounds_uploader_created_idx ON sounds(uploader_id, created_at DESC);
CREATE INDEX likes_user_created_idx ON likes(user_id, created_at DESC);
CREATE INDEX reports_status_created_idx ON reports(status, created_at DESC);
