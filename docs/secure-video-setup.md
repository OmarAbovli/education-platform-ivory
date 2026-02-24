# Secure Video Player: Hosting, HLS, Encryption, and Watermark

This project includes a secure Video.js player that supports both MP4 and HLS. Use the guidelines below to prepare and host your content.

1) Google Drive to Direct MP4
- Share the file publicly (Anyone with the link can view).
- Convert the share link to direct download:
  - Input:
    https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  - Output (paste into the app):
    https://drive.google.com/uc?export=download&id=FILE_ID

Notes:
- For large files Google may gate with a virus scan page. Consider HLS for more control.

2) Convert MP4 to HLS with AES-128 (FFmpeg)
Create a folder per video, then run:
- Create a key:
  openssl rand 16 > enc.key

- Host the key at a private URL and save a key info file:
  echo "https://YOUR-STATIC-DOMAIN.com/path/enc.key" > key.info
  echo "./enc.key" >> key.info
  echo "00000000000000000000000000000000" >> key.info
  (The third line is optional IV; omit to let FFmpeg pick IVs.)

- Create HLS playlist and segments:
  ffmpeg -i input.mp4 \
    -profile:v baseline -level 3.0 -start_number 0 \
    -hls_time 6 -hls_list_size 0 \
    -hls_key_info_file key.info \
    -hls_segment_filename "segment_%05d.ts" \
    -f hls index.m3u8

This outputs:
- index.m3u8 and segment_00001.ts ... files
- enc.key should NOT be public if you want real protection; see domain restrictions below.

3) Host on Cloudflare Pages or Netlify
- Upload the folder with index.m3u8 and .ts segments.
- Set correct headers (examples):

Netlify (_headers file at the folder):
/videos/* 
  Access-Control-Allow-Origin: https://YOUR-APP-DOMAIN.com
  Cross-Origin-Resource-Policy: same-site
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

Cloudflare Pages:
- Add a _headers file (same directives as above), or use Cloudflare Rules.
- Optional hotlink protection via Cloudflare Firewall Rules (block requests with no Referer or wrong Origin).
- Optional: Serve enc.key through a Cloudflare Worker that validates Origin/Referer and signed tokens before returning the key.

4) Using HLS in the App
- Set the video URL in the app to your HLS manifest:
  https://YOUR-STATIC-DOMAIN.com/videos/your-video/index.m3u8
- The SecureVideoPlayer will detect .m3u8 and use HLS automatically.

5) Watermark
- The player overlays a dynamic watermark with the student’s name that moves every 30 seconds.

6) Important Disclaimer
- Browser playback requires data access to media; “no-download” is best-effort. Use HLS with short-lived signed URLs and strict key access for stronger protection.
