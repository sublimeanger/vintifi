ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tour_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS milestones_shown text[] DEFAULT '{}';