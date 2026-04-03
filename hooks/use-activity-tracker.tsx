"use client"

import { useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { updateStudentActivity } from "@/server/activity-actions"

/**
 * 💓 Client-side hook to heartbeat student activity every 60 seconds
 * and on every navigation change.
 */
export function useActivityTracker(currentActivity?: string) {
  const pathname = usePathname()

  const heartbeat = useCallback(async (label?: string) => {
    try {
      // Small optimization: Only update if window is focused
      if (typeof window !== "undefined" && !document.hidden) {
        await updateStudentActivity(pathname, label || currentActivity || `Viewing ${pathname}`)
      }
    } catch (e) {
      // Fail silently, it's just a heartbeat
    }
  }, [pathname, currentActivity])

  useEffect(() => {
    // Initial heartbeat on mount and navigation
    heartbeat()

    // Setup periodic heartbeat (Every 60 seconds)
    const interval = setInterval(() => {
      heartbeat()
    }, 60000)

    return () => clearInterval(interval)
  }, [heartbeat])
}

/**
 * Helper component to easily drop the tracker into a layout
 */
export function ActivityTracker({ label }: { label?: string }) {
  useActivityTracker(label)
  return null
}
