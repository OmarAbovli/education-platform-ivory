"use server"

import { sql } from "@/server/db"
import { randomUUID, randomBytes } from "crypto"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { getCurrentUser } from "@/lib/auth"
import { normalizeGoogleDriveUrl, isGoogleDriveUrl } from "@/lib/gdrive"
import { isYouTubeUrl, toYouTubeEmbed } from "@/lib/youtube"
import { isVimeoUrl, normalizeVimeoInput } from "@/lib/vimeo"
import { isBunnyUrl, normalizeBunnyInput, normalizeBunnyDirectPlayUrl, buildBunnyHlsUrl, isBunnyIframePage } from "@/lib/bunny"
import { createQrToken } from "@/server/qr-actions"
import { getBunnyConfig } from "@/server/bunny-actions"

export type StudentClassification = "center" | "online"

type UploadVideoInput = {
  title: string
  category: string
  description?: string
  grades: number[]
  videoUrl: string
  packageId: string
  isFree: boolean
  thumbnailUrl?: string
  sourceType: "gdrive" | "youtube" | "vimeo" | "bunny" | "bunny_id" | "bunny_upload"
  directPlayUrl?: string
  bunnyLibraryId?: string
  maxWatchCount?: number
  watchLimitEnabled?: boolean // تفعيل/تعطيل حد المشاهدات (افتراضي true)
}

type CreateStudentInput = {
  name: string
  phone: string
  guardianPhone: string
  grade: number
  classification: StudentClassification
  packageIds?: string[]
}

type BulkStudentInput = {
  names: string[]  // Array of student names
  phone: string    // Same phone for all
  guardianPhone: string // Same guardian phone for all
  grade: number
  classification: StudentClassification
  packageIds: string[]
}

type BulkStudentResult = {
  ok: true
  students: Array<{
    id: string
    name: string
    username: string
    password: string
    qrToken: string
  }>
} | {
  ok: false
  error: string
}

type UpdateTeacherSelfInput = {
  name?: string
  phone?: string
  bio?: string
  subject?: string
  avatarUrl?: string
  themePrimary?: string
  themeSecondary?: string
}

// Helpers
function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}
function randomUsernameStudent() {
  const token = base64Url(randomBytes(7))
  return ("st_" + token)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 14)
    .toLowerCase()
}
function randomPasswordStudent() {
  const token = base64Url(randomBytes(10))
  return token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 14)
}

async function requireTeacherId() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionId)
  if (!me || me.role !== "teacher") {
    throw new Error("Not authorized: teacher access required")
  }
  return me.id
}

// Auto-delete student accounts older than 14 months.
export async function cleanupExpiredStudents() {
  try {
    await sql`
      DELETE FROM users
      WHERE role = 'student'
        AND created_at < NOW() - INTERVAL '14 months';
    `
  } catch (e) {
    console.error("cleanupExpiredStudents error", e)
  }
}

function sanitizeBunnyVideoId(raw: string): string {
  return (raw || "")
    .trim()
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase()
}

async function verifyBunnyVideoExists(libraryId: string, videoId: string): Promise<boolean> {
  const apiKey = process.env.BUNNY_STREAM_API_KEY
  if (!apiKey) return true
  try {
    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      headers: {
        accept: "application/json",
        AccessKey: apiKey,
      },
      cache: "no-store",
    })
    return res.ok
  } catch {
    return true
  }
}

