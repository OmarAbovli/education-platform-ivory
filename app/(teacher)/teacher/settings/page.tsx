"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBunnyConfig, saveBunnyConfig, saveBunnyAccountKey, listBunnyLibraries } from "@/server/bunny-actions"
import { getSnowSetting, toggleSnowSetting } from "@/server/teacher-actions"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Manual / Specific Lib Config
    const [apiKey, setApiKey] = useState("")
    const [libraryId, setLibraryId] = useState("")

    // Account Level Config
    const [mainKey, setMainKey] = useState("")
    const [libraries, setLibraries] = useState<{ id: number, name: string, apiKey: string }[]>([])
    const [fetchingLibs, setFetchingLibs] = useState(false)

    useEffect(() => {
        getBunnyConfig().then(res => {
            if (res) {
                if (res.apiKey) setApiKey(res.apiKey)
                if (res.libraryId) setLibraryId(res.libraryId)
                if (res.mainKey) {
                    setMainKey(res.mainKey)
                    // Auto fetch libraries if main key exists? Maybe wait for user action to avoid bugs
                }
            }
            setLoading(false)
        })
    }, [])

    async function handleFetchLibraries() {
        if (!mainKey) return toast.error("Enter Account API Key first")
        setFetchingLibs(true)
        // Save main key first
        await saveBunnyAccountKey(mainKey)

        const res = await listBunnyLibraries(mainKey)
        setFetchingLibs(false)

        if (res.ok && res.libraries) {
            setLibraries(res.libraries)
            toast.success(`Found ${res.libraries.length} libraries`)
        } else {
            toast.error("Failed to fetch: " + res.error)
        }
    }

    async function handleSave() {
        if (!apiKey || !libraryId) return toast.error("Missing Library fields")
        setSaving(true)
        // Also update main key if changed
        if (mainKey) await saveBunnyAccountKey(mainKey)

        const res = await saveBunnyConfig(apiKey, libraryId)
        setSaving(false)
        if (res.ok) toast.success("Configuration saved successfully!")
        else toast.error("Failed to save: " + res.error)
    }

    return (
        <div className="container max-w-2xl py-8">
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader>
                    <CardTitle className="text-2xl text-emerald-500">Video Storage Settings</CardTitle>
                    <CardDescription className="text-slate-400">
                        Configure your Bunny.net Stream account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                            {/* 1. Account Level */}
                            <div className="space-y-4 p-4 rounded-lg border border-slate-800 bg-slate-900/50">
                                <div className="space-y-2">
                                    <Label className="text-emerald-400 font-bold">1. Account API Key (Optional but Recommended)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="password"
                                            value={mainKey}
                                            onChange={e => setMainKey(e.target.value)}
                                            placeholder="Bunny Account API Key"
                                            className="bg-slate-950 border-slate-700 font-mono"
                                        />
                                        <Button variant="outline" onClick={handleFetchLibraries} disabled={fetchingLibs}>
                                            {fetchingLibs ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Libraries"}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500">Found in Account Settings → API Key. Allows you to list your libraries.</p>
                                </div>

                                {libraries.length > 0 && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label>Select Library to Use</Label>
                                        <select
                                            className="w-full h-10 px-3 rounded-md border border-slate-700 bg-slate-950 text-sm"
                                            onChange={(e) => {
                                                const lib = libraries.find(l => String(l.id) === e.target.value)
                                                if (lib) {
                                                    setLibraryId(String(lib.id))
                                                    setApiKey(lib.apiKey)
                                                    toast.info(`Selected "${lib.name}" - Keys updated below`)
                                                }
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>-- Choose a Library --</option>
                                            {libraries.map(lib => (
                                                <option key={lib.id} value={lib.id}>{lib.name} (ID: {lib.id})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* 2. Specific Library Config */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-emerald-400 font-bold">2. Active Library Configuration</Label>
                                    <span className="text-xs text-slate-500">Auto-filled if you select above</span>
                                </div>

                                <div className="space-y-2">
                                    <Label>Library API Key (Write Access)</Label>
                                    <Input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="Expected: Library API Key"
                                        className="bg-slate-900 border-slate-700"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Library ID</Label>
                                    <Input
                                        value={libraryId}
                                        onChange={e => setLibraryId(e.target.value)}
                                        placeholder="e.g. 123456"
                                        className="bg-slate-900 border-slate-700"
                                    />
                                </div>

                                <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500">
                                    {saving ? "Saving..." : "Save Configuration"}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Visual Settings */}
            <Card className="mt-8 bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader>
                    <CardTitle className="text-xl text-blue-400">Seasonal Effects ❄️</CardTitle>
                </CardHeader>
                <CardContent>
                    <SnowToggle />
                </CardContent>
            </Card>
        </div>
    )
}

function SnowToggle() {
    const [enabled, setEnabled] = useState(true)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getSnowSetting().then(val => {
            setEnabled(val)
            setLoading(false)
        })
    }, [])

    async function handleToggle(val: boolean) {
        setEnabled(val)
        await toggleSnowSetting(val)
        toast.success(val ? "Let it snow! ❄️" : "Winter is over ☀️")
    }

    if (loading) return <Loader2 className="h-5 w-5 animate-spin" />

    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Label>Winter Snow Effect</Label>
                <p className="text-xs text-slate-400">Show falling snow animation on student pages.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>
    )
}
