"use client"

import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
                <div className="space-y-6">
                    <h1 className="text-4xl font-bold text-emerald-500">Critical System Error</h1>
                    <p className="text-slate-400 max-w-sm mx-auto">
                        A critical error occurred that affected the entire application layout.
                        We apologize for the inconvenience.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button onClick={() => reset()} className="bg-emerald-600 hover:bg-emerald-500">
                            Attempt Recovery
                        </Button>
                        <a
                            href="/"
                            className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-md hover:bg-slate-900 transition-colors"
                        >
                            <Home className="h-4 w-4" />
                            Go Back Home
                        </a>
                    </div>
                </div>
            </body>
        </html>
    )
}
