# HLS + AES-128 Cheatsheet (FFmpeg)

1) Generate a 16-byte key (per video)
openssl rand 16 > enc.key

2) Key info file (URL to the key, local path to key, optional IV)
echo "https://YOUR-STATIC-DOMAIN.com/secure/enc.key" > key.info
echo "./enc.key" >> key.info
# Optional fixed IV (32 hex chars); omit the next line to let FFmpeg set IVs automatically
echo "00000000000000000000000000000000" >> key.info

3) Transcode/segment to HLS
ffmpeg -i input.mp4 \
  -c:v h264 -profile:v baseline -level 3.0 -c:a aac -b:a 128k \
  -hls_time 6 -hls_list_size 0 \
  -hls_key_info_file key.info \
  -hls_segment_filename "segment_%05d.ts" \
  -f hls index.m3u8

4) Upload
- Upload index.m3u8 and segment_*.ts to Cloudflare Pages / Netlify under a path like /videos/VIDEO_ID/
- Serve enc.key via a Worker/Function that validates Origin/Referer and returns key only for your domain.
- Set headers to restrict cross-origin and cache segments.

5) Play
- Use the SecureVideoPlayer with source="https://YOUR-STATIC-DOMAIN.com/videos/VIDEO_ID/index.m3u8"
- The player auto-detects HLS and enables VHS.
