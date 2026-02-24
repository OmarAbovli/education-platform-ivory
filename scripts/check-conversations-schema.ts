import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function checkSchema() {
    console.log('🔍 Checking conversations table schema...\n')

    try {
        const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'conversations'
      ORDER BY ordinal_position
    `

        console.log('📋 Current columns:')
        console.table(columns)

    } catch (error: any) {
        console.error('❌ Error:', error.message)
    }
}

checkSchema()
