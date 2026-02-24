// اختبار إنشاء طالب مع تعيين باكدج
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'crypto'

const sql = neon(process.env.DATABASE_URL!)

function base64Url(bytes: Uint8Array) {
    return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function randomUsernameStudent() {
    const token = base64Url(randomBytes(7))
    return ("st_" + token).replace(/[^a-zA-Z0-9]/g, "").slice(0, 14).toLowerCase()
}

function randomPasswordStudent() {
    const token = base64Url(randomBytes(10))
    return token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 14)
}

async function testCreateStudent() {
    console.log('🧪 Testing student creation with package assignment...\n')

    try {
        // Get a teacher ID and package ID
        console.log('📋 Getting teacher and package info...')
        const teachers = await sql`SELECT id FROM users WHERE role = 'teacher' LIMIT 1`
        if (teachers.length === 0) {
            console.log('❌ No teacher found. Please create a teacher first.')
            return
        }
        const teacherId = teachers[0].id
        console.log(`   Teacher ID: ${teacherId}`)

        const packages = await sql`SELECT id, name FROM packages WHERE teacher_id = ${teacherId} LIMIT 1`
        if (packages.length === 0) {
            console.log('❌ No package found for this teacher. Please create a package first.')
            return
        }
        const packageId = packages[0].id
        const packageName = packages[0].name
        console.log(`   Package ID: ${packageId}`)
        console.log(`   Package Name: ${packageName}`)

        // Create student
        console.log('\n👤 Creating student...')
        const studentId = "st_" + randomUUID()
        const username = randomUsernameStudent()
        const password = randomPasswordStudent()
        const passwordHash = await bcrypt.hash(password, 10)

        const name = `Test Student ${Date.now()}`
        const phone = "+201234567890"
        const guardianPhone = "+201234567891"
        const grade = 1
        const classification = "center"

        await sql`
      INSERT INTO users (id, role, name, phone, guardian_phone, grade, username, password_hash, classification)
      VALUES (${studentId}, 'student', ${name}, ${phone}, ${guardianPhone}, ${grade}, ${username}, ${passwordHash}, ${classification})
    `
        console.log(`   ✅ Student created: ${studentId}`)
        console.log(`   Username: ${username}`)
        console.log(`   Password: ${password}`)

        // Create subscription
        console.log('\n🔗 Creating teacher subscription...')
        const subId = "sub_" + randomUUID()
        await sql`
      INSERT INTO teacher_subscriptions (id, student_id, teacher_id, status)
      VALUES (${subId}, ${studentId}, ${teacherId}, 'active')
    `
        console.log('   ✅ Subscription created')

        // Assign package
        console.log('\n📦 Assigning package...')
        console.log(`   Inserting: student_id=${studentId}, teacher_id=${teacherId}, package_id=${packageId}`)

        const result = await sql`
      INSERT INTO student_package_access (student_id, teacher_id, package_id, granted_at, granted_by)
      VALUES (${studentId}, ${teacherId}, ${packageId}, NOW(), 'test-script')
      ON CONFLICT (student_id, teacher_id, package_id) DO NOTHING
      RETURNING *
    `

        if (result.length > 0) {
            console.log('   ✅ Package assigned successfully!')
            console.log('   Result:', result[0])
        } else {
            console.log('   ⚠️  ON CONFLICT triggered - package was already assigned or insert failed')
        }

        // Verify package assignment
        console.log('\n🔍 Verifying package assignment...')
        const verification = await sql`
      SELECT * FROM student_package_access 
      WHERE student_id = ${studentId} 
      AND teacher_id = ${teacherId} 
      AND package_id = ${packageId}
    `

        if (verification.length > 0) {
            console.log('   ✅ Package access verified!')
            console.log('   Data:', verification[0])
        } else {
            console.log('   ❌ Package access NOT found in database!')
        }

        console.log('\n🎉 Test completed!')
        console.log('\n📝 Summary:')
        console.log(`   Student ID: ${studentId}`)
        console.log(`   Username: ${username}`)
        console.log(`   Password: ${password}`)
        console.log(`   Package: ${packageName}`)

    } catch (error: any) {
        console.error('\n❌ Test failed!')
        console.error('Error:', error.message)
        if (error.detail) console.error('Detail:', error.detail)
        if (error.hint) console.error('Hint:', error.hint)
        if (error.code) console.error('Code:', error.code)
    }
}

testCreateStudent()
