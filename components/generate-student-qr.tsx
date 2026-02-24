"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type QrResponse = {
  ok: boolean
  qrDataUrl?: string
  loginUrl?: string
  error?: string
}

export function GenerateStudentQr() {
  const [studentId, setStudentId] = useState("")
  const [qr, setQr] = useState<QrResponse | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setQr(null)
    try {
      const res = await fetch("/api/qr-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId }),
      })
      const data: QrResponse = await res.json()
      setQr(data)
    } catch (e) {
      setQr({ ok: false, error: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="student-id">Student ID</Label>
        <Input
          id="student-id"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="st_123..."
        />
      </div>
      <Button onClick={handleGenerate} disabled={loading || !studentId}>
        {loading ? "Generating..." : "Generate QR"}
      </Button>

      {qr && (
        <div className="grid gap-2">
          {!qr.ok ? (
            <p className="text-sm text-red-600">{qr.error}</p>
          ) : (
            <>
              {qr.qrDataUrl ? (
                <img src={qr.qrDataUrl || "/placeholder.svg"} alt="Student login QR code" className="w-48 h-48" />
              ) : null}
              {qr.loginUrl ? <p className="text-xs text-muted-foreground break-all">URL: {qr.loginUrl}</p> : null}
            </>
          )}
        </div>
      )}
    </div>
  )
}
