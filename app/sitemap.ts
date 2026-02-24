import { MetadataRoute } from "next";
import { sql } from "@/server/db";

interface User {
  id: string;
  updated_at: Date;
}

interface Video {
  id: string;
  updated_at: Date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app").replace(/\/$/, "");

  
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/about-us`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/teachers`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/quiz`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/photos`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  
  let teachers: User[] = [];
  try {
    teachers = (await sql`
      SELECT id, updated_at 
      FROM users 
      WHERE role = 'teacher'
    `) as User[];
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("❌ Sitemap teacher fetch error:", error);
  }

  const teacherPages: MetadataRoute.Sitemap = teachers.map((teacher) => ({
    url: `${baseUrl}/teachers/${teacher.id}`,
    lastModified: new Date(teacher.updated_at).toISOString(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  //  صفحات الفيديوهات (ديناميكية)
  let videos: Video[] = [];
  try {
    videos = (await sql`
      SELECT id, updated_at 
      FROM videos 
      WHERE is_free = TRUE OR is_public = TRUE
    `) as Video[];
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("❌ Sitemap video fetch error:", error);
  }

  const videoPages: MetadataRoute.Sitemap = videos.map((video) => ({
    url: `${baseUrl}/watch/${video.id}`,
    lastModified: new Date(video.updated_at).toISOString(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // ✅ دمج كل الصفحات
  return [...staticPages, ...teacherPages, ...videoPages];
}
