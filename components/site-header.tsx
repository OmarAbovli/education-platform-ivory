import Link from "next/link"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import DarkModeToggle from "@/components/dark-mode-toggle"
import { LogoutButton } from "@/components/logout-button"
import NotificationBell from "@/components/notification-bell"
import { MobileNav } from "@/components/mobile-nav"

const SiteHeader = async () => {
  const cookieStore = await cookies()
  const user = await getCurrentUser(cookieStore.get("session_id")?.value)

  const getDashboardUrl = () => {
    if (!user) return "/"
    switch (user.role) {
      case "admin":
        return "/admin"
      case "teacher":
        return "/teacher"
      case "student":
        return "/student"
      default:
        return "/"
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <Link href={getDashboardUrl()} className="flex items-center gap-2">
          <img src="/icon.png" alt="Logo" className="h-8 w-8 object-contain" />
          <span className="text-sm font-semibold">YourPlatform</span>
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-4 sm:flex">
          {(!user || user.role !== 'student') && (
            <Link href="/about-us" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </Link>
          )}
          {user && (
            user.role === 'teacher' ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/teacher/community-chat?grade=1`}
                  className="text-sm px-2 py-1 rounded border text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Open community chat for grade 1`}
                >
                  Community Chat
                </Link>
              </div>
            ) : (
              <Link href="/community-chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Community Chat
              </Link>
            )
          )}
          {user && user.role === 'student' && (
            <>
              <Link href="/student/training" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Exams
              </Link>
              <Link
                href="/student/practice"
                className="text-sm px-3 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all shadow-sm"
              >
                🤖 مارس اللغة
              </Link>
              <Link href="/student/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Leaderboard
              </Link>
              <Link href="/student/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Profile
              </Link>
            </>
          )}
          <Link href="/photos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Photos
          </Link>
          {user ? (
            <Link href={getDashboardUrl()} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Mobile menu - visible only on small screens */}
          <MobileNav user={user} dashboardUrl={getDashboardUrl()} />

          {/* Desktop actions */}
          {user && user.role === 'student' && <NotificationBell />}
          <DarkModeToggle />
          {user && <LogoutButton className="hidden sm:inline-flex" />}
        </div>
      </nav>
    </header>
  )
}

export default SiteHeader
