"use server"

import { sql } from "@/server/db"
import { randomBytes } from "crypto"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

// ====================================
// Types & Interfaces
// ====================================

export type PackageCode = {
    id: string
    code: string
    packageId: string
    packageName: string
    grade: number
    teacherId: string
    isUsed: boolean
    usedByStudentId?: string
    usedByStudentName?: string
    usedAt?: string
    createdAt: string
    expiresAt?: string
}

// ====================================
// Helper Functions
// ====================================

/**
 * Generate a unique package code in format: COMP-XXXX-XXXX-XXXX
 * Uses characters that avoid confusion (no O, 0, I, 1)
 */
function generateCodeString(): string {
    // Characters excluding O, 0, I, 1 to avoid confusion
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = "COMP-"

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
            const randomIndex = randomBytes(1)[0] % chars.length
            code += chars[randomIndex]
        }
        if (i < 2) code += "-"
    }

    return code
}

/**
 * Generate a unique code that doesn't exist in the database
 */
async function generateUniqueCode(): Promise<string> {
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
        const code = generateCodeString()

        // Check if code already exists
        const existing = await sql`
      SELECT id FROM package_codes WHERE code = ${code} LIMIT 1
    `

        if (existing.length === 0) {
            return code
        }

        attempts++
    }

    throw new Error("Failed to generate unique code after multiple attempts")
}

/**
 * Get current teacher ID from session
 */
async function requireTeacherId(): Promise<string> {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
        throw new Error("Unauthorized: Teacher access required")
    }

    return user.id
}

// ====================================
// Teacher Functions
// ====================================

/**
 * Generate multiple package codes for a specific package and grade
 */
export async function generatePackageCodes(params: {
    packageId: string
    grade: number
    count: number
    expiresInDays?: number
}): Promise<{
    success: boolean
    codes?: Array<{ id: string; code: string; packageId: string; grade: number }>
    error?: string
}> {
    try {
        const teacherId = await requireTeacherId()
        const { packageId, grade, count, expiresInDays } = params

        // Validate input
        if (count < 1 || count > 100) {
            return { success: false, error: "Count must be between 1 and 100" }
        }

        if (![1, 2, 3].includes(grade)) {
            return { success: false, error: "Grade must be 1, 2, or 3" }
        }

        // Verify package exists and belongs to teacher
        const packageCheck = await sql`
      SELECT id FROM packages 
      WHERE id = ${packageId} AND teacher_id = ${teacherId}
      LIMIT 1
    `

        if (packageCheck.length === 0) {
            return { success: false, error: "Package not found or access denied" }
        }

        // Calculate expiration date if specified
        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null

        // Generate codes
        const generatedCodes: Array<{ id: string; code: string; packageId: string; grade: number }> = []

        for (let i = 0; i < count; i++) {
            const code = await generateUniqueCode()

            const result = await sql`
        INSERT INTO package_codes (
          code, package_id, grade, teacher_id, expires_at
        )
        VALUES (
          ${code}, ${packageId}, ${grade}, ${teacherId}, ${expiresAt}
        )
        RETURNING id, code, package_id as "packageId", grade
      `

            generatedCodes.push(result[0] as any)
        }

        return { success: true, codes: generatedCodes }
    } catch (error: any) {
        console.error("Error generating package codes:", error)
        return { success: false, error: error.message || "Failed to generate codes" }
    }
}

/**
 * Get all codes created by the current teacher
 */
export async function getTeacherCodes(params?: {
    packageId?: string
    includeUsed?: boolean
}): Promise<{
    success: boolean
    codes?: PackageCode[]
    error?: string
}> {
    try {
        const teacherId = await requireTeacherId()
        const { packageId, includeUsed = true } = params || {}

        let query = sql`
      SELECT 
        pc.id,
        pc.code,
        pc.package_id as "packageId",
        p.name as "packageName",
        pc.grade,
        pc.teacher_id as "teacherId",
        pc.is_used as "isUsed",
        pc.used_by_student_id as "usedByStudentId",
        u.name as "usedByStudentName",
        pc.used_at as "usedAt",
        pc.created_at as "createdAt",
        pc.expires_at as "expiresAt"
      FROM package_codes pc
      JOIN packages p ON p.id = pc.package_id
      LEFT JOIN users u ON u.id = pc.used_by_student_id
      WHERE pc.teacher_id = ${teacherId}
    `

        // Add filters
        if (packageId) {
            query = sql`${query} AND pc.package_id = ${packageId}`
        }

        if (!includeUsed) {
            query = sql`${query} AND pc.is_used = FALSE`
        }

        query = sql`${query} ORDER BY pc.created_at DESC`

        const codes = (await query) as any[]

        return { success: true, codes }
    } catch (error: any) {
        console.error("Error fetching teacher codes:", error)
        return { success: false, error: error.message || "Failed to fetch codes" }
    }
}

