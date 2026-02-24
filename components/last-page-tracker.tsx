"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function LastPageTracker() {
    const pathname = usePathname()

    useEffect(() => {
        // Only track "content" pages, avoid auth or system pages
        if (
            pathname &&
            !pathname.startsWith("/login") &&
            !pathname.startsWith("/api") &&
            !pathname.startsWith("/_next")
        ) {
            // Set a cookie that expires in 1 year
            document.cookie = `last_visited_path=${pathname}; path=/; max-age=31536000; SameSite=Lax`
        }
    }, [pathname])

    return null
}
