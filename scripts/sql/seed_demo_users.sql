-- ========================================================
-- YOURPLATFORM SEED SCRIPT (DEMO USERS)
-- ========================================================

-- 1. Create Super Admin (if not exists)
-- Username: superadmin
-- Password: 321321
INSERT INTO users (id, role, name, email, username, password_hash)
VALUES ('ad_super', 'admin', 'Super Admin', 'admin@yourplatform.local', 'superadmin', '321321')
ON CONFLICT (id) DO UPDATE SET 
  password_hash = '321321',
  role = 'admin';

-- 2. Create Demo Teacher
-- Username: teacher
-- Password: teacher123
INSERT INTO users (
  id, 
  role, 
  name, 
  username, 
  password_hash, 
  subject, 
  bio, 
  avatar_url, 
  theme_primary, 
  theme_secondary
) VALUES (
  't_demo_teacher', 
  'teacher', 
  'Your Name', 
  'teacher', 
  '321321', 
  'English Language', 
  'Welcome to our platform! This is your teacher dashboard.', 
  '/diverse-teacher.png', 
  '#059669', 
  '#10b981'
) ON CONFLICT (id) DO UPDATE SET 
  username = 'teacher', 
  password_hash = '321321';

-- 3. Create Demo Student
-- Username: student
-- Password: student123
INSERT INTO users (
  id, 
  role, 
  name, 
  username, 
  password_hash, 
  grade
) VALUES (
  's_demo_student', 
  'student', 
  'Demo Student', 
  'student', 
  '321321', 
  3
) ON CONFLICT (id) DO UPDATE SET 
  username = 'student', 
  password_hash = '321321';

-- Success confirmation (for console output)
DO $$
BEGIN
    RAISE NOTICE '✅ Seed complete! You can now login with:';
    RAISE NOTICE 'Admin: superadmin / 321321';
    RAISE NOTICE 'Teacher: teacher / 321321';
    RAISE NOTICE 'Student: student / 321321';
END $$;
