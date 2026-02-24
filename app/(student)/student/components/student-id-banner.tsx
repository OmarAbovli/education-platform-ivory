"use client"

import { Button } from "@/components/ui/button"

export default function StudentIdBanner({ id }: { id: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(id)
    } catch {}
  }
  return (
    <div className="mb-6 flex items-center justify-between rounded-md border bg-card p-3">
      <div>
        <p className="text-sm font-medium">Your Student ID</p>
        <p className="text-xs text-muted-foreground">Share this ID with a teacher to request access to their videos.</p>
      </div>
      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-xs">{id}</code>
        <Button size="sm" variant="outline" onClick={copy}>
          Copy
        </Button>
      </div>
    </div>
  )
}
