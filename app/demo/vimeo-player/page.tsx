import SiteHeader from "@/components/site-header"
import VimeoSmartPlayer from "@/components/vimeo-smart-player"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function DemoVimeoPlayerPage() {
  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Vimeo Embed</CardTitle>
            <CardDescription>Responsive iframe with overlay watermark.</CardDescription>
          </CardHeader>
          <CardContent>
            <VimeoSmartPlayer
              videoUrl="https://vimeo.com/76979871"
              studentName="John Doe • st_123"
              title="Vimeo Sample"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HLS (.m3u8)</CardTitle>
            <CardDescription>HTML5 video with Hls.js polyfill when needed.</CardDescription>
          </CardHeader>
          <CardContent>
            <VimeoSmartPlayer
              videoUrl="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
              studentName="John Doe • st_123"
              title="HLS Sample"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MP4</CardTitle>
            <CardDescription>Native HTML5 playback, no Video.js.</CardDescription>
          </CardHeader>
          <CardContent>
            <VimeoSmartPlayer
              videoUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              studentName="John Doe • st_123"
              title="MP4 Sample"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
