import { NextResponse } from 'next/server'
import { 
  trackVideoProgress, 
  startWatchSession, 
  getVideoWatchInfo 
} from '@/server/video-tracking-actions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, videoId, progress, sessionId } = body

    switch (action) {
      case 'start':
        // بدء جلسة مشاهدة جديدة
        const startResult = await startWatchSession(videoId)
        return NextResponse.json(startResult)

      case 'track':
        // تتبع تقدم المشاهدة
        console.log('[API] Track request:', { videoId, progress, sessionId })
        if (typeof progress !== 'number') {
          return NextResponse.json(
            { success: false, message: 'Invalid progress value' },
            { status: 400 }
          )
        }
        const trackResult = await trackVideoProgress(videoId, progress, sessionId)
        console.log('[API] Track response:', trackResult)
        return NextResponse.json(trackResult)

      case 'info':
        // الحصول على معلومات المشاهدة
        const info = await getVideoWatchInfo(videoId)
        return NextResponse.json({ success: true, data: info })

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Video tracking API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { success: false, message: 'Video ID required' },
        { status: 400 }
      )
    }

    const info = await getVideoWatchInfo(videoId)
    
    if (!info) {
      return NextResponse.json(
        { success: false, message: 'Video not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: info })
  } catch (error) {
    console.error('Video tracking GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
