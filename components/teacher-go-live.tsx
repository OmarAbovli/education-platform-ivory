"use client"

import { useEffect, useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { getMyLiveStatus, setLiveStatus } from "@/server/live-actions"
import type { VideoPackage } from "@/server/package-actions"

export function TeacherGoLive({ packages }: { packages: VideoPackage[] }) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [grades, setGrades] = useState<number[]>([])
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([])

  const [streamType, setStreamType] = useState<'external' | 'jitsi' | 'livekit'>('external')

  useEffect(() => {
    getMyLiveStatus().then((s) => {
      setTitle(s.title)
      setUrl(s.url)
      setIsActive(s.isActive)
      setGrades(s.grades)
      setSelectedPackageIds(s.packageIds)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    // If switching to integrated providers, auto-generate a URL structure
    // Note: The actual unique room creation happens on 'activate', but we show a preview or placeholder here.
    if (streamType === 'jitsi') {
      setUrl(`https://meet.jit.si/ELHELAL-LIVE-${Date.now()}`) // Placeholder, will be finalized on activate
    } else if (streamType === 'livekit') {
      setUrl(`/livekit?room=ELHELAL-LIVE-${Date.now()}&role=guest`)
    } else {
      setUrl('')
    }
  }, [streamType])

  function toggleGrade(g: number) {
    setGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  function togglePackage(id: string) {
    setSelectedPackageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function activate() {
    let finalUrl = url;

    // Ensure we have a URL for external, or generate one for integrated if empty
    if (streamType === 'external') {
      if (!finalUrl || finalUrl.trim().length === 0) {
        toast({ title: "Missing link", description: "Please paste the Zoom/YouTube/live link.", variant: "destructive" })
        return
      }
    } else if (streamType === 'jitsi') {
      // Generate a fresh Jitsi room for streaming
      const roomName = `ELHELAL-LIVE-${Date.now()}`
      // Moderator URL for teacher (will be saved in DB? No, DB saves what STUDENTS see)
      // Wait, 'url' in setLiveStatus is what STUDENTS click.
      // For Jitsi: Students go to meet.jit.si/ROOM
      // Teacher needs to go to meet.jit.si/ROOM#config...

      // We will save the STUDENT URL in the database.
      finalUrl = `https://meet.jit.si/${roomName}`

      // But the Teacher needs to open the MODERATOR link.
      // We handle this by opening the moderator link in a new tab right now.
      const teacherUrl = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&userInfo.displayName="المعلم"&userInfo.role=moderator`
      window.open(teacherUrl, '_blank')
    } else if (streamType === 'livekit') {
      const roomName = `ELHELAL-LIVE-${Date.now()}`
      // Student URL
      finalUrl = `/livekit?room=${roomName}` // Students join as guest by default

      // Teacher logic: Open internal page as host
      window.open(`/livekit?room=${roomName}&role=host`, '_blank')
    }

    startTransition(async () => {
      const res = await setLiveStatus({ title, url: finalUrl, active: true, grades, packageIds: selectedPackageIds })
      toast({
        title: res.ok ? "Live started" : "Error",
        description: res.ok ? "Students will see your stream as live now." : (res.error ?? "Could not start live"),
        variant: res.ok ? "default" : "destructive",
      })
      if (res.ok) {
        setIsActive(true)
        if (streamType !== 'external') {
          setUrl(finalUrl) // Update state to show the generated URL
        }
      }
    })
  }

  function stop() {
    startTransition(async () => {
      const res = await setLiveStatus({ title, url, active: false, grades, packageIds: selectedPackageIds })
      toast({
        title: res.ok ? "Live stopped" : "Error",
        description: res.ok ? "Students will no longer see your stream as live." : (res.error ?? "Could not stop live"),
        variant: res.ok ? "default" : "destructive",
      })
      if (res.ok) setIsActive(false)
    })
  }

  return (

    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <span className="text-sm font-medium text-slate-200">Live Status</span>
          <span className="text-xs text-slate-500">
            {loaded ? "Updates instantly for students." : "Loading..."}
          </span>
        </div>
        <Badge variant={isActive ? "default" : "outline"} className={isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-3 py-1" : "text-slate-400 border-slate-700"}>
          {isActive ? "Active Live" : "Offline"}
        </Badge>
      </div>

      <div className="space-y-3">
        <Label htmlFor="live-title" className="text-slate-300">Session Title</Label>
        <Input
          id="live-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q&A: Algebra — Chapter 3"
          className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500/50"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-slate-300">Stream Platform</Label>
        <div className="flex bg-slate-900 p-1.5 rounded-lg gap-1 border border-slate-800">
          <button
            onClick={() => setStreamType('external')}
            className={`flex-1 py-2 text-sm rounded-md transition-all font-medium ${streamType === 'external' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            External Link
          </button>
          <button
            onClick={() => setStreamType('jitsi')}
            className={`flex-1 py-2 text-sm rounded-md transition-all font-medium ${streamType === 'jitsi' ? 'bg-[#0074e0]/20 text-[#40b1ff] shadow-sm ring-1 ring-[#0074e0]/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            Jitsi Meet
          </button>
          <button
            onClick={() => setStreamType('livekit')}
            className={`flex-1 py-2 text-sm rounded-md transition-all font-medium ${streamType === 'livekit' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm ring-1 ring-indigo-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            LiveKit Cloud
          </button>
        </div>
      </div>

      {streamType === 'external' && (
        <div className="space-y-3">
          <Label htmlFor="live-url" className="text-slate-300">Join URL</Label>
          <Input
            id="live-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste Zoom or YouTube link..."
            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500/50"
          />
          <p className="text-xs text-slate-500">
            Students will see a "Join Live" banner redirecting to this URL.
          </p>
        </div>
      )}

      {streamType !== 'external' && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${streamType === 'jitsi' ? 'bg-[#0074e0]/5 border-[#0074e0]/20 text-blue-200' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-200'}`}>
          <div className="mt-0.5">ℹ️</div>
          <div>
            {streamType === 'jitsi' ? (
              <p>A secure <strong>Jitsi Meet</strong> room will be created. You'll be redirected to join as Moderator.</p>
            ) : (
              <p>A high-quality <strong>LiveKit</strong> session will start. You'll be redirected to the broadcast dashboard.</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-slate-300">Target Grades</Label>
        <div className="flex gap-6">
          {[1, 2, 3].map((g) => (
            <div key={g} className="flex items-center gap-2">
              <Checkbox
                checked={grades.includes(g)}
                onCheckedChange={() => toggleGrade(g)}
                id={`go-live-grade-${g}`}
                className="border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <Label htmlFor={`go-live-grade-${g}`} className="text-slate-400 font-normal cursor-pointer hover:text-slate-200">Grade {g}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-slate-300">Access Control (Packages)</Label>
        <div className="flex flex-wrap gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          {packages.length > 0 ? packages.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-xs bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-full cursor-pointer transition-colors border border-transparent hover:border-slate-700">
              <Checkbox
                checked={selectedPackageIds.includes(p.id)}
                onCheckedChange={() => togglePackage(p.id)}
                className="w-3.5 h-3.5 border-slate-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
              />
              <span className="text-slate-300">{p.name}</span>
            </label>
          )) : (
            <p className="text-xs text-slate-500 italic">No packages found. Stream will be public to selected grades.</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={activate}
          disabled={isPending}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-5"
        >
          {isPending && !isActive ? "Starting..." : "Start Live Stream"}
        </Button>
        <Button
          variant="outline"
          onClick={stop}
          disabled={isPending || !isActive}
          className="flex-1 border-slate-700 text-slate-300 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50 py-5"
        >
          {isPending && isActive ? "Stopping..." : "Stop Stream"}
        </Button>
      </div>
    </div>
  )
}
