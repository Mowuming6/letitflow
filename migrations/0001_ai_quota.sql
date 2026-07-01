-- Create AI daily quota table
CREATE TABLE IF NOT EXISTS ai_quota (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(uid, day)
);
