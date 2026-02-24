"use client"

import { useState, useEffect } from "react"

// A simple custom hook for the typewriter effect
function useTypewriter(text: string, speed: number = 50) {
  const [displayedText, setDisplayedText] = useState("")

  useEffect(() => {
    let i = 0
    setDisplayedText("") // Reset text on change
    const intervalId = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i))
        i++
      } else {
        clearInterval(intervalId)
      }
    }, speed)

    return () => clearInterval(intervalId)
  }, [text, speed])

  return displayedText
}

// The component that uses the hook
export function TypewriterText({
  text,
  speed = 50,
  className,
}: {
  text: string
  speed?: number
  className?: string
}) {
  const typedText = useTypewriter(text, speed)

  return <p className={className}>{typedText}</p>
}