/**
 * Get statistics about generated codes
 */
export async function getCodeStatistics(packageId?: string): Promise<{
    success: boolean
    stats?: {
        total: number
        used: number
        unused: number
        expired: number
        byPackage: Record<string, { packageName: string; total: number; used: number }>
    }
    error?: string
}> {
    try {
        const teacherId = await requireTeacherId()

        // Get overall stats
        const statsQuery = packageId
            ? sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_used THEN 1 ELSE 0 END) as used,
            SUM(CASE WHEN NOT is_used THEN 1 ELSE 0 END) as unused,
            SUM(CASE WHEN expires_at < NOW() AND NOT is_used THEN 1 ELSE 0 END) as expired
          FROM package_codes
          WHERE teacher_id = ${teacherId} AND package_id = ${packageId}
        `
            : sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_used THEN 1 ELSE 0 END) as used,
            SUM(CASE WHEN NOT is_used THEN 1 ELSE 0 END) as unused,
            SUM(CASE WHEN expires_at < NOW() AND NOT is_used THEN 1 ELSE 0 END) as expired
          FROM package_codes
          WHERE teacher_id = ${teacherId}
        `

        const stats = (await statsQuery)[0] as any

        // Get stats by package
        const byPackageQuery = packageId
            ? sql`
          SELECT 
            p.id,
            p.name as "packageName",
            COUNT(*) as total,
            SUM(CASE WHEN pc.is_used THEN 1 ELSE 0 END) as used
          FROM package_codes pc
          JOIN packages p ON p.id = pc.package_id
          WHERE pc.teacher_id = ${teacherId} AND pc.package_id = ${packageId}
          GROUP BY p.id, p.name
        `
            : sql`
          SELECT 
            p.id,
            p.name as "packageName",
            COUNT(*) as total,
            SUM(CASE WHEN pc.is_used THEN 1 ELSE 0 END) as used
          FROM package_codes pc
          JOIN packages p ON p.id = pc.package_id
          WHERE pc.teacher_id = ${teacherId}
          GROUP BY p.id, p.name
        `

        const byPackageData = (await byPackageQuery) as any[]

        const byPackage: Record<string, { packageName: string; total: number; used: number }> = {}
        byPackageData.forEach((row) => {
            byPackage[row.id] = {
                packageName: row.packageName,
                total: parseInt(row.total),
                used: parseInt(row.used),
            }
        })

        return {
            success: true,
            stats: {
                total: parseInt(stats.total) || 0,
                used: parseInt(stats.used) || 0,
                unused: parseInt(stats.unused) || 0,
                expired: parseInt(stats.expired) || 0,
                byPackage,
            },
        }
    } catch (error: any) {
        console.error("Error fetching code statistics:", error)
        return { success: false, error: error.message || "Failed to fetch statistics" }
    }
}

// ====================================
// Student Functions
// ====================================

/**
 * Redeem a package code to unlock a package
 */
