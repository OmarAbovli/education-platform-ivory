// فحص schema جدول student_package_access
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function checkSchema() {
    console.log('🔍 Checking student_package_access table schema...\n')

    try {
        const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'student_package_access'
      ORDER BY ordinal_position
    `

        console.log('📋 Current columns:')
        console.log('─'.repeat(80))
        columns.forEach((col: any) => {
            console.log(`   ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(30)} | ${col.is_nullable}`)
        })
        console.log('─'.repeat(80))

        console.log('\n📊 Expected columns:')
        console.log('   student_id          | text                           | NO')
        console.log('   package_id          | uuid                           | NO')
        console.log('   teacher_id          | text                           | NO')
        console.log('   granted_at          | timestamp with time zone       | YES')
        console.log('   granted_by          | text                           | YES')  // ← المفقود!

    } catch (error: any) {
        console.error('❌ Error:', error.message)
    }
}

checkSchema()
