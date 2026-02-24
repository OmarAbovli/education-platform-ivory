"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

type UploadStatus = "idle" | "uploading" | "completed" | "error"

interface UploadState {
    id: string
    title: string
    progress: number
    status: UploadStatus
    error?: string
}

interface UploadProgressContextType {
    uploads: UploadState[]
    addUpload: (id: string, title: string) => void
    updateProgress: (id: string, progress: number) => void
    setUploadStatus: (id: string, status: UploadStatus, error?: string) => void
    removeUpload: (id: string) => void
}

const UploadProgressContext = createContext<UploadProgressContextType | undefined>(undefined)

export function UploadProgressProvider({ children }: { children: React.ReactNode }) {
    const [uploads, setUploads] = useState<UploadState[]>([])

    const addUpload = useCallback((id: string, title: string) => {
        setUploads(prev => [...prev, { id, title, progress: 0, status: "uploading" }])
    }, [])

    const updateProgress = useCallback((id: string, progress: number) => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress } : u))
    }, [])

    const setUploadStatus = useCallback((id: string, status: UploadStatus, error?: string) => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, status, error } : u))
    }, [])

    const removeUpload = useCallback((id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id))
    }, [])

    return (
        <UploadProgressContext.Provider value={{ uploads, addUpload, updateProgress, setUploadStatus, removeUpload }}>
            {children}
            {uploads.length > 0 && (
                <div className="fixed bottom-4 right-4 z-[9999] w-80 space-y-2">
                    {uploads.map(upload => (
                        <Card key={upload.id} className="p-4 shadow-2xl border-emerald-500/20 bg-slate-900 text-white">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium truncate pr-2">{upload.title}</span>
                                {upload.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
                                {upload.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                {upload.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                            </div>
                            <Progress value={upload.progress} className="h-2 mb-2" />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    {upload.status === "uploading" ? `${Math.round(upload.progress)}%` : upload.status}
                                </span>
                                {(upload.status === "completed" || upload.status === "error") && (
                                    <button
                                        onClick={() => removeUpload(upload.id)}
                                        className="text-xs text-emerald-500 hover:text-emerald-400"
                                    >
                                        Dismiss
                                    </button>
                                )}
                            </div>
                            {upload.error && <p className="mt-1 text-[10px] text-red-400">{upload.error}</p>}
                        </Card>
                    ))}
                </div>
            )}
        </UploadProgressContext.Provider>
    )
}

export function useUploadProgress() {
    const context = useContext(UploadProgressContext)
    if (!context) {
        throw new Error("useUploadProgress must be used within an UploadProgressProvider")
    }
    return context
}