export async function uploadVideo(input: UploadVideoInput) {
  console.log("Server action: uploadVideo called with input:", JSON.stringify(input, null, 2))
  try {
    const teacherId = await requireTeacherId()
    console.log("Teacher ID authenticated:", teacherId)
    const id = "v_" + randomUUID()

    let normalizedUrl = (input.videoUrl ?? "").trim()

    // Handle "bunny_upload" same as "bunny_id" - it contains the ID
    if (input.sourceType === "bunny_id" || input.sourceType === "bunny_upload") {
      const videoId = sanitizeBunnyVideoId(normalizedUrl)

      // Use provided library ID or fallback to DB or env
      const config = await getBunnyConfig()
      const libraryId = input.bunnyLibraryId || config?.libraryId || process.env.BUNNY_STREAM_LIBRARY_ID

      if (!libraryId) {
        return { ok: false as const, error: "BUNNY_STREAM_LIBRARY_ID is not configured and no library ID provided." }
      }
      if (!videoId) {
        return { ok: false as const, error: "Please provide a valid Bunny Video ID." }
      }

      if (input.directPlayUrl?.trim() && !isBunnyIframePage(input.directPlayUrl)) {
        normalizedUrl = normalizeBunnyDirectPlayUrl(input.directPlayUrl)
      } else {
        // Construct the HLS Playlist URL (.m3u8) using the correct CDN hostname
        const cdnHostname = config?.cdnHostname ?? null
        normalizedUrl = buildBunnyHlsUrl(libraryId, videoId, cdnHostname)
      }
    } else {
      if (
        input.sourceType === "vimeo" ||
        isVimeoUrl(normalizedUrl) ||
        normalizedUrl.toLowerCase().includes("<iframe")
      ) {
        normalizedUrl = normalizeVimeoInput(normalizedUrl)
      } else if (input.sourceType === "youtube" || isYouTubeUrl(normalizedUrl)) {
        normalizedUrl = toYouTubeEmbed(normalizedUrl)
      } else if (input.sourceType === "gdrive" || isGoogleDriveUrl(normalizedUrl)) {
        normalizedUrl = normalizeGoogleDriveUrl(normalizedUrl)
      } else if (input.sourceType === "bunny" || isBunnyUrl(normalizedUrl)) {
        if (input.directPlayUrl?.trim()) {
          normalizedUrl = normalizeBunnyDirectPlayUrl(input.directPlayUrl)
        } else {
          normalizedUrl = normalizeBunnyInput(normalizedUrl)
        }
      }
    }

    await sql`
      INSERT INTO videos (
        id, teacher_id, title, description, grades, url, category, 
        is_free, package_id, thumbnail_url, max_watch_count, watch_limit_enabled
      )
      VALUES (
        ${id},
        ${teacherId},
        ${input.title},
        ${input.description ?? null},
        ${input.grades},
        ${normalizedUrl},
        ${input.category},
        ${input.isFree},
        ${input.packageId},
        ${input.thumbnailUrl ?? null},
        ${input.maxWatchCount ?? 3},
        ${input.watchLimitEnabled ?? true}
      );
    `

    // Notify subscribed students, but don't fail the request if this errors
    if (!input.isFree) {
      try {
        const studentRows = (await sql`
          SELECT student_id FROM teacher_subscriptions
          WHERE teacher_id = ${teacherId} AND status = 'active';
        `) as { student_id: string }[]

        if (studentRows.length > 0) {
          const message = `New video from your teacher: ${input.title}`
          const url = `/watch/${id}`

          for (const row of studentRows) {
            await sql`
              INSERT INTO notifications (id, user_id, message, url)
              VALUES (${'notif_' + randomUUID()}, ${row.student_id}, ${message}, ${url});
            `
          }
        }
      } catch (e) {
        console.error("Failed to create notifications for new video:", e)
      }
    }

    return { ok: true as const, videoId: id }
  } catch (e: any) {
    console.error("uploadVideo error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}



// ... imports

export async function getSnowSetting() {
  try {
    const rows = await sql`SELECT value_json FROM site_settings WHERE key = 'snow_enabled' LIMIT 1` as any[]
    return rows[0]?.value_json === true
  } catch (e) {
    console.error("getSnowSetting error", e)
    return true // Fallback
  }
}

export async function toggleSnowSetting(enabled: boolean) {
  try {
    await requireTeacherId()
    await sql`
      INSERT INTO site_settings (key, value_json, updated_at)
      VALUES ('snow_enabled', ${enabled}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET 
        value_json = EXCLUDED.value_json,
        updated_at = NOW();
    `
    revalidatePath("/")
    return { ok: true }
  } catch (e: any) {
    console.error("toggleSnowSetting error", e)
    return { ok: false, error: e?.message ?? "DB Error" }
  }
}

export async function createStudent(input: CreateStudentInput) {
  try {
    const teacherId = await requireTeacherId()
    await cleanupExpiredStudents()

    const id = "st_" + randomUUID()

    // Generate unique username with retries
    let attempts = 0
    let username = randomUsernameStudent()
    while (attempts < 7) {
      try {
        const taken = (await sql`SELECT 1 FROM users WHERE username = ${username} LIMIT 1;`) as any[]
        if (taken[0]) {
          attempts++
          username = randomUsernameStudent()
          continue
        }
        break
      } catch {
        break
      }
    }

    const password = randomPasswordStudent()
    const passwordHash = await bcrypt.hash(password, 10)

    await sql`
      INSERT INTO users (id, role, name, phone, guardian_phone, grade, username, password_hash, classification)
      VALUES (${id}, 'student', ${input.name}, ${input.phone}, ${input.guardianPhone}, ${input.grade}, ${username}, ${passwordHash}, ${input.classification});
    `

    const subId = "sub_" + randomUUID()
    await sql`
      INSERT INTO teacher_subscriptions (id, student_id, teacher_id, status)
      VALUES (${subId}, ${id}, ${teacherId}, 'active')
      ON CONFLICT DO NOTHING;
    `

    const packageIds = input.packageIds ?? []
    if (packageIds.length > 0) {
      for (const pkgId of packageIds) {
        await sql`
          INSERT INTO student_package_access (student_id, teacher_id, package_id, granted_at, granted_by)
          VALUES (${id}, ${teacherId}, ${pkgId}, NOW(), 'teacher-ui')
          ON CONFLICT (student_id, teacher_id, package_id) DO NOTHING;
        `
      }
    }

    return { ok: true as const, studentId: id, username, password }
  } catch (e: any) {
    console.error("createStudent error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

export async function createBulkStudents(input: BulkStudentInput): Promise<BulkStudentResult> {
  try {
    const teacherId = await requireTeacherId()
    await cleanupExpiredStudents()

    // Validation
    if (!input.names || input.names.length === 0) {
      return { ok: false, error: "No student names provided" }
    }
    if (input.names.length > 50) {
      return { ok: false, error: "Maximum 50 students per batch" }
    }
    if (!input.grade || ![1, 2, 3].includes(input.grade)) {
      return { ok: false, error: "Invalid grade" }
    }

    const students: Array<{
      id: string
      name: string
      username: string
      password: string
      qrToken: string
    }> = []

    // Create each student
    for (const name of input.names) {
      const trimmedName = name.trim()
      if (!trimmedName) continue // Skip empty names

      const id = "st_" + randomUUID()

      // Generate unique username
      let attempts = 0
      let username = randomUsernameStudent()
      while (attempts < 7) {
        try {
          const taken = (await sql`SELECT 1 FROM users WHERE username = ${username} LIMIT 1;`) as any[]
          if (taken[0]) {
            attempts++
            username = randomUsernameStudent()
            continue
          }
          break
        } catch {
          break
        }
      }

      const password = randomPasswordStudent()
      const passwordHash = await bcrypt.hash(password, 10)

      // Insert user
      await sql`
        INSERT INTO users (id, role, name, phone, guardian_phone, grade, username, password_hash, classification)
        VALUES (${id}, 'student', ${trimmedName}, ${input.phone}, ${input.guardianPhone}, ${input.grade}, ${username}, ${passwordHash}, ${input.classification});
      `

      // Create subscription
      const subId = "sub_" + randomUUID()
      await sql`
        INSERT INTO teacher_subscriptions (id, student_id, teacher_id, status)
        VALUES (${subId}, ${id}, ${teacherId}, 'active')
        ON CONFLICT DO NOTHING;
      `

      // Assign packages
      if (input.packageIds && input.packageIds.length > 0) {
        for (const pkgId of input.packageIds) {
          await sql`
            INSERT INTO student_package_access (student_id, teacher_id, package_id, granted_at, granted_by)
            VALUES (${id}, ${teacherId}, ${pkgId}, NOW(), 'bulk-create')
            ON CONFLICT (student_id, teacher_id, package_id) DO NOTHING;
          `
        }
      }

      // Generate QR token (permanent)
      const qrToken = randomUUID()
      await createQrToken({
        token: qrToken,
        userId: id,
        expiresInMinutes: 52560000, // ~100 years
        isPermanent: true,
        maxUses: 3 // Limit to 3 scans as per request
      })

      students.push({
        id,
        name: trimmedName,
        username,
        password,
        qrToken
      })
    }

    return { ok: true, students }
  } catch (e: any) {
    console.error("createBulkStudents error", e)
    return { ok: false, error: e?.message ?? "DB Error" }
  }
}


export async function updateStudentClassification(studentId: string, classification: StudentClassification) {
  try {
    const teacherId = await requireTeacherId()
    // Ensure teacher owns this student via subscription
    const [own] = (await sql`
      SELECT 1 FROM teacher_subscriptions
      WHERE student_id = ${studentId} AND teacher_id = ${teacherId} AND status = 'active'
      LIMIT 1;
    `) as any[]
    if (!own) return { ok: false as const, error: "Unauthorized" }

    await sql`
      UPDATE users SET classification = ${classification}
      WHERE id = ${studentId} AND role = 'student';
    `
    return { ok: true as const }
  } catch (e: any) {
    console.error("updateStudentClassification error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

export async function getStudentMonths(studentId: string) {
  try {
    const teacherId = await requireTeacherId()
    const rows = (await sql`
      SELECT allowed_months FROM student_month_access
      WHERE student_id = ${studentId} AND teacher_id = ${teacherId}
      LIMIT 1;
    `) as any[]
    return rows[0]?.allowed_months ?? []
  } catch {
    return []
  }
}

export async function updateStudentMonths(studentId: string, months: number[]) {
  try {
    const teacherId = await requireTeacherId()
    await sql`
      INSERT INTO student_month_access (student_id, teacher_id, allowed_months)
      VALUES (${studentId}, ${teacherId}, ${months})
      ON CONFLICT (student_id, teacher_id) DO UPDATE SET allowed_months = EXCLUDED.allowed_months;
    `
    return true
  } catch (e) {
    console.error("updateStudentMonths error", e)
    return false
  }
}

export async function getStudentPackages(studentId: string) {
  try {
    const teacherId = await requireTeacherId()
    const rows = (await sql`
      SELECT package_id
      FROM student_package_access
      WHERE student_id = ${studentId} AND teacher_id = ${teacherId};
    `) as { package_id: string }[]
    return rows.map((r) => r.package_id)
  } catch {
    return []
  }
}

export async function updateStudentPackages(studentId: string, packageIds: string[]) {
  try {
    const teacherId = await requireTeacherId()
    await sql`
      DELETE FROM student_package_access
      WHERE student_id = ${studentId} AND teacher_id = ${teacherId};
    `

    if (packageIds.length > 0) {
      for (const pkgId of packageIds) {
        await sql`
          INSERT INTO student_package_access (student_id, teacher_id, package_id, granted_at, granted_by)
          VALUES (${studentId}, ${teacherId}, ${pkgId}, NOW(), 'teacher-ui')
          ON CONFLICT (student_id, teacher_id, package_id) DO NOTHING;
        `
      }
    }

    return true
  } catch (e) {
    console.error("updateStudentPackages error", e)
    return false
  }
}

export async function updateTeacherSelf(input: UpdateTeacherSelfInput) {
  try {
    const teacherId = await requireTeacherId()
    await sql`
      UPDATE users
      SET
        name = COALESCE(${input.name}, name),
        phone = COALESCE(${input.phone}, phone),
        bio = COALESCE(${input.bio}, bio),
        subject = COALESCE(${input.subject}, subject),
        avatar_url = COALESCE(${input.avatarUrl}, avatar_url),
        theme_primary = COALESCE(${input.themePrimary}, theme_primary),
        theme_secondary = COALESCE(${input.themeSecondary}, theme_secondary)
      WHERE id = ${teacherId} AND role = 'teacher';
    `
    return true
  } catch (e) {
    console.error("updateTeacherSelf error", e)
    return false
  }
}

export async function getMyStudents() {
  try {
    const teacherId = await requireTeacherId()
    await cleanupExpiredStudents()

    const rows = (await sql`
      SELECT
        u.id,
        u.name,
        u.username,
        u.grade,
        u.phone,
        u.guardian_phone,
        u.classification,
        COALESCE(ARRAY_AGG(spa.package_id) FILTER (WHERE spa.package_id IS NOT NULL), '{}') AS package_ids
      FROM teacher_subscriptions ts
      JOIN users u ON u.id = ts.student_id
      LEFT JOIN student_package_access spa
        ON spa.student_id = ts.student_id AND spa.teacher_id = ts.teacher_id
      WHERE ts.teacher_id = ${teacherId} AND ts.status = 'active'
      GROUP BY u.id, u.name, u.username, u.grade, u.phone, u.guardian_phone, u.classification
      ORDER BY u.created_at DESC;
    `) as any[]

    return rows as {
      id: string
      name: string | null
      username: string | null
      grade: number | null
      phone: string | null
      guardian_phone: string | null
      classification: StudentClassification
      package_ids: string[]
    }[]
  } catch (e) {
    console.error("getMyStudents error", e)
    return []
  }
}

// Dedicated page helpers
export async function getMyStudentsFiltered(params?: {
  classification?: "all" | StudentClassification
  q?: string
}) {
  try {
    const teacherId = await requireTeacherId()
    const classification = params?.classification ?? "all"
    const q = (params?.q ?? "").trim()
    const whereClauses: string[] = []
    if (classification !== "all") {
      whereClauses.push(`u.classification = '${classification}'`)
    }
    const rows = (await sql`
      SELECT
        u.id,
        u.name,
        u.username,
        u.grade,
        u.phone,
        u.guardian_phone,
        u.classification,
        COALESCE(ARRAY_AGG(spa.package_id) FILTER (WHERE spa.package_id IS NOT NULL), '{}') AS package_ids
      FROM teacher_subscriptions ts
      JOIN users u ON u.id = ts.student_id
      LEFT JOIN student_package_access spa
        ON spa.student_id = ts.student_id AND spa.teacher_id = ts.teacher_id
      WHERE ts.teacher_id = ${teacherId} AND ts.status = 'active'
      AND (u.classification = ${classification} OR ${classification} = 'all')
      AND (u.name ILIKE '%' || ${q} || '%' OR u.username ILIKE '%' || ${q} || '%')
      GROUP BY u.id, u.name, u.username, u.grade, u.phone, u.guardian_phone, u.classification
      ORDER BY u.created_at DESC;
    `) as any[]

    return rows as {
      id: string
      name: string | null
      username: string | null
      grade: number | null
      phone: string | null
      guardian_phone: string | null
      classification: StudentClassification
      package_ids: string[]
    }[]
  } catch (e) {
    console.error("getMyStudentsFiltered error", e)
    return []
  }
}

export async function updateStudentCredentials(studentId: string, username: string, newPassword?: string) {
  try {
    const teacherId = await requireTeacherId()
    const [own] = (await sql`
      SELECT 1 FROM teacher_subscriptions
      WHERE student_id = ${studentId} AND teacher_id = ${teacherId} AND status = 'active'
      LIMIT 1;
    `) as any[]
    if (!own) return { ok: false as const, error: "Unauthorized" }

    if (newPassword && newPassword.length > 0) {
      const hash = await bcrypt.hash(newPassword, 10)
      await sql`
        UPDATE users SET username = ${username}, password_hash = ${hash}
        WHERE id = ${studentId} AND role = 'student';
      `
    } else {
      await sql`
        UPDATE users SET username = ${username}
        WHERE id = ${studentId} AND role = 'student';
      `
    }
    return { ok: true as const }
  } catch (e: any) {
    if ((e as any)?.code === "23505") {
      return { ok: false as const, error: "Username already in use" }
    }
    console.error("updateStudentCredentials error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

export async function getMyVideos() {
  try {
    const teacherId = await requireTeacherId()
    const rows = (await sql`
      SELECT 
        v.id, v.title, v.description, v.url, v.category, v.is_free, v.package_id, v.grades, v.created_at, v.thumbnail_url,
        (SELECT COUNT(*) FROM video_watch_tracking vwt JOIN users u ON u.id = vwt.student_id WHERE vwt.video_id = v.id) as watchers_count
      FROM videos v
      WHERE v.teacher_id = ${teacherId}
      ORDER BY v.created_at DESC;
    `) as any[]
    return rows as {
      id: string
      title: string | null
      description: string | null
      url: string | null
      category: string | null
      is_free: boolean | null
      package_id: string | null
      grades: number[] | null
      created_at: string
      thumbnail_url: string | null
      watchers_count: number
    }[]
  } catch (e) {
    console.error("getMyVideos error", e)
    return []
  }
}

export async function updateVideo(
  videoId: string,
  updates: {
    title?: string
    description?: string
    url?: string
    grades?: number[]
    category?: string
    is_free?: boolean
    package_id?: string
    thumbnail_url?: string
  },
): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const teacherId = await requireTeacherId()
    let url = updates.url
    if (url) {
      if (isYouTubeUrl(url)) url = toYouTubeEmbed(url)
      else if (isGoogleDriveUrl(url)) url = normalizeGoogleDriveUrl(url)
      else if (isVimeoUrl(url)) url = normalizeVimeoInput(url)
      else if (isBunnyUrl(url)) url = normalizeBunnyInput(url)
    }
    const rows = (await sql`
      UPDATE videos
      SET
        title = COALESCE(${updates.title}, title),
        description = COALESCE(${updates.description}, description),
        url = COALESCE(${url}, url),
        grades = COALESCE(${updates.grades ? updates.grades : null}, grades),
        category = COALESCE(${updates.category}, category),
        is_free = COALESCE(${updates.is_free}, is_free),
        package_id = COALESCE(${updates.package_id}, package_id),
        thumbnail_url = COALESCE(${updates.thumbnail_url}, thumbnail_url)
      WHERE id = ${videoId} AND teacher_id = ${teacherId}
      RETURNING id;
    `) as any[]
    if (!rows[0]) return { ok: false, error: "Not found or unauthorized" }
    return { ok: true }
  } catch (e: any) {
    console.error("updateVideo error", e)
    return { ok: false, error: e?.message ?? "DB Error" }
  }
}

export async function deleteVideo(videoId: string): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const teacherId = await requireTeacherId()
    const rows = (await sql`
      DELETE FROM videos
      WHERE id = ${videoId} AND teacher_id = ${teacherId}
      RETURNING id;
    `) as any[]
    if (!rows[0]) {
      return { ok: false, error: "Not found or unauthorized" }
    }
    return { ok: true }
  } catch (e: any) {
    console.error("deleteVideo error", e)
    return { ok: false, error: e?.message ?? "DB Error" }
  }
}

export async function getVideoWithResources(videoId: string) {
  try {
    const teacherId = await requireTeacherId();
    const [video] = await sql`
      SELECT id, title, description, url, category, is_free, package_id, grades, thumbnail_url
      FROM videos
      WHERE id = ${videoId} AND teacher_id = ${teacherId};
    `;

    if (!video) {
      return null;
    }

    const resources = await sql`
      SELECT id, title, url, created_at
      FROM resources
      WHERE video_id = ${videoId}
      ORDER BY created_at DESC;
    `;

    return { ...video, resources };

  } catch (e) {
    console.error("getVideoWithResources error", e);
    return null;
  }
}

export async function bulkUpdateMonthsForClassification(
  months: number[],
  classification: "center" | "online",
): Promise<{ ok: true; updatedCount: number } | { ok: false; error?: string }> {
  try {
    const teacherId = await requireTeacherId()

    // Find all student IDs for this teacher with the specified classification
    const rows = (await sql`
      SELECT u.id
      FROM teacher_subscriptions ts
      JOIN users u ON u.id = ts.student_id
      WHERE ts.teacher_id = ${teacherId}
        AND ts.status = 'active'
        AND u.classification = ${classification};
    `) as { id: string }[]

    if (!rows || rows.length === 0) {
      return { ok: true, updatedCount: 0 }
    }

    // Upsert allowed months for each student for this teacher
    let updatedCount = 0
    for (const r of rows) {
      await sql`
        INSERT INTO student_month_access (student_id, teacher_id, allowed_months)
        VALUES (${r.id}, ${teacherId}, ${months})
        ON CONFLICT (student_id, teacher_id)
        DO UPDATE SET allowed_months = EXCLUDED.allowed_months;
      `
      updatedCount++
    }

    return { ok: true, updatedCount }
  } catch (e: any) {
    console.error("bulkUpdateMonthsForClassification error", e)
    return { ok: false, error: e?.message ?? "DB Error" }
  }
}

export async function updateStudentAll(params: {
  studentId: string
  name?: string
  phone?: string
  guardianPhone?: string
  grade?: number
  classification?: "center" | "online"
  username?: string
  newPassword?: string
  months?: number[]
}): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const teacherId = await requireTeacherId()

    // Ensure teacher owns this student via subscription
    const [own] = (await sql`
      SELECT 1 FROM teacher_subscriptions
      WHERE student_id = ${params.studentId} AND teacher_id = ${teacherId} AND status = 'active'
      LIMIT 1;
    `) as any[]
    if (!own) return { ok: false, error: "Unauthorized" }

    // Update core details and classification
    await sql`
      UPDATE users
      SET
        name = COALESCE(${params.name}, name),
        phone = COALESCE(${params.phone}, phone),
        guardian_phone = COALESCE(${params.guardianPhone}, guardian_phone),
        grade = COALESCE(${params.grade}, grade),
        classification = COALESCE(${params.classification}, classification)
      WHERE id = ${params.studentId} AND role = 'student';
    `

    // Update username/password if provided
    if (params.username || params.newPassword) {
      if (params.newPassword && params.newPassword.length > 0) {
        const hash = await bcrypt.hash(params.newPassword, 10)
        await sql`
          UPDATE users
          SET
            ${params.username ? sql`username = ${params.username},` : sql``}
            password_hash = ${hash}
          WHERE id = ${params.studentId} AND role = 'student';
        `
      } else if (params.username) {
        await sql`
          UPDATE users
          SET username = ${params.username}
          WHERE id = ${params.studentId} AND role = 'student';
        `
      }
    }

    // Update allowed months if provided
    if (params.months) {
      await sql`
        INSERT INTO student_month_access (student_id, teacher_id, allowed_months)
        VALUES (${params.studentId}, ${teacherId}, ${params.months})
        ON CONFLICT (student_id, teacher_id)
        DO UPDATE SET allowed_months = EXCLUDED.allowed_months;
      `
    }

    return { ok: true }
  } catch (e: any) {
    if (e?.code === "23505") {
      return { ok: false, error: "Username already in use" }
    }
    console.error("updateStudentAll error", e)
    return { ok: false, error: e?.message ?? "DB Error" }
  }
}

export async function getMyStudentsAdvanced(filters?: {
  grades?: number[]
  classifications?: ("center" | "online")[]
  q?: string
}) {
  const all = await getMyStudents()
  const grades = filters?.grades ?? []
  const classes = filters?.classifications ?? []
  const q = (filters?.q ?? "").trim().toLowerCase()

  return all.filter((s: any) => {
    const matchGrade = grades.length === 0 || (s.grade != null && grades.includes(Number(s.grade)))
    const cls = (s.classification ?? "center") as "center" | "online"
    const matchClass = classes.length === 0 || classes.includes(cls)
    const matchQ =
      !q ||
      [s.name, s.username, s.id, s.phone, s.guardian_phone]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q))
    return matchGrade && matchClass && matchQ
  })
}

export async function addExistingStudentToTeacher(params: {
  studentId: string
  classification?: "center" | "online"
  packageIds?: string[]
}): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const teacherId = await requireTeacherId()

    // 1) Ensure the student exists
    const studentRows = (await sql`
      SELECT id FROM users
      WHERE id = ${params.studentId} AND role = 'student'
      LIMIT 1;
    `) as { id: string }[]
    if (!studentRows?.[0]) {
      return { ok: false, error: "Student not found" }
    }

    // 2) Ensure a teacher_subscriptions link exists (active)
    const subId = "sub_" + randomUUID()
    await sql`
      INSERT INTO teacher_subscriptions (id, student_id, teacher_id, status)
      VALUES (${subId}, ${params.studentId}, ${teacherId}, 'active')
      ON CONFLICT DO NOTHING;
    `

    // 3) Optionally update the student's classification (global)
    if (params.classification) {
      await sql`
        UPDATE users
        SET classification = ${params.classification}
        WHERE id = ${params.studentId} AND role = 'student';
      `
    }

    // 4) Optionally set/overwrite package access for THIS teacher
    if (params.packageIds && params.packageIds.length > 0) {
      await updateStudentPackages(params.studentId, params.packageIds)
    }

    return { ok: true }
  } catch (e: any) {
    console.error("addExistingStudentToTeacher error", e)
    return { ok: false, error: e?.message ?? "DB Error" }
  }
}
