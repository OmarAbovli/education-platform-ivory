"use client"

import { useEffect, useRef } from "react"

interface BunnyPlayerProps {
  videoId: string
  videoUrl: string
}

export default function BunnyPlayer({ videoId, videoUrl }: BunnyPlayerProps) {
  const viewTracked = useRef(false)

  useEffect(() => {
    const handleVideoEnd = async () => {
      // Ensure we only track the view once per page load
      if (viewTracked.current) return

      viewTracked.current = true

      try {
        await fetch("/api/videos/track-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        })
        console.log(`View tracked for video ${videoId}`)
      } catch (error) {
        console.error("Failed to track video view:", error)
        // If tracking fails, reset the flag to allow another attempt if they re-watch
        viewTracked.current = false
      }
    }

    // This assumes you are using the Bunny Stream Player iframe
    // You need to listen for messages from the iframe
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== "https://iframe.mediadelivery.net") return
      if (event.data.type === "ended") {
        handleVideoEnd()
      }
    }

    window.addEventListener("message", messageHandler)

    return () => {
      window.removeEventListener("message", messageHandler)
    }
  }, [videoId])

  return (
    <div style={{ position: "relative", paddingTop: "56.25%" }}>
      <iframe
        src={videoUrl}
        loading="lazy"
        style={{
          border: "none",
          position: "absolute",
          top: 0,
          height: "100%",
          width: "100%",
        }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      ></iframe>
    </div>
  )
}