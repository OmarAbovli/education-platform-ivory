"use server"

import { sql } from "@/server/db"

export async function getFeaturedTeachers() {
  return [
    {
      id: "t_demo",
      name: "Your Name",
      subject: "Your Subject",
      bio: "Making learning fun and easy.",
      avatar_url: "/diverse-teacher.png",
      phone: "+100000000",
    },
  ]
}

export async function getAllTeachers() {
  return [
    {
      id: "t_demo",
      name: "Your Name",
      subject: "Your Subject",
      bio: "Making learning fun and easy.",
      avatar_url: "/diverse-teacher.png",
      phone: "+100000000",
    },
  ]
}

export async function getFeaturedVideos() {
  try {
    const rows = (await sql`
      SELECT
        v.id, v.title, v.description, v.grades, v.category, v.is_free, v.month, v.thumbnail_url, v.url,
        u.id AS teacher_id, u.name AS teacher_name, u.avatar_url AS teacher_avatar_url, u.phone AS teacher_phone
      FROM videos v
      JOIN users u ON u.id = v.teacher_id
      ORDER BY v.created_at DESC
      LIMIT 6;
    `) as any[]
    return rows
  } catch {
    // On DB error, fall back to an empty list instead of demo data
    return []
  }
}

export async function getFreeVideos() {
  try {
    const rows = (await sql`
      SELECT
        v.id, v.title, v.description, v.category, v.month, v.thumbnail_url, v.url, v.is_free,
        u.id AS teacher_id, u.name AS teacher_name, u.avatar_url AS teacher_avatar_url, u.phone AS teacher_phone
      FROM videos v
      JOIN users u ON u.id = v.teacher_id
      WHERE v.is_free = true
      ORDER BY v.created_at DESC
      LIMIT 9;
    `) as any[]
    return rows
  } catch {
    // On DB error, return empty list (avoid exposing demo content)
    return []
  }
}

export async function getTeacherProfile(id: string) {
  return {
    teacher: {
      id: "t_demo",
      name: "Your Name",
      subject: "Your Subject",
      bio: "Making learning fun and easy.",
      avatar_url: "/diverse-teacher.png",
      phone: "+100000000",
      theme_primary: "#10b981",
      theme_secondary: "#14b8a6",
    },
    videos: [
      {
        id: "v_demo",
        title: "Introduction to English Grammar",
        description: "A comprehensive overview of English grammar.",
        category: "Grammar",
        is_free: true,
        month: 10,
        thumbnail_url: "/course-thumbnail.png",
      },
    ],
    packages: [],
  }
}

export async function getAllVideosForQuizForm() {
  try {
    const rows = (await sql`
      SELECT id, title FROM videos ORDER BY created_at DESC;
    `) as { id: string; title: string }[]
    return rows
  } catch (e) {
    console.error("Failed to fetch videos for quiz form:", e)
    return []
  }
}
