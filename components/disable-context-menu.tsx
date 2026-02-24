"use client"

import { useEffect } from "react"

// Disables right-click context menu site-wide (best-effort; not inside cross-origin iframes)
export default function DisableContextMenu() {
  useEffect(() => {
    const onCtx = (e: MouseEvent) => e.preventDefault()
    document.addEventListener("contextmenu", onCtx)
    return () => document.removeEventListener("contextmenu", onCtx)
  }, [])
  return null
}
