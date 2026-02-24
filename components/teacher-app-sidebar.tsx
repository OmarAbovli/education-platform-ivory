"use client"

import type React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Gauge, Grid2X2, Radio, Upload, Users, QrCode, Settings, PencilRuler, Mail, ClipboardCheck, Image, Ticket, UserPlus, LogOut } from "lucide-react"
import { logout } from "@/server/auth-actions"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useToast } from "@/hooks/use-toast"

const items = [
  { title: "لوحة التحكم", href: "/teacher", icon: Gauge },
  { title: "الرسائل", href: "/teacher/messages", icon: Mail },
  { title: "بث مباشر", href: "/teacher/live", icon: Radio },
  { title: "فيديوهاتي", href: "/teacher/videos", icon: Grid2X2 },
  { title: "الباقات", href: "/teacher/packages", icon: Grid2X2 },
  { title: "أكواد الباقات", href: "/teacher/codes", icon: Ticket },
  { title: "الطلاب", href: "/teacher/students", icon: Users },
  { title: "كروت الطلاب", href: "/teacher/bulk-students", icon: UserPlus },
  { title: "الصور المنتظرة", href: "/teacher/photos/pending", icon: Image },
  { title: "تسجيل الدخول بـ QR", href: "/teacher/qr-login", icon: QrCode },
  { title: "الإعدادات", href: "/teacher/settings", icon: Settings },
  { title: "الاختبارات", href: "/teacher/quizzes", icon: PencilRuler },
  { title: "اختبارات لايف", href: "/teacher/exams", icon: ClipboardCheck },
]

interface TeacherAppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  unreadCount?: number
  pendingPhotosCount?: number
}

export function TeacherAppSidebar({ unreadCount = 0, pendingPhotosCount = 0, ...props }: TeacherAppSidebarProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  async function handleLogout() {
    startTransition(async () => {
      const res = await logout()
      if (res.ok) {
        toast({ title: "تم تسجيل الخروج" })
        router.push("/")
        router.refresh()
      }
    })
  }

  return (
    <Sidebar className="sticky top-0 h-screen" {...props}>
      <SidebarHeader>
        <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
          <span>Teacher Studio</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.href} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </div>
                      {item.title === "الرسائل" && unreadCount > 0 && (
                        <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>
                      )}
                      {item.title === "الصور المنتظرة" && pendingPhotosCount > 0 && (
                        <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-amber-500">{pendingPhotosCount}</Badge>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  disabled={isPending}
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50/10"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>تسجيل الخروج</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
