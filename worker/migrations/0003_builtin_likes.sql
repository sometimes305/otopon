CREATE TABLE builtin_likes (
  sound_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sound_id, user_id)
);

CREATE INDEX builtin_likes_user_created_idx ON builtin_likes(user_id, created_at DESC);
