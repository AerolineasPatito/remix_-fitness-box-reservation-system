CREATE TABLE IF NOT EXISTS coach_highlights (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES profiles(id),
  FOREIGN KEY(updated_by) REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_coach_highlights_active_dates
  ON coach_highlights(is_active, start_at, end_at, sort_order);
