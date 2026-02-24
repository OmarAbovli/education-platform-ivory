// تشغيل migration لإصلاح PRIMARY KEY في student_package_access
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
    console.log('🔧 Starting migration: Fix student_package_access PRIMARY KEY...\n')

    try {
        console.log('⚙️  Step 1: Checking current PRIMARY KEY...')

        // Check if old PRIMARY KEY exists
        const checkPK = await sql`
      SELECT 
        array_length(c.conkey, 1) as key_column_count
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'student_package_access' 
      AND c.contype = 'p'
      LIMIT 1
    `

        const currentKeyCount = checkPK[0]?.key_column_count
        console.log(`   Current PRIMARY KEY has ${currentKeyCount || 0} columns`)

        if (currentKeyCount === 3) {
            console.log('✅ PRIMARY KEY is already correct (3 columns). No migration needed.')
            return
        }

        console.log('\n⚙️  Step 2: Dropping old 2-column PRIMARY KEY...')

        // Drop old PRIMARY KEY
        await sql`
      ALTER TABLE student_package_access 
      DROP CONSTRAINT IF EXISTS student_package_access_pkey
    `
        console.log('   ✅ Old PRIMARY KEY dropped')

        console.log('\n⚙️  Step 3: Adding new 3-column PRIMARY KEY...')

        // Add new PRIMARY KEY
        await sql`
      ALTER TABLE student_package_access 
      ADD PRIMARY KEY (student_id, teacher_id, package_id)
    `
        console.log('   ✅ New PRIMARY KEY added')

        console.log('\n📊 Verifying PRIMARY KEY constraint...')

        // Verify the PRIMARY KEY
        const result = await sql`
      SELECT 
        array_length(c.conkey, 1) as key_column_count
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'student_package_access' 
      AND c.contype = 'p'
      LIMIT 1
    `

        if (result[0]?.key_column_count === 3) {
            console.log('✅ PRIMARY KEY verified: Using 3 columns (student_id, teacher_id, package_id)')
            console.log('\n🎉 Migration completed successfully!')
            console.log('📝 You can now create students with packages.')
        } else {
            console.log('⚠️  Warning: PRIMARY KEY might not be correct')
            console.log(`   Expected 3 columns, found: ${result[0]?.key_column_count || 'unknown'}`)
        }

    } catch (error: any) {
        console.error('\n❌ Migration failed!')
        console.error('Error:', error.message)
        if (error.detail) console.error('Detail:', error.detail)
        if (error.hint) console.error('Hint:', error.hint)
        process.exit(1)
    }
}

runMigration()
