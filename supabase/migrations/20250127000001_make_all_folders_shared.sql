-- Make all folders shared
UPDATE user_journey_folders
SET status = 'shared'
WHERE status = 'personal' OR status IS NULL;

