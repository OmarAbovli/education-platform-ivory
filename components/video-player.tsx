"use client"

import { useMemo } from "react"

export function VideoPlayer({
  src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  title = "Video",
}) {
  const isMp4 = useMemo(() => src.endsWith(".mp4"), [src])
  if (isMp4) {
    return (
      <video controls preload="none" aria-label="Video player" className="w-full rounded-md">
        <source src={src} type="video/mp4" />
        {"Your browser does not support the video tag."}
      </video>
    )
  }
  return (
    <iframe
      className="w-full aspect-video rounded-md"
      src={src}
      title={title}
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  )
}
