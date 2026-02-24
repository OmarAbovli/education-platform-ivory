"use server"

import { sql } from "@/server/db"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"

/**
 * Types of XP sources
 */
export type XPSource = 'video' | 'exam' | 'live' | 'streak' | 'manual'

/**
 * Award XP to a student
 */
export async function awardXP(params: {
    userId: string,
    amount: number,
    source: XPSource,
    sourceId?: string,
    description?: string
}) {
    const { userId, amount, source, sourceId, description } = params

    try {
        // 1. Log the XP gain
        await sql`
      INSERT INTO xp_logs (user_id, amount, source, source_id, description)
      VALUES (${userId}, ${amount}, ${source}, ${sourceId || null}, ${description || null})
    `

        // 2. Update the user's total XP
        // Level is updated automatically by the database trigger
        await sql`
      UPDATE users 
      SET xp = xp + ${amount},
          last_active_at = NOW()
      WHERE id = ${userId}
    `

        return { success: true }
    } catch (error) {
        console.error("Error awarding XP:", error)
        return { success: false, error }
    }
}

/**
 * Get the current student's XP and Level status
 */
export async function getStudentXPStatus(studentId?: string, grade?: number) {
    try {
        const cookieStore = await cookies()
        const sessionId = cookieStore.get("session_id")?.value
        const user = await getCurrentUser(sessionId)

        if (!user) return null
        const targetId = studentId || user.id

        // Update streak if it's the current user
        if (!studentId || studentId === user.id) {
            await updateStreak(user.id)
        }

        const [status] = await sql`
      SELECT xp, level, streak_count, last_active_at
      FROM users
      WHERE id = ${targetId}
      LIMIT 1
    ` as any[]

        if (!status) return null

        // Calculate XP needed for next level
        const currentLevel = status.level
        const nextLevelXP = Math.pow(currentLevel, 2) * 100
        const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100

        const progressInLevel = status.xp - currentLevelXP
        const totalXPInLevel = nextLevelXP - currentLevelXP
        const percentage = Math.min(100, Math.max(0, (progressInLevel / totalXPInLevel) * 100))

        const rank = await getStudentRank(targetId, grade)

        return {
            ...status,
            nextLevelXP,
            progressInLevel,
            totalXPInLevel,
            percentage,
            rank
        }
    } catch (error) {
        console.error("Error getting XP status:", error)
        return null
    }
}

/**
 * Get Leaderboard Data
 */
export async function getLeaderboard(params?: { grade?: number, limit?: number }) {
    try {
        const { grade, limit = 20 } = params || {}

        let rows: any[] = []
        if (grade) {
            rows = await sql`
                SELECT id, name, username, xp, level, grade, streak_count
                FROM users
                WHERE role = 'student' AND grade = ${grade}
                ORDER BY xp DESC
                LIMIT ${limit}
            ` as any[]
        } else {
            rows = await sql`
                SELECT id, name, username, xp, level, grade, streak_count
                FROM users
                WHERE role = 'student'
                ORDER BY xp DESC
                LIMIT ${limit}
            ` as any[]
        }

        return { success: true, leaderboard: rows }
    } catch (error) {
        console.error("Error fetching leaderboard:", error)
        return { success: false, error }
    }
}

/**
 * Get student rank
 */
export async function getStudentRank(studentId: string, grade?: number) {
    try {
        let result: any
        if (grade) {
            [result] = await sql`
                SELECT COUNT(*) + 1 as rank
                FROM users
                WHERE role = 'student' 
                AND grade = ${grade}
                AND xp > (SELECT xp FROM users WHERE id = ${studentId})
            ` as any[]
        } else {
            [result] = await sql`
                SELECT COUNT(*) + 1 as rank
                FROM users
                WHERE role = 'student' 
                AND xp > (SELECT xp FROM users WHERE id = ${studentId})
            ` as any[]
        }
        return parseInt(result.rank)
    } catch (e) {
        console.error("getStudentRank error", e)
        return null
    }
}

/**
 * Update daily streak
 */
async function updateStreak(userId: string) {
    try {
        const [user] = await sql`
            SELECT last_active_at, streak_count FROM users WHERE id = ${userId}
        ` as any[]

        if (!user) return

        const now = new Date()
        const lastActive = user.last_active_at ? new Date(user.last_active_at) : null

        if (!lastActive) {
            await sql`UPDATE users SET streak_count = 1, last_active_at = NOW() WHERE id = ${userId}`
            return
        }

        const isToday = lastActive.toDateString() === now.toDateString()
        if (isToday) return // Already active today

        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const isYesterday = lastActive.toDateString() === yesterday.toDateString()

        if (isYesterday) {
            // Increment streak
            await sql`
                UPDATE users 
                SET streak_count = streak_count + 1, 
                    last_active_at = NOW() 
                WHERE id = ${userId}
            `
            // Award XP for streak
            await awardXP({
                userId,
                amount: 20,
                source: 'streak',
                description: `Daily Streak! (${user.streak_count + 1} days)`
            })
        } else {
            // Reset streak
            await sql`
                UPDATE users 
                SET streak_count = 1, 
                    last_active_at = NOW() 
                WHERE id = ${userId}
            `
        }
    } catch (e) {
        console.error("Streak update error", e)
    }
}

/**
 * Award Badges based on achievements
 */
export async function checkAndAwardAchievements(studentId: string) {
    // Logic to check statistics and insert into student_achievements
    // This could be called periodically or after specific events
}
