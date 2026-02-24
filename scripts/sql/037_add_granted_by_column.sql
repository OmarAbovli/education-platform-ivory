-- إضافة عمود granted_by المفقود إلى جدول student_package_access
ALTER TABLE student_package_access 
ADD COLUMN IF NOT EXISTS granted_by TEXT;

-- إضافة comment للتوضيح
COMMENT ON COLUMN student_package_access.granted_by IS 'Source of the package grant: teacher-ui, code-redemption, etc.';
