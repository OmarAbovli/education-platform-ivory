import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Global3DBackground from "@/components/global-3d-background"
import BackgroundCompat from "@/components/background-compat"
import { getCurrentUser } from "@/lib/auth"
import { AuthProvider } from "@/lib/auth-provider"
import { FloatingChat } from "@/components/messaging/floating-chat"
import { cookies } from "next/headers"
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from "@/components/ui/toaster"
import { GlobalSnow } from "@/components/global-snow"
import { getSnowSetting } from "@/server/teacher-actions"

import { LastPageTracker } from "@/components/last-page-tracker";
import { ActivityTracker } from "@/hooks/use-activity-tracker";

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming for native feel
}

export const metadata: Metadata = {
  title: {
    default: "YourPlatform | لغة إنجليزية للثانوية العامة",
    template: "%s | YourPlatform",
  },
  description: "YourPlatform منصة تعليمية لتعلم اللغة الإنجليزية لطلاب الصف الأول والثاني والثالث الثانوي. دروس تفاعلية، شروحات فيديو شاملة، اختبارات دورية.",
  generator: "YourPlatform",
  applicationName: "YourPlatform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YourPlatform",
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  keywords: ["YourPlatform", "لغة إنجليزية", "ثانوية عامة", "دروس إنجليزية", "شروحات فيديو", "اختبارات إنجليزية", "تعليم أونلاين", "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"],
  authors: [{ name: "YourPlatform" }],
  creator: "YourPlatform",
  publisher: "YourPlatform",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "YourPlatform | لغة إنجليزية للثانوية العامة",
    description: "YourPlatform منصة تعليمية لتعلم اللغة الإنجليزية لطلاب الصف الأول والثاني والثالث الثانوي. دروس تفاعلية، شروحات فيديو شاملة، اختبارات دورية.",
    url: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/"),
    siteName: "YourPlatform",
    images: [
      {
        url: new URL("/online-illustration-class.png", process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/"),
        width: 1200,
        height: 630,
        alt: "YourPlatform",
      },
    ],
    locale: "ar_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YourPlatform | لغة إنجليزية للثانوية العامة",
    description: "YourPlatform منصة تعليمية لتعلم اللغة الإنجليزية لطلاب الصف الأول والثاني والثالث الثانوي. دروس تفاعلية، شروحات فيديو شاملة، اختبارات دورية.",
    creator: "@YourPlatformEdu", // Placeholder
    images: [new URL("/online-illustration-class.png", process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/")],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionId)
  const snowEnabled = await getSnowSetting().catch(() => false)

  return (
    <html lang="en" suppressHydrationWarning className="h-full" data-three-bg="on">
      <head>
        <meta name="google-site-verification" content="KiONYWDJQJlNbvmI2tvFRFnEMUuh6P6nQ4zBHynx9Nw" />
        <style>{`
/* Fonts */
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}

/* Ensure page background never hides the 3D canvas */
html, body { background: transparent !important; }

/* If any element still paints a solid viewport background, soften it a bit */
[data-three-bg="on"] .bg-background {
  background-color: transparent !important;
}
        `}</style>
      </head>
      <body className="min-h-screen text-foreground antialiased">
        <AuthProvider user={user}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <GlobalSnow enabled={snowEnabled} />
            {/* Keeps the 3D background visible; does not alter layout */}
            <Global3DBackground />
            {/* Runtime compatibility pass for late-loading full-screen solid backgrounds */}
            <BackgroundCompat />
            {/* App content above the background */}
            <div className="relative z-20">{children}</div>
            {/* 💓 Global Activity Pulse (Teacher Analytics) */}
            <ActivityTracker />
            {/* Conditionally render Floating Chat for students, now INSIDE the providers */}
            {user?.role === 'student' && <FloatingChat />}
          </ThemeProvider>
        </AuthProvider>
        <SpeedInsights />
        <Analytics />
        <LastPageTracker />
      </body>
    </html>
  )
}
