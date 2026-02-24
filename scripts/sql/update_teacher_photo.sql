-- Update Teacher Profile Photo
UPDATE users 
SET avatar_url = '/teatcher.jpg' 
WHERE role = 'teacher' AND id = 't_demo';
