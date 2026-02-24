'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type Video = { id: string; title: string }

export function QuizFilters({ videos }: { videos: Video[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [grade, setGrade] = useState(searchParams.get('grade') || '')
    const [month, setMonth] = useState(searchParams.get('month') || '')
    const [videoId, setVideoId] = useState(searchParams.get('videoId') || '')

    const handleFilter = () => {
        const params = new URLSearchParams()
        if (grade) params.set('grade', grade)
        if (month) params.set('month', month)
        if (videoId) params.set('videoId', videoId)
        router.push(`/admin/quizzes?${params.toString()}`)
    }

    return (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="grid gap-2">
            <Label>Grade</Label>
            <Select onValueChange={setGrade} defaultValue={grade}>
                <SelectTrigger>
                <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="1">Grade 1</SelectItem>
                <SelectItem value="2">Grade 2</SelectItem>
                <SelectItem value="3">Grade 3</SelectItem>
                </SelectContent>
            </Select>
            </div>
            <div className="grid gap-2">
            <Label>Month</Label>
            <Select onValueChange={setMonth} defaultValue={month}>
                <SelectTrigger>
                <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={String(m)}>Month {m}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>
            <div className="grid gap-2">
            <Label>Video</Label>
            <Select onValueChange={setVideoId} defaultValue={videoId}>
                <SelectTrigger>
                <SelectValue placeholder="Select Video" />
                </SelectTrigger>
                <SelectContent>
                {videos.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>
            <div className="flex items-end">
            <Button onClick={handleFilter}>Apply Filters</Button>
            </div>
        </div>
    )
}
