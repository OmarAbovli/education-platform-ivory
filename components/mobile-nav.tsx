"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, MessageCircle, Camera, LayoutDashboard, LogIn, Info, FileText, Sparkles, UserCircle, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type MobileNavProps = {
  user: any
  dashboardUrl: string
}

export function MobileNav({ user, dashboardUrl }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  const navLinkClass = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent active:scale-95 transition-all"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:hidden px-0">
        <SheetHeader className="px-6 pb-4 border-b">
          <div className="flex items-center gap-3 justify-center">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-xs uppercase tracking-tighter">YP</div>
            <SheetTitle className="text-lg">YourPlatform</SheetTitle>
          </div>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1 px-3">
          {/* About Us - للجميع ماعدا الطلاب */}
          {(!user || user.role !== 'student') && (
            <Link
              href="/about-us"
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              <Info className="h-4 w-4 text-muted-foreground" />
              <span>عن المنصة</span>
            </Link>
          )}

          {/* Community Chat */}
          {user && (
            user.role === 'teacher' ? (
              <Link
                href="/teacher/community-chat?grade=1"
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                <span>المحادثة الجماعية</span>
              </Link>
            ) : (
              <Link
                href="/community-chat"
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                <span>المحادثة الجماعية</span>
              </Link>
            )
          )}

          {/* Exams - للطلاب فقط */}
          {user && user.role === 'student' && (
            <>
              <Link
                href="/student/training"
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                <FileText className="h-4 w-4 text-blue-500" />
                <span>الاختبارات</span>
              </Link>
              <Link
                href="/student/practice"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 active:scale-95 transition-all shadow-sm mx-3 my-1"
                onClick={() => setOpen(false)}
              >
                <Bot className="h-4 w-4" />
                <span>🤖 مارس اللغة مع AI</span>
              </Link>
              <Link
                href="/student/profile"
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                <UserCircle className="h-4 w-4 text-pink-500" />
                <span>الملف الشخصي</span>
              </Link>
            </>
          )}

          {/* Photos - للجميع */}
          <Link
            href="/photos"
            className={navLinkClass}
            onClick={() => setOpen(false)}
          >
            <Camera className="h-4 w-4 text-purple-500" />
            <span>الصور</span>
          </Link>

          {/* Dashboard or Login */}
          {user ? (
            <Link
              href={dashboardUrl}
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4 text-orange-500" />
              <span>لوحة التحكم</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              <LogIn className="h-4 w-4 text-muted-foreground" />
              <span>تسجيل الدخول</span>
            </Link>
          )}

          {/* Divider */}
          <div className="my-3 border-t mx-3" />

          {/* User Info */}
          {user && (
            <div className="px-6 py-3 bg-accent/50 rounded-lg mx-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name || 'User'} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-8 w-8 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role === 'student' ? 'طالب' : user.role === 'teacher' ? 'مدرس' : user.role}
                  </p>
                </div>
              </div>
              <LogoutButton className="w-full justify-center text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-950/30" />
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
