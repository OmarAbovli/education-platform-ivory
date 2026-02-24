'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getMyNotifications, markMyNotificationsAsRead, type Notification } from '@/server/notification-queries'
import { cn } from '@/lib/utils'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const fetchNotifications = async () => {
      const notifs = await getMyNotifications()
      setNotifications(notifs)
    }

    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)

    // Clean up interval on component unmount
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && unreadCount > 0) {
      startTransition(async () => {
        await markMyNotificationsAsRead()
        // Refresh notifications to show them as read
        const notifs = await getMyNotifications()
        setNotifications(notifs)
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <NotificationItem key={notif.id} notification={notif} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  const content = (
    <div
      className={cn(
        'grid grid-cols-[25px_1fr] items-start pb-4 last:pb-0',
        !notification.is_read && 'font-semibold'
      )}
    >
      <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
      <div className="grid gap-1">
        <p className="text-sm">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(notification.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  )

  if (notification.url) {
    return <Link href={notification.url}>{content}</Link>
  }

  return content
}