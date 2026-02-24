"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PhoneCall, Phone, Users } from "lucide-react"
import { getActiveTeacherCallForStudent, joinVoiceCall } from "@/server/voice-call-actions"
import { useToast } from "@/hooks/use-toast"

export function StudentLiveCallBanner() {
  const [activeCall, setActiveCall] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadCall = async () => {
      try {
        const result = await getActiveTeacherCallForStudent()
        if (result && result.success && result.call) {
          setActiveCall(result.call)
        } else {
          setActiveCall(null)
        }
      } catch (e) {
        console.debug("Failed to load call status", e)
        setActiveCall(null)
      }
    }

    loadCall()
    // Poll every 10 seconds
    const interval = setInterval(loadCall, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleJoin = async () => {
    if (!activeCall) return
    setLoading(true)

    try {
      const result = await joinVoiceCall(activeCall.id)
      if (result.success && result.call) {
        // Open in new window
        window.open(result.call.room_url, '_blank', 'width=1200,height=800')
        toast({ title: 'تم الانضمام للمكالمة!' })
      } else {
        toast({ title: result.error || 'فشل الانضمام', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'حدث خطأ', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (!activeCall) return null

  return (
    <Card className="border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-full animate-pulse">
              <PhoneCall className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                🔴 مكالمة جماعية مباشرة
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span>بدأها: {activeCall.creator_name}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{activeCall.participant_count || 0} مشارك</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                انضم الآن للمكالمة الجماعية مع المعلم والطلاب
              </p>
            </div>
          </div>
          <Button
            onClick={handleJoin}
            disabled={loading}
            size="lg"
            className="bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8"
          >
            <Phone className="h-5 w-5 mr-2" />
            انضم الآن
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
