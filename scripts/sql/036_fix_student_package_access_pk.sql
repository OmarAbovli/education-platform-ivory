-- Migration Script: Fix student_package_access PRIMARY KEY
-- This script updates the PRIMARY KEY constraint on the student_package_access table
-- to include teacher_id, fixing the student creation bug when packages are assigned.

BEGIN;

-- Step 1: Drop the old PRIMARY KEY constraint if it exists with only 2 columns
DO $$
BEGIN
    -- Check if the PRIMARY KEY exists with the old definition
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'student_package_access' 
        AND c.contype = 'p'
        AND array_length(c.conkey, 1) = 2
    ) THEN
        -- Drop the old constraint
        ALTER TABLE student_package_access DROP CONSTRAINT student_package_access_pkey;
        RAISE NOTICE 'Dropped old 2-column PRIMARY KEY constraint';
    ELSE
        RAISE NOTICE 'Old PRIMARY KEY constraint not found or already updated';
    END IF;
END $$;

-- Step 2: Add the new PRIMARY KEY with 3 columns
DO $$
BEGIN
    -- Only add if the PRIMARY KEY doesn't already exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'student_package_access' 
        AND c.contype = 'p'
    ) THEN
        ALTER TABLE student_package_access 
        ADD PRIMARY KEY (student_id, teacher_id, package_id);
        RAISE NOTICE 'Added new 3-column PRIMARY KEY constraint';
    ELSE
        RAISE NOTICE 'PRIMARY KEY already exists';
    END IF;
END $$;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete! Student creation with packages should now work correctly.';
END $$;
