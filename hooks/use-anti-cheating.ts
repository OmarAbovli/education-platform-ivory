"use client"

import { useEffect, useCallback, useRef } from "react"
import { recordViolation } from "@/server/student-exam-actions"

export type ViolationType = 
  | 'tab_switch' 
  | 'window_blur' 
  | 'context_menu' 
  | 'copy_paste' 
  | 'fullscreen_exit' 
  | 'developer_tools'
  | 'suspicious_activity'

export type AntiCheatingConfig = {
  attemptId: string
  onViolation?: (type: ViolationType, count: number) => void
  onKickOut?: () => void
  enabled?: boolean
}

/**
 * Anti-Cheating Detection Hook
 * Monitors student behavior during exam and reports violations
 */
export function useAntiCheating({
  attemptId,
  onViolation,
  onKickOut,
  enabled = true
}: AntiCheatingConfig) {
  const violationCountRef = useRef(0)
  const isRecordingRef = useRef(false)

  const handleViolation = useCallback(async (
    type: ViolationType, 
    details?: any
  ) => {
    if (!enabled || isRecordingRef.current) return

    isRecordingRef.current = true

    try {
      const result = await recordViolation(attemptId, type, details)
      
      if (result.success) {
        const count = result.violationCount || violationCountRef.current + 1
        violationCountRef.current = count

        onViolation?.(type, count)

        if (result.kickedOut) {
          onKickOut?.()
        }
      }
    } catch (error) {
      console.error("Failed to record violation:", error)
    } finally {
      isRecordingRef.current = false
    }
  }, [attemptId, enabled, onViolation, onKickOut])

  useEffect(() => {
    if (!enabled) return

    // Prevent tab switching / window blur
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('tab_switch', {
          timestamp: new Date().toISOString()
        })
      }
    }

    const handleWindowBlur = () => {
      handleViolation('window_blur', {
        timestamp: new Date().toISOString()
      })
    }

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      handleViolation('context_menu', {
        timestamp: new Date().toISOString(),
        x: e.clientX,
        y: e.clientY
      })
    }

    // Prevent copy/paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      handleViolation('copy_paste', {
        type: 'copy',
        timestamp: new Date().toISOString()
      })
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      handleViolation('copy_paste', {
        type: 'paste',
        timestamp: new Date().toISOString()
      })
    }

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault()
      handleViolation('copy_paste', {
        type: 'cut',
        timestamp: new Date().toISOString()
      })
    }

    // Prevent certain keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        e.preventDefault()
        handleViolation('developer_tools', {
          key: e.key,
          ctrl: e.ctrlKey,
          shift: e.shiftKey,
          meta: e.metaKey,
          timestamp: new Date().toISOString()
        })
      }

      // Alt+Tab
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault()
        handleViolation('tab_switch', {
          timestamp: new Date().toISOString()
        })
      }
    }

    // Monitor fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation('fullscreen_exit', {
          timestamp: new Date().toISOString()
        })
      }
    }

    // Detect devtools opening (by checking window size changes)
    let lastWidth = window.innerWidth
    let lastHeight = window.innerHeight
    const handleResize = () => {
      const widthDiff = Math.abs(window.innerWidth - lastWidth)
      const heightDiff = Math.abs(window.innerHeight - lastHeight)

      // If significant size change (likely devtools)
      if (widthDiff > 100 || heightDiff > 100) {
        handleViolation('developer_tools', {
          type: 'resize_detection',
          timestamp: new Date().toISOString()
        })
      }

      lastWidth = window.innerWidth
      lastHeight = window.innerHeight
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('cut', handleCut)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('resize', handleResize)

    // Prevent beforeunload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      handleViolation('suspicious_activity', {
        type: 'attempted_leave',
        timestamp: new Date().toISOString()
      })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, handleViolation])

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      return true
    } catch (error) {
      console.error("Failed to enter fullscreen:", error)
      return false
    }
  }, [])

  return {
    requestFullscreen,
    violationCount: violationCountRef.current
  }
}
