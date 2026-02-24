"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RotateCcw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
            <div className="relative mb-8">
                <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
                <AlertCircle className="relative h-24 w-24 text-emerald-500" />
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-6xl text-emerald-50">
                Something went wrong!
            </h1>

            <p className="mb-8 max-w-md text-lg text-slate-400">
                Our system encountered an unexpected error. Don&apos;t worry, our team has been notified and we&apos;re looking into it.
            </p>

            {error.digest && (
                <code className="mb-8 rounded bg-slate-900 px-3 py-1 text-xs text-emerald-400/70 border border-emerald-500/10">
                    Error ID: {error.digest}
                </code>
            )}

            <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                    onClick={() => reset()}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500"
                    size="lg"
                >
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                </Button>
                <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-slate-800 bg-slate-900 hover:bg-slate-800 hover:text-white"
                >
                    <Link href="/" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Go back home
                    </Link>
                </Button>
            </div>

            <div className="mt-16 text-slate-600 text-sm">
                © {new Date().getFullYear()} El-Helal Education Platform
            </div>
        </div>
    )
}
