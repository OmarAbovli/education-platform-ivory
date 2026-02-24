-- ✅ إصلاح سريع: إضافة PRIMARY KEY لجدول student_package_access

-- إذا الجدول موجود بدون PRIMARY KEY، احذفه وأعد إنشاءه
DROP TABLE IF EXISTS student_package_access CASCADE;

-- إنشاء الجدول مع PRIMARY KEY
CREATE TABLE student_package_access (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by TEXT,
  PRIMARY KEY (student_id, teacher_id, package_id)  -- ← المفتاح الأساسي بثلاثة أعمدة!
);

-- Indexes
CREATE INDEX idx_student_package_access_student ON student_package_access(student_id);
CREATE INDEX idx_student_package_access_package ON student_package_access(package_id);
CREATE INDEX idx_student_package_access_teacher ON student_package_access(teacher_id);

-- ✅ خلاص! الآن ON CONFLICT هيشتغل
