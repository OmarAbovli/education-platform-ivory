# Bunny Stream Integration

This project supports Bunny videos in three ways:
- Paste Bunny iframe embed HTML (https://iframe.mediadelivery.net/embed/{LIBRARY_ID}/{VIDEO_ID})
- Paste Bunny HLS URL (.m3u8 via your CDN host, e.g. vz-xxxx.b-cdn.net/{VIDEO_ID}/playlist.m3u8)
- Paste Bunny Video ID (GUID). We will build the official embed URL for you.

## Environment Variables

Required for library browsing and metadata (server-only):
- BUNNY_STREAM_LIBRARY_ID: Your Bunny Stream Library ID (e.g. "478935")
- BUNNY_STREAM_API_KEY: Bunny API AccessKey (Server-only, never expose to client)

Optional (for direct HLS URL construction):
- BUNNY_CDN_HOSTNAME: Your CDN host for HLS (e.g. "vz-57e2312c-08d.b-cdn.net")

You do not need a .env file in v0. Set these in the integration panel.

## Components and Flow

- server/bunny-actions.ts
  - listBunnyVideos({ page, itemsPerPage, search })
  - getBunnyVideoMetadata(videoId)
  Both run only on the server and keep your API key private.

- components/bunny-library-picker.tsx
  - Client component that calls listBunnyVideos via Server Actions.
  - Lets you pick “Use Embed” or “Use HLS” and returns both to the form.

- components/teacher-video-form.tsx
  - Already wired to support:
    - sourceType "bunny": paste embed HTML or HLS URL or pick from library.
    - sourceType "bunny_id": paste the GUID; we build the embed URL and can fetch metadata.

- lib/bunny.ts
  - isBunnyUrl, normalizeBunnyInput (extracts src= from iframe), isBunnyEmbedUrl
  - buildBunnyEmbedUrl, buildBunnyHlsUrl

- components/secure-video-player.tsx
  - Now supports Bunny embeds (mediadelivery.net/embed/...) by switching to an <iframe> automatically.
  - Still supports MP4/HLS playback natively (with hls.js fallback when needed).

## Usage Tips

- Want iframe embed? Paste the entire <iframe ...> code or the embed URL; it will render as an iframe.
- Prefer native playback? Paste the .m3u8 URL. The player will use native HLS or hls.js.
- Only have the Video ID? Select "Bunny (Video ID)" in the form and paste the GUID. We’ll build the embed URL automatically.

## Troubleshooting

- “Library not configured”: Ensure BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY are set.
- “Video not found”: Double-check the GUID or that your API key has access to the library.
- HLS doesn’t play on desktop Chrome: We auto-load hls.js if native HLS isn’t supported.
- Nothing happens after paste: If you pasted an <iframe>, we normalize to its src URL but still render an iframe in the player.
