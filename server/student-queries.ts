'use server'

import { sql } from '@/server/db'

type PackageAccessInfo = {
  accessiblePackageIds: Set<string>
  teachersWithAccessiblePackages: Set<string>
  teachersWithPackages: Set<string>
}

async function getPackageAccessInfo(userId: string, teacherIds: string[]): Promise<PackageAccessInfo> {
  const accessiblePackageIds = new Set<string>()
  const teachersWithAccessiblePackages = new Set<string>()
  const teachersWithPackages = new Set<string>()

  if (teacherIds.length === 0) {
    return { accessiblePackageIds, teachersWithAccessiblePackages, teachersWithPackages }
  }

  const packages = (await sql`
    SELECT id, teacher_id, price
    FROM packages
    WHERE teacher_id = ANY(${teacherIds})
  `) as { id: string; teacher_id: string; price: number | null; grades: number[] | null }[]

  for (const pkg of packages) {
    teachersWithPackages.add(pkg.teacher_id)
    if ((pkg.price ?? 0) === 0) {
      accessiblePackageIds.add(pkg.id)
      teachersWithAccessiblePackages.add(pkg.teacher_id)
    }
  }

  const purchasedRows = (await sql`
    SELECT p.package_id, vp.teacher_id
    FROM purchases p
    JOIN packages vp ON vp.id = p.package_id
    WHERE p.user_id = ${userId} AND p.status = 'paid' AND vp.teacher_id = ANY(${teacherIds})
  `) as { package_id: string; teacher_id: string }[]

  for (const row of purchasedRows) {
    accessiblePackageIds.add(row.package_id)
    teachersWithAccessiblePackages.add(row.teacher_id)
  }

  const manualRows = (await sql`
    SELECT spa.package_id, spa.teacher_id
    FROM student_package_access spa
    WHERE spa.student_id = ${userId} AND spa.teacher_id = ANY(${teacherIds})
  `) as { package_id: string; teacher_id: string }[]

  for (const row of manualRows) {
    accessiblePackageIds.add(row.package_id)
    teachersWithAccessiblePackages.add(row.teacher_id)
  }

  return { accessiblePackageIds, teachersWithAccessiblePackages, teachersWithPackages }
}

// Videos accessible to a student: from subscribed teachers and either free OR month is unlocked.
export async function getAccessibleVideos(userId: string, { category }: { category?: string } = {}) {
  const [user] = (await sql`SELECT id, grade FROM users WHERE id = ${userId} LIMIT 1;`) as any[]
  if (!user) return []

  // Teachers the student is subscribed to (active)
  const teacherRows = (await sql`
    SELECT teacher_id FROM teacher_subscriptions
    WHERE student_id = ${userId} AND status = 'active'
  `) as any[]
  const teacherIds = teacherRows.map((r) => r.teacher_id)
  if (teacherIds.length === 0) return []

  const { accessiblePackageIds } = await getPackageAccessInfo(userId, teacherIds)

  // Dynamically add a WHERE clause for the category
  const categoryClause = category ? sql`AND category = ${category}` : sql``

  // Fetch videos for subscribed teachers, filtered by grade and optionally category
  const videos = (await sql`
    SELECT id, title, description, url, category, is_free, month, teacher_id, thumbnail_url, package_id
    FROM videos
    WHERE teacher_id = ANY(${teacherIds}) AND (${user.grade} = ANY(grades))
    ${categoryClause}
    ORDER BY created_at DESC
  `) as any[]

  // Filter paid videos by purchased or free packages
  const filtered = videos.filter((v) => {
    if (v.is_free) return true
    if (!v.package_id) return true
    return accessiblePackageIds.has(v.package_id)
  })

  return filtered
}

