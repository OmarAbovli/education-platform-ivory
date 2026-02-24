import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app";

  return {
    rules: [
      // القاعدة العامة لكل المستخدمين
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/admin/",
          "/teacher/",
          "/student/",
          "/community-chat/",
          "/paymob/",
          "/qr-login/",
          "/access-denied/",
        ],
      },

      // أمثلة على قواعد لمحركات معينة لو حبيت تضيفها لاحقًا
      // { userAgent: "Googlebot-Image", allow: ["/photos/"], disallow: ["/private/"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
