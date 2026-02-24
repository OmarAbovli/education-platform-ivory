"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function PaymobCompletePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // The claim token is passed back from paymob as merchant_order_id
    const claim = params.get('merchant_order_id') || params.get('claim')
    if (!claim) {
      setError('Missing claim token (merchant_order_id)')
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const res = await fetch('/api/purchases/complete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ claim }),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || 'Complete failed')
        if (j.redirect) {
          router.push(j.redirect)
        } else {
          // Fallback or show success message
          router.push('/student')
        }
      } catch (err: any) {
        setError(err?.message || String(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  return (
    <main className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-4">جارٍ إكمال الدفع</h1>
      {loading && <p>الرجاء الانتظار...</p>}
      {error && <p className="text-red-600">{error}</p>}
    </main>
  )
}
