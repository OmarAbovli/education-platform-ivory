// إضافة العمود المفقود granted_by
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function addGrantedByColumn() {
    console.log('🔧 Adding missing granted_by column...\n')

    try {
        console.log('⚙️  Adding column...')
        await sql`
      ALTER TABLE student_package_access 
      ADD COLUMN IF NOT EXISTS granted_by TEXT
    `
        console.log('✅ Column added successfully!')

        console.log('\n🔍 Verifying...')
        const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'student_package_access'
      AND column_name = 'granted_by'
    `

        if (columns.length > 0) {
            console.log('✅ Column verified: granted_by exists!')
        } else {
            console.log('❌ Column not found!')
        }

        console.log('\n🎉 Migration complete!')

    } catch (error: any) {
        console.error('\n❌ Migration failed!')
        console.error('Error:', error.message)
        process.exit(1)
    }
}

addGrantedByColumn()