export async function getAccessibleVideoCategories(userId: string) {
  const [user] = (await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1;`) as any[]
  if (!user) return []

  const teacherRows = (await sql`
    SELECT teacher_id FROM teacher_subscriptions
    WHERE student_id = ${userId} AND status = 'active'
  `) as any[]
  const teacherIds = teacherRows.map((r) => r.teacher_id)
  if (teacherIds.length === 0) return []

  const { accessiblePackageIds } = await getPackageAccessInfo(userId, teacherIds)

  const rows = (await sql`
    SELECT DISTINCT category, is_free, package_id
    FROM videos
    WHERE teacher_id = ANY(${teacherIds}) AND category IS NOT NULL AND category != ''
  `) as { category: string; is_free: boolean; package_id: string | null }[]

  const categories = new Set<string>()
  for (const row of rows) {
    if (row.is_free || !row.package_id || accessiblePackageIds.has(row.package_id)) {
      categories.add(row.category)
    }
  }

  return Array.from(categories).sort()
}

export async function getUpcomingLiveSessions(userId: string) {
  const [user] = (await sql`SELECT id, grade FROM users WHERE id = ${userId} LIMIT 1;`) as any[]
  if (!user) return []

  const teacherRows = (await sql`
    SELECT teacher_id FROM teacher_subscriptions
    WHERE student_id = ${userId} AND status = 'active'
  `) as any[]
  const teacherIds = teacherRows.map((r) => r.teacher_id)
  if (teacherIds.length === 0) return []

  const { accessiblePackageIds, teachersWithAccessiblePackages, teachersWithPackages } = await getPackageAccessInfo(
    userId,
    teacherIds,
  )

  // Get all upcoming sessions for the subscribed teachers
  const sessions = (await sql`
    SELECT s.id, s.title, s.start_at, s.embed_url, s.grades, s.month, s.is_free, s.teacher_id, s.package_ids,
           u.name as teacher_name
    FROM live_sessions s
    JOIN users u ON u.id = s.teacher_id
    WHERE s.teacher_id = ANY(${teacherIds}) AND s.start_at > NOW()
    ORDER BY s.start_at ASC
  `) as any[]

  // Filter sessions based on access rights
  const filteredSessions = sessions.filter((session) => {
    const hasGradeRestriction = session.grades && session.grades.length > 0
    if (hasGradeRestriction && !session.grades.includes(user.grade)) {
      return false
    }

    if (session.is_free) {
      return true
    }

    const pkgIds: string[] | null = session.package_ids ?? null
    if (pkgIds && pkgIds.length > 0) {
      const hasRequiredPackage = pkgIds.some((pid) => accessiblePackageIds.has(pid))
      return hasRequiredPackage
    }

    const teacherHasPackages = teachersWithPackages.has(session.teacher_id)
    if (teacherHasPackages && !teachersWithAccessiblePackages.has(session.teacher_id)) {
      return false
    }

    return true
  })

  return filteredSessions
}

// Live NOW from teachers the student is subscribed to
export async function getActiveLiveStreams(userId: string) {
  const [user] = (await sql`SELECT id, grade FROM users WHERE id = ${userId} LIMIT 1;`) as any[]
  if (!user) return []

  const teacherRows = (await sql`
    SELECT teacher_id FROM teacher_subscriptions
    WHERE student_id = ${userId} AND status = 'active'
  `) as any[]
  const teacherIds = teacherRows.map((r) => r.teacher_id)
  if (teacherIds.length === 0) return []

  const { accessiblePackageIds, teachersWithAccessiblePackages, teachersWithPackages } = await getPackageAccessInfo(
    userId,
    teacherIds,
  )

  const rows = (await sql`
    SELECT tls.teacher_id,
           u.name AS teacher_name,
           COALESCE(tls.title, 'Live Session') AS title,
           tls.url,
           tls.grades,
           tls.package_ids
    FROM teacher_live_status tls
    JOIN users u ON u.id = tls.teacher_id
    WHERE tls.is_active = true AND tls.teacher_id = ANY(${teacherIds})
    ORDER BY tls.updated_at DESC;
  `) as any[]

  const filtered = rows.filter((row) => {
    const hasGradeRestriction = row.grades && row.grades.length > 0
    if (hasGradeRestriction && !row.grades.includes(user.grade)) {
      return false
    }

    const pkgIds: string[] | null = row.package_ids ?? null
    if (pkgIds && pkgIds.length > 0) {
      const hasRequiredPackage = pkgIds.some((pid) => accessiblePackageIds.has(pid))
      return hasRequiredPackage
    }

    const teacherHasPackages = teachersWithPackages.has(row.teacher_id)
    if (teacherHasPackages && !teachersWithAccessiblePackages.has(row.teacher_id)) {
      return false
    }

    return true
  })

  return filtered.map((row) => ({
    teacher_id: row.teacher_id as string,
    teacher_name: row.teacher_name as string,
    title: row.title as string,
    url: row.url as string | null,
  }))
}

// ... (rest of the code remains the same)

export async function checkVideoAccess(
  videoId: string,
  userId: string,
): Promise<{ allowed: boolean; reason?: "not-found" | "grade-locked" | "subscription-required" | "package-locked" }> {
  const [video] = (await sql`
    SELECT id, teacher_id, is_free, package_id, grades
    FROM videos
    WHERE id = ${videoId}
    LIMIT 1;
  `) as any[]

  if (!video) return { allowed: false, reason: "not-found" }

  if (video.is_free) return { allowed: true }

  const [user] = (await sql`SELECT id, grade FROM users WHERE id = ${userId} LIMIT 1;`) as any[]
  if (!user) return { allowed: false, reason: "subscription-required" }

  if (video.grades && !video.grades.includes(user.grade)) {
    return { allowed: false, reason: "grade-locked" }
  }

  const [subscription] = (await sql`
    SELECT 1
    FROM teacher_subscriptions
    WHERE student_id = ${userId} AND teacher_id = ${video.teacher_id} AND status = 'active'
    LIMIT 1;
  `) as any[]

  if (!subscription) return { allowed: false, reason: "subscription-required" }

  if (!video.package_id) {
    return { allowed: false, reason: "package-locked" }
  }

  const { accessiblePackageIds } = await getPackageAccessInfo(userId, [video.teacher_id])

  if (accessiblePackageIds.has(video.package_id)) {
    return { allowed: true }
  }

  return { allowed: false, reason: "package-locked" }
}

export async function getStudentDashboardData(studentId: string, filters: { category?: string; includeWatchInfo?: boolean } = {}) {
  const [user] = (await sql`SELECT id, grade FROM users WHERE id = ${studentId} LIMIT 1;`) as any[]
  if (!user) return []

  // 1. Get all of the student's active teacher subscriptions
  const teacherRows = (await sql`
    SELECT t.id, t.name
    FROM teacher_subscriptions ts
    JOIN users t ON t.id = ts.teacher_id
    WHERE ts.student_id = ${studentId} AND ts.status = 'active'
  `) as { id: string; name: string }[]

  if (teacherRows.length === 0) return []
  const teacherIds = teacherRows.map((r) => r.id)
  const { accessiblePackageIds } = await getPackageAccessInfo(studentId, teacherIds)

  // 2. Get all packages from all subscribed teachers
  const allPackages = (await sql`
    SELECT id, name, description, price, thumbnail_url, teacher_id, grades
    FROM packages
    WHERE teacher_id = ANY(${teacherIds})
    AND (grades IS NULL OR array_length(grades, 1) IS NULL OR ${user.grade} = ANY(grades))
    ORDER BY created_at DESC
  `) as any[]

  // 3. Get all relevant videos from all subscribed teachers
  const categoryClause = filters.category ? sql`AND category = ${filters.category}` : sql``

  const videos = (await sql`
    SELECT id, title, description, url, category, is_free, package_id, teacher_id, thumbnail_url
    FROM videos
    WHERE teacher_id = ANY(${teacherIds}) AND (${user.grade} = ANY(grades))
    ${categoryClause}
    ORDER BY created_at DESC
  `) as any[]

  // 4. Group videos by package_id
  const videosByPackage = new Map<string, any[]>()
  for (const video of videos) {
    if (video.package_id) {
      if (!videosByPackage.has(video.package_id)) {
        videosByPackage.set(video.package_id, [])
      }
      videosByPackage.get(video.package_id)!.push(video)
    }
  }

  // 5. Build the final data structure, grouped by teacher
  const teacherDataMap = new Map<string, { teacherId: string; teacherName: string; packages: any[] }>()
  for (const teacher of teacherRows) {
    teacherDataMap.set(teacher.id, {
      teacherId: teacher.id,
      teacherName: teacher.name,
      packages: [],
    })
  }

  for (const pkg of allPackages) {
    const teacher = teacherDataMap.get(pkg.teacher_id)
    if (teacher) {
      const packageVideos = videosByPackage.get(pkg.id) ?? []
      // A package is accessible if it appears in the computed accessible set
      const isAccessible = accessiblePackageIds.has(pkg.id)

      teacher.packages.push({
        ...pkg,
        isAccessible,
        videos: packageVideos,
      })
    }
  }

  return Array.from(teacherDataMap.values())
}

/**
 * Get upcoming live exams for student
 */
export async function getUpcomingLiveExams(userId: string) {
  const [user] = (await sql`SELECT id, grade FROM users WHERE id = ${userId} LIMIT 1;`) as any[]
  if (!user) return []

  const now = new Date().toISOString()

  const exams = await sql`
    SELECT 
      e.id,
      e.title,
      e.description,
      e.duration_minutes,
      e.scheduled_at,
      e.ends_at,
      e.passing_score,
      u.name as teacher_name
    FROM live_exams e
    JOIN users u ON e.teacher_id = u.id
    WHERE e.grade = ${user.grade}
      AND e.scheduled_at > ${now}
    ORDER BY e.scheduled_at ASC
    LIMIT 10
  `

  return exams
}

/**
 * Get video quizzes accessible by student
 */
export async function getStudentQuizzes(userId: string) {
  const [user] = (await sql`SELECT id, grade FROM users WHERE id = ${userId} LIMIT 1;`) as any[]
  if (!user) return []

  // Get teacher subscriptions
  const teacherRows = (await sql`
    SELECT teacher_id FROM teacher_subscriptions
    WHERE student_id = ${userId} AND status = 'active'
  `) as any[]
  const teacherIds = teacherRows.map((r) => r.teacher_id)
  if (teacherIds.length === 0) return []

  // Get accessible packages
  const { accessiblePackageIds } = await getPackageAccessInfo(userId, teacherIds)

  // Get quizzes from accessible videos
  const quizzes = await sql`
    SELECT 
      q.id,
      q.title,
      q.video_id,
      q.description,
      q.time_limit_minutes,
      q.passing_score,
      q.max_attempts,
      v.title as video_title,
      v.package_id,
      u.name as teacher_name,
      (SELECT COUNT(*) FROM quiz_submissions WHERE quiz_id = q.id AND student_id = ${userId}) as attempt_count,
      (SELECT MAX(score) FROM quiz_submissions WHERE quiz_id = q.id AND student_id = ${userId}) as best_score
    FROM quizzes q
    JOIN videos v ON q.video_id = v.id
    JOIN users u ON v.teacher_id = u.id
    WHERE v.teacher_id = ANY(${teacherIds})
      AND (
        v.package_id IS NULL 
        OR v.package_id = ANY(${Array.from(accessiblePackageIds)})
      )
    ORDER BY q.created_at DESC
  `

  return quizzes
}