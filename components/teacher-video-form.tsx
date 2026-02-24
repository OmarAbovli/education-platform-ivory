"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { uploadVideo } from "@/server/teacher-actions"
import { useToast } from "@/hooks/use-toast"
import { ThumbnailUpload } from "@/components/thumbnail-upload"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getBunnyVideoMetadata, listBunnyLibraries } from "@/server/bunny-actions"
import BunnyLibraryPicker from "@/components/bunny-library-picker"
import { BunnyUploader } from "@/components/bunny-uploader"
import { Loader2 } from "lucide-react"

import { VideoPackage } from "@/server/package-actions"
import { useEffect } from "react"
import { generateProfessionalThumbnail } from "@/server/ai-actions"

const gradeOptions = [
  { label: "First year", value: 1 },
  { label: "Second year", value: 2 },
  { label: "Third year", value: 3 },
]

function formatDuration(totalSeconds?: number) {
  if (!totalSeconds || totalSeconds <= 0) return ""
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

export function TeacherVideoForm({ packages }: { packages: VideoPackage[] }) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")

  // ... existing state ... 

  // Library selection state
  const [libraries, setLibraries] = useState<any[]>([])
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("")
  const [loadingLibs, setLoadingLibs] = useState(false)

  // Fetch libraries on mount
  useEffect(() => {
    setLoadingLibs(true)
    listBunnyLibraries().then(res => {
      if (res.ok && res.libraries) {
        setLibraries(res.libraries)
        if (res.libraries.length > 0) {
          // Default to first one or previously selected? 
          // We'll let user pick, or select first
          setSelectedLibraryId(String(res.libraries[0].id))
        }
      }
      setLoadingLibs(false)
    })
  }, [])

  const [description, setDescription] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [directPlayUrl, setDirectPlayUrl] = useState("") // Bunny Direct Play URL or HLS URL
  const [sourceType, setSourceType] = useState<"gdrive" | "youtube" | "vimeo" | "bunny" | "bunny_id" | "bunny_upload">("bunny")
  const [grades, setGrades] = useState<number[]>([])
  const [packageId, setPackageId] = useState<string | null>(null)
  const [isFree, setIsFree] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [maxWatchCount, setMaxWatchCount] = useState(3)
  const [watchLimitEnabled, setWatchLimitEnabled] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Bunny metadata state (Video ID flow)
  const [metaDurationSec, setMetaDurationSec] = useState<number | undefined>(undefined)
  const [metaFetched, setMetaFetched] = useState(false)

  const [aiProvider, setAiProvider] = useState<"pollinations" | "getimg" | "gemini">("pollinations")

  function toggleGrade(val: number) {
    setGrades((prev) => (prev.includes(val) ? prev.filter((g) => g !== val) : [...prev, val]))
  }

  const urlPlaceholder =
    sourceType === "youtube"
      ? "Paste a YouTube link (https://www.youtube.com/watch?v=...)"
      : sourceType === "vimeo"
        ? "Paste Vimeo embed code (<iframe ...>) or a Vimeo link"
        : sourceType === "bunny"
          ? "Paste Bunny embed HTML, a mediadelivery 'play' URL, or a CDN HLS .m3u8"
          : sourceType === "bunny_id"
            ? "Paste the Bunny Video ID (e.g., 0f0bd0ef-1111-2222-3333-1234567890ab)"
            : "Paste a direct MP4/HLS or Google Drive link"

  const helper =
    sourceType === "youtube"
      ? "We’ll convert watch/shorts URLs to embed automatically."
      : sourceType === "vimeo"
        ? 'Tip: Click "Share" → "Embed" on Vimeo and paste the <iframe ...> code here.'
        : sourceType === "bunny"
          ? "Examples: <iframe src='https://iframe.mediadelivery.net/embed/{LIB}/{ID}'>, https://iframe.mediadelivery.net/play/{LIB}/{ID}, or https://{cdn-host}/{VIDEO_ID}/playlist.m3u8"
          : sourceType === "bunny_id"
            ? "We’ll build the official embed URL from your Library ID and this Video ID."
            : "Direct MP4/HLS (.m3u8) or Google Drive file links can be used."

  async function handleFetchBunnyMeta() {
    const id = videoUrl.trim()
    if (!id) {
      toast({ title: "Missing ID", description: "Enter a Bunny Video ID first.", variant: "destructive" })
      return
    }
    startTransition(async () => {
      const res = await getBunnyVideoMetadata(id)
      if (!res.ok) {
        toast({ title: "Bunny lookup failed", description: res.error, variant: "destructive" })
        return
      }
      setMetaFetched(true)
      setMetaDurationSec(res.durationSeconds)
      if (res.title && !title) setTitle(res.title)
      if (res.thumbnailUrl && !thumbnailUrl) setThumbnailUrl(res.thumbnailUrl)
      if (res.durationSeconds) {
        const pretty = formatDuration(res.durationSeconds)
        if (pretty && !description.includes("Duration:")) {
          setDescription((d) => (d ? `${d}\nDuration: ${pretty}` : `Duration: ${pretty}`))
        }
      }
      toast({ title: "Fetched from Bunny", description: "Title and duration were imported." })
    })
  }

  const [isGeneratingAi, setIsGeneratingAi] = useState(false)

  async function handleGenerateAiThumbnail() {
    if (!title && !description) {
      toast({ title: "Context required", description: "Please enter a title or description first.", variant: "destructive" })
      return
    }

    setIsGeneratingAi(true)
    const providerLabel = aiProvider === "pollinations" ? "Fast & Free AI" : "Professional Fooocus AI"
    toast({ title: "AI Generation", description: `Starting ${providerLabel}...` })

    try {
      // 1. Call Server Action
      const contextText = `${title}. ${description}`
      const result = await generateProfessionalThumbnail(contextText, aiProvider)

      if (!result.ok || !result.imageBase64) {
        if (result.error === "QUOTA_EXCEEDED") {
          toast({
            title: "Credits Exhausted",
            description: "Your professional credits are out. Please switch the AI model to 'Fast & Free AI' on the left to continue.",
            variant: "destructive"
          })
          setIsGeneratingAi(false)
          return
        }
        throw new Error(result.error || "Generation failed")
      }

      // 2. Convert base64 to File and upload to local storage
      const blobRes = await fetch(`data:image/jpeg;base64,${result.imageBase64}`)
      const blob = await blobRes.blob()


      // 3. Convert blob to File and upload to local storage
      const file = new File([blob], `ai-thumbnail-${Date.now()}.jpg`, { type: "image/jpeg" })
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadData = await uploadRes.json()

      if (uploadData.ok && uploadData.url) {
        setThumbnailUrl(uploadData.url)
        toast({ title: "Generated", description: "Professional AI Thumbnail ready!" })
      } else {
        throw new Error(uploadData.error || "Upload failed")
      }
    } catch (error: any) {
      console.error("AI Gen Error:", error)
      toast({ title: "Generation Failed", description: "Could not generate or save the AI image. Please try again.", variant: "destructive" })
    } finally {
      setIsGeneratingAi(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!packageId) return
        startTransition(async () => {
          const res = await uploadVideo({
            title,
            category,
            description,
            grades,
            videoUrl,
            packageId,
            isFree,
            thumbnailUrl,
            sourceType,
            directPlayUrl: directPlayUrl || undefined,
            maxWatchCount,
            watchLimitEnabled,
          })
          if (res?.ok) {
            toast({
              title: "Video saved",
              description: isFree
                ? "Your free video is now visible on the homepage."
                : "Your paid video is available to students with access.",
            })
            setTitle("")
            setCategory("")
            setDescription("")
            setVideoUrl("")
            setDirectPlayUrl("")
            setGrades([])
            setPackageId(null)
            setIsFree(false)
            setThumbnailUrl("")
            setSourceType("bunny")
            setMaxWatchCount(3)
            setWatchLimitEnabled(true)
            setMetaDurationSec(undefined)
            setMetaFetched(false)
          } else {
            toast({ title: "Error", description: res?.error ?? "Upload failed", variant: "destructive" })
          }
        })
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="v-title">Title</Label>
        <Input
          id="v-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="v-category">Category</Label>
          <Input
            id="v-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Grammar, Lesson, Exam Review..."
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Package</Label>
          <Select value={packageId?.toString() ?? ""} onValueChange={(v) => setPackageId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select package" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Thumbnail</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50"
            disabled={isGeneratingAi}
            onClick={handleGenerateAiThumbnail}
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              "✨ Generate with AI"
            )}
          </Button>

          <Select value={aiProvider} onValueChange={(v: any) => setAiProvider(v)}>
            <SelectTrigger className="w-[140px] h-8 text-[10px] bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pollinations">Fast & Free AI</SelectItem>
              <SelectItem value="getimg">Professional (Fooocus)</SelectItem>
              <SelectItem value="gemini">Gemini Enhanced AI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ThumbnailUpload value={thumbnailUrl} onChange={setThumbnailUrl} />
        <p className="text-xs text-muted-foreground">This image will be used as the video thumbnail.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="v-desc">Description</Label>
        <Textarea
          id="v-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="In this lesson..."
        />
        {metaDurationSec ? (
          <p className="text-xs text-emerald-700">Detected duration: {formatDuration(metaDurationSec)}</p>
        ) : metaFetched ? (
          <p className="text-xs text-muted-foreground">No duration returned for this video.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Grades</Label>
        <div className="flex flex-wrap gap-4">
          {gradeOptions.map((g) => (
            <label key={g.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={grades.includes(g.value)} onCheckedChange={() => toggleGrade(g.value)} />
              <span>{g.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Source type</Label>
          <RadioGroup
            value={sourceType}
            onValueChange={(v) => setSourceType(v as "gdrive" | "youtube" | "vimeo" | "bunny" | "bunny_id")}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="src-bn" value="bunny" />
              <Label htmlFor="src-bn" className="cursor-pointer">
                Bunny (embed, play URL, or HLS)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="src-vimeo" value="vimeo" />
              <Label htmlFor="src-vimeo" className="cursor-pointer">
                Vimeo (embed or link)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="src-yt" value="youtube" />
              <Label htmlFor="src-yt" className="cursor-pointer">
                YouTube (embed)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="src-gd" value="gdrive" />
              <Label htmlFor="src-gd" className="cursor-pointer">
                Direct MP4/HLS or Google Drive
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="src-bn-up" value="bunny_upload" />
              <Label htmlFor="src-bn-up" className="cursor-pointer font-bold text-emerald-500">
                Direct Upload 🚀
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="src-bnid" value="bunny_id" />
              <Label htmlFor="src-bnid" className="cursor-pointer">
                Bunny (Video ID)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="grid">
            <Label>Free video</Label>
            <span className="text-xs text-muted-foreground">Free videos appear on the homepage.</span>
          </div>
          <Switch checked={isFree} onCheckedChange={setIsFree} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="v-url">{sourceType === "bunny_id" ? "Bunny Video ID" : "Video URL or Embed Code"}</Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Textarea
            id="v-url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={urlPlaceholder}
            rows={3}
          />
          {sourceType === "bunny_id" && (
            <div className="flex items-start">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || !videoUrl.trim()}
                onClick={() => void handleFetchBunnyMeta()}
                className="whitespace-nowrap"
              >
                {isPending ? "Fetching..." : "Fetch from Bunny"}
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{helper}</p>

        {sourceType === "bunny_upload" && (
          <div className="mt-4">
            <BunnyUploader onUploadComplete={(vid, playUrl) => {
              setSourceType("bunny_id") // Switch to ID mode after upload
              setVideoUrl(vid)
              setDirectPlayUrl(playUrl)
              toast({ title: "Upload Successful", description: "Video ID filled. You can now fetch metadata or save." })
              // Optional: auto fetch meta?
              startTransition(async () => {
                const res = await getBunnyVideoMetadata(vid)
                if (res.ok) {
                  setMetaDurationSec(res.durationSeconds)
                  setThumbnailUrl(res.thumbnailUrl || "")
                }
              })
            }} />
          </div>
        )}

        {sourceType === "bunny" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="v-direct">Bunny Direct Play URL (optional)</Label>
              <Input
                id="v-direct"
                value={directPlayUrl}
                onChange={(e) => setDirectPlayUrl(e.target.value)}
                placeholder="https://iframe.mediadelivery.net/play/{LIBRARY}/{VIDEO_ID} or https://{cdn-host}/{VIDEO_ID}/playlist.m3u8"
              />
              <p className="text-xs text-muted-foreground">
                Example: https://iframe.mediadelivery.net/play/478935/e25e0e1c-41b3-4b4c-b358-0acdf2eaf02d
              </p>
            </div>
            <div className="space-y-2">
              <Label>Pick from your Bunny Library</Label>
              <BunnyLibraryPicker
                onSelect={(choice) => {
                  const chosenUrl = choice.hlsUrl ?? choice.embedUrl
                  if (chosenUrl) setVideoUrl(chosenUrl)
                  if (!title && choice.title) setTitle(choice.title)
                  if (!thumbnailUrl && choice.thumbnailUrl) setThumbnailUrl(choice.thumbnailUrl)
                  if (choice.durationSeconds) {
                    const pretty = formatDuration(choice.durationSeconds)
                    if (pretty && !description.includes("Duration:")) {
                      setDescription((d) => (d ? `${d}\nDuration: ${pretty}` : `Duration: ${pretty}`))
                    }
                  }
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* حقول التحكم في المشاهدات */}
      <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
        <h3 className="text-sm font-semibold">Watch Limit Settings</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="watch-limit">Enable Watch Limit</Label>
            <p className="text-xs text-muted-foreground">
              Limit how many times students can watch this video
            </p>
          </div>
          <Switch
            id="watch-limit"
            checked={watchLimitEnabled}
            onCheckedChange={setWatchLimitEnabled}
          />
        </div>

        {watchLimitEnabled && (
          <div className="space-y-2">
            <Label htmlFor="max-watches">Maximum Watch Count</Label>
            <div className="flex items-center gap-2">
              <Input
                id="max-watches"
                type="number"
                min="1"
                max="10"
                value={maxWatchCount}
                onChange={(e) => setMaxWatchCount(parseInt(e.target.value) || 3)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">times per student</span>
            </div>
            <p className="text-xs text-muted-foreground">
              A watch is counted when the student views 85% or more of the video
            </p>
          </div>
        )}
      </div>

      <Button disabled={isPending || !packageId} type="submit">
        {isPending ? "Saving..." : "Save Video"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Use iframe for Bunny “play/embed” pages, and video for direct HLS/MP4. This matches Next.js guidance for
        embedding videos [^1][^2].
      </p>
    </form>
  )
}
