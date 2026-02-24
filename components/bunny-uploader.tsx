"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { createBunnyVideo, getBunnyConfig } from "@/server/bunny-actions"
import { toast } from "sonner"
import { Upload, X, CheckCircle, Loader2 } from "lucide-react"
import { useUploadProgress } from "./upload-progress-provider"

type BunnyUploaderProps = {
    onUploadComplete: (videoId: string, directPlayUrl: string) => void
    disabled?: boolean
}

export function BunnyUploader({ onUploadComplete, disabled, targetLibraryId }: BunnyUploaderProps & { targetLibraryId?: string }) {
    const [file, setFile] = useState<File | null>(null)
    const [isInternalUploading, setIsInternalUploading] = useState(false)
    const [tempTitle, setTempTitle] = useState("")
    const { addUpload, updateProgress, setUploadStatus } = useUploadProgress()

    async function handleUpload() {
        if (!file) return
        if (!tempTitle) {
            toast.error("Please provide a temporary title for the video first")
            return
        }

        const uploadId = Math.random().toString(36).substring(7)
        addUpload(uploadId, tempTitle)
        setIsInternalUploading(true)

        try {
            // 1. Create Video Placeholder
            const createRes = await createBunnyVideo(tempTitle, targetLibraryId)
            if (!createRes.ok || !createRes.guid) {
                const err = createRes.error || "Failed to create video placeholder"
                setUploadStatus(uploadId, "error", err)
                throw new Error(err)
            }

            const { guid, libraryId, apiKey } = createRes as any

            // 2. Upload File via PUT
            const xhr = new XMLHttpRequest()
            xhr.open("PUT", `https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, true)

            xhr.setRequestHeader("AccessKey", apiKey)
            xhr.setRequestHeader("Content-Type", "application/octet-stream")
            xhr.setRequestHeader("Accept", "application/json")

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100)
                    updateProgress(uploadId, percent)
                }
            }

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setUploadStatus(uploadId, "completed")
                    toast.success(`Upload complete: ${tempTitle}`)
                    const playUrl = `https://iframe.mediadelivery.net/play/${libraryId}/${guid}`
                    onUploadComplete(guid, playUrl)
                    setIsInternalUploading(false)
                    setFile(null)
                    setTempTitle("")
                } else {
                    const err = "Upload failed: " + xhr.statusText
                    setUploadStatus(uploadId, "error", err)
                    toast.error(err)
                    setIsInternalUploading(false)
                }
            }

            xhr.onerror = () => {
                const err = "Network error during upload"
                setUploadStatus(uploadId, "error", err)
                toast.error(err)
                setIsInternalUploading(false)
            }

            xhr.send(file)

        } catch (e: any) {
            setIsInternalUploading(false)
        }
    }

    if (isInternalUploading) {
        return (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <p className="text-sm text-slate-400">Upload in progress in the background...</p>
                <Button variant="ghost" size="sm" onClick={() => setIsInternalUploading(false)}>
                    Add Another Video
                </Button>
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-6 flex flex-col items-center gap-4 text-center hover:bg-slate-900/80 transition-colors">
            {!file ? (
                <>
                    <div className="p-3 rounded-full bg-slate-800 text-slate-400">
                        <Upload className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-200">Click to select a video file</p>
                        <p className="text-xs text-slate-500">MP4, MOV, AVI up to 4GB</p>
                    </div>
                    <Input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => {
                            if (e.target.files?.[0]) setFile(e.target.files[0])
                        }}
                    />
                    <Button variant="secondary" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                        Select Video
                    </Button>
                </>
            ) : (
                <div className="w-full space-y-4">
                    <div className="flex items-center justify-between bg-slate-800 p-3 rounded-md">
                        <div className="flex items-center gap-2 truncate">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="text-sm text-slate-200 truncate">{file.name}</span>
                            <span className="text-xs text-slate-500">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="h-6 w-6 text-slate-400 hover:text-red-400">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-xs">Processing Title (Internal use for Bunny)</Label>
                        <Input
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            placeholder="e.g. Lesson 1 Video"
                            className="bg-slate-950"
                        />
                    </div>

                    <Button onClick={handleUpload} className="w-full bg-emerald-600 hover:bg-emerald-500">
                        Start Upload
                    </Button>
                </div>
            )}
        </div>
    )
}

// Helper: 
function Label({ className, children, ...props }: any) {
    return <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>{children}</label>
}