export async function redeemPackageCode(code: string): Promise<{
    success: boolean
    packageId?: string
    packageName?: string
    error?: "INVALID_CODE" | "ALREADY_USED" | "WRONG_GRADE" | "ALREADY_HAVE_PACKAGE" | "EXPIRED" | string
}> {
    try {
        const cookieStore = await cookies()
        const sessionId = cookieStore.get("session_id")?.value
        const user = await getCurrentUser(sessionId)

        if (!user || user.role !== "student") {
            return { success: false, error: "Unauthorized: Student access required" }
        }

        const studentId = user.id
        const studentGrade = user.grade

        // Normalize code (uppercase, trim)
        const normalizedCode = code.trim().toUpperCase()

        // Get code details
        const codeResult = await sql`
      SELECT 
        pc.id,
        pc.code,
        pc.package_id as "packageId",
        p.name as "packageName",
        p.teacher_id as "teacherId",
        pc.grade,
        pc.is_used as "isUsed",
        pc.used_by_student_id as "usedByStudentId",
        pc.expires_at as "expiresAt"
      FROM package_codes pc
      JOIN packages p ON p.id = pc.package_id
      WHERE pc.code = ${normalizedCode}
      LIMIT 1
    `

        console.log("🔍 Code lookup result:", codeResult.length > 0 ? "Found" : "Not found")

        if (codeResult.length === 0) {
            return { success: false, error: "INVALID_CODE" }
        }

        const codeData = codeResult[0] as any
        console.log("📦 Code data:", {
            packageId: codeData.packageId,
            teacherId: codeData.teacherId,
            grade: codeData.grade,
            isUsed: codeData.isUsed,
            studentGrade
        })

        // Check if code is already used
        if (codeData.isUsed) {
            return { success: false, error: "ALREADY_USED" }
        }

        // Check if code is expired
        if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
            return { success: false, error: "EXPIRED" }
        }

        // Check if code is for the correct grade
        if (codeData.grade !== studentGrade) {
            return { success: false, error: "WRONG_GRADE" }
        }

        // Check if student already has this package (via purchase or code)
        const existingAccess = await sql`
      SELECT 1 FROM student_package_access
      WHERE student_id = ${studentId} AND package_id = ${codeData.packageId}
      LIMIT 1
            `

        if (existingAccess.length > 0) {
            return { success: false, error: "ALREADY_HAVE_PACKAGE" }
        }

        // All checks passed - redeem the code
        console.log("✅ All checks passed! Redeeming code...")

        // Mark code as used
        await sql`
          UPDATE package_codes
          SET is_used = TRUE,
            used_by_student_id = ${studentId},
        used_at = NOW()
          WHERE id = ${codeData.id}
        `

        console.log("✅ Code marked as used")

        // Add package access to student
        await sql`
          INSERT INTO student_package_access(student_id, package_id, teacher_id)
        VALUES(${studentId}, ${codeData.packageId}, ${codeData.teacherId})
          ON CONFLICT(student_id, teacher_id, package_id) DO NOTHING
            `

        console.log("✅ Package access granted!")

        return {
            success: true,
            packageId: codeData.packageId,
            packageName: codeData.packageName,
        }
    } catch (error: any) {
        console.error("❌ Error redeeming package code:", error)
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint
        })
        return { success: false, error: error.message || "Failed to redeem code" }
    }
}

/**
 * Validate a code without redeeming it
 */
export async function validateCode(code: string): Promise<{
    valid: boolean
    packageName?: string
    grade?: number
    reason?: string
}> {
    try {
        const cookieStore = await cookies()
        const sessionId = cookieStore.get("session_id")?.value
        const user = await getCurrentUser(sessionId)

        if (!user || user.role !== "student") {
            return { valid: false, reason: "Unauthorized" }
        }

        const studentGrade = user.grade
        const normalizedCode = code.trim().toUpperCase()

        const codeResult = await sql`
        SELECT
        pc.package_id as "packageId",
            p.name as "packageName",
            pc.grade,
            pc.is_used as "isUsed",
            pc.expires_at as "expiresAt"
      FROM package_codes pc
      JOIN packages p ON p.id = pc.package_id
      WHERE pc.code = ${normalizedCode}
      LIMIT 1
    `

        if (codeResult.length === 0) {
            return { valid: false, reason: "Code not found" }
        }

        const codeData = codeResult[0] as any

        if (codeData.isUsed) {
            return { valid: false, reason: "Code already used" }
        }

        if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
            return { valid: false, reason: "Code expired" }
        }

        if (codeData.grade !== studentGrade) {
            return {
                valid: false,
                reason: `Code is for grade ${codeData.grade}, you are in grade ${studentGrade} `,
            }
        }

        return {
            valid: true,
            packageName: codeData.packageName,
            grade: codeData.grade,
        }
    } catch (error: any) {
        console.error("Error validating code:", error)
        return { valid: false, reason: "Validation failed" }
    }
}
