"use client"

import { useEffect } from "react"

/**
 * BackgroundCompat
 * - Detects full-screen opaque background layers (white/black) that cover the viewport.
 * - Makes them transparent so the 3D background remains visible.
 * - Does NOT remove elements; only overrides background color inline.
 * - Re-applies for a short period after mount to handle late-loading overlays.
 */
export default function BackgroundCompat() {
  useEffect(() => {
    const MARK = "data-bg-compat-patched"

    const isFullscreen = (el: Element) => {
      const node = el as HTMLElement
      const style = window.getComputedStyle(node)
      // Consider elements that are fixed/absolute and span the viewport.
      const positioned = style.position === "fixed" || style.position === "absolute"
      if (!positioned) return false

      // Prefer fast class heuristics
      const classes = node.classList
      const hasInset0 = classes.contains("inset-0")
      const likelyFullscreen =
        hasInset0 || (style.top === "0px" && style.left === "0px" && style.right === "0px" && style.bottom === "0px")

      if (!likelyFullscreen) return false

      // Has a non-transparent solid background (no gradient/image)
      const bgColor = style.backgroundColor
      if (bgColor === "transparent" || bgColor === "rgba(0, 0, 0, 0)") return false

      // Check alpha channel to avoid zapping semi-transparent overlays like play buttons (bg-black/50)
      // Format is usually rgb(r, g, b) or rgba(r, g, b, a)
      if (bgColor.startsWith("rgba(")) {
        const parts = bgColor.match(/[\d.]+/g)
        if (parts && parts.length >= 4) {
          const alpha = parseFloat(parts[3])
          // If it's already significantly transparent, leave it alone.
          if (alpha < 0.9) return false
        }
      }

      const hasSolidBg = style.backgroundImage === "none"
      return hasSolidBg
    }

    const neutralize = (el: Element) => {
      const node = el as HTMLElement
      if (node.hasAttribute(MARK)) return
      // ADDED: Skip if explicitly marked to preserve background
      if (node.hasAttribute("data-no-bg-compat")) return

      node.setAttribute(MARK, "true")
      // Preserve layout; just make the background transparent.
      node.style.backgroundColor = "transparent"
      // Tailwind may set opacity via CSS vars; neutralize common ones.
      node.style.setProperty("--tw-bg-opacity", "0", "important")
    }

    const scan = () => {
      const all = document.querySelectorAll("body *")
      for (const el of Array.from(all)) {
        try {
          if (isFullscreen(el)) neutralize(el)
        } catch {
          // ignore
        }
      }
    }

    // Neutralize the body itself, which is the most common culprit.
    neutralize(document.body)

    // Initial scan after hydration
    scan()

    // Observe late-loaded overlays for a short window
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of Array.from(m.addedNodes)) {
          if (n.nodeType === 1) {
            const el = n as Element
            if (isFullscreen(el)) neutralize(el)
            // Also scan children of the added subtree quickly
            el.querySelectorAll?.("*").forEach((child) => {
              if (isFullscreen(child)) neutralize(child)
            })
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // Stop observing after a bit to avoid overhead; most late overlays load quickly
    const stop = window.setTimeout(() => observer.disconnect(), 6000)

    return () => {
      observer.disconnect()
      window.clearTimeout(stop)
    }
  }, [])

  return null
}
