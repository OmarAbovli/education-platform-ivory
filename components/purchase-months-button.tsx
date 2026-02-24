'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function PurchaseMonthsButton({
  month,
  monthLabel,
  teacherId,
}: {
  month: number
  monthLabel: string
  teacherId: string
}) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/purchases/add-months", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ months: [month], teacherId }),
      })
      const j = await res.json()
      if (!res.ok || !j.iframeUrl) {
        throw new Error(j.error || "Failed to create payment link.")
      }
      // Redirect to Paymob to complete the purchase
      window.location.href = j.iframeUrl
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not initiate purchase. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? "Processing..." : `Purchase ${monthLabel}`}
    </Button>
  )
}
