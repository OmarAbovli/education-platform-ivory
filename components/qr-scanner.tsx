"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function QRScanner() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerDivRef = useRef<HTMLDivElement>(null)

  const startScanning = async () => {
    if (!scannerDivRef.current) return

    try {
      setError(null)
      setScanning(true)

      const scanner = new Html5Qrcode("qr-scanner-div")
      scannerRef.current = scanner

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      }

      const onScanSuccess = (decodedText: string) => {
        // Check if it's a valid QR login URL (supports new /qr-login and old /login?qr=)
        if (decodedText.includes('/qr-login') || decodedText.includes('token=') || decodedText.includes('qr=')) {
          // Extract token from URL
          let token = ''
          try {
            const url = new URL(decodedText)
            token = url.searchParams.get('token') || url.searchParams.get('qr') || ''
          } catch {
            // If not a full URL, assume it's just the token
            token = decodedText
          }

          if (token) {
            // Stop scanner and redirect
            stopScanning()
            window.location.href = `/qr-login?token=${token}`
          }
        } else {
          setError('QR code غير صالح. يرجى مسح QR code الخاص بتسجيل الدخول')
        }
      }

      const onScanFailure = (errorMessage: string) => {
        // Ignore scan errors during normal operation
        console.debug('QR scan error:', errorMessage)
      }

      try {
        // Try back camera first
        await scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
      } catch (err) {
        console.warn('Back camera failed, trying front camera/any available...', err)
        // Fallback to any available camera or front camera
        try {
          await scanner.start({ facingMode: "user" }, config, onScanSuccess, onScanFailure)
        } catch (retryErr: any) {
          console.error('All camera attempts failed', retryErr)
          if (retryErr.name === 'NotAllowedError') {
            setError('يرجى السماح باستخدام الكاميرا لمسح QR code')
          } else if (retryErr.name === 'NotFoundError') {
            setError('لم يتم العثور على كاميرا في جهازك')
          } else {
            setError('فشل في فتح الكاميرا (تأكد من إغلاق أي برنامج آخر يستخدم الكاميرا)')
          }
          setScanning(false)
        }
      }
    } catch (err: any) {
      console.error('Scanner init error:', err)
      setError('حدث خطأ غير متوقع في الماسح الضوئي')
      setScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    setScanning(false)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanning()
      }
    }
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto bg-white/5 dark:bg-black/20 border-white/10 dark:border-zinc-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          تسجيل الدخول بـ QR Code
        </CardTitle>
        <CardDescription>
          امسح الـ QR code الذي حصلت عليه من المدرس لتسجيل الدخول مباشرة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Scanner Container */}
        <div className="relative">
          <div
            id="qr-scanner-div"
            ref={scannerDivRef}
            className={`w-full aspect-square bg-black rounded-lg overflow-hidden ${scanning ? 'block' : 'hidden'
              }`}
          />

          {!scanning && (
            <div className="w-full aspect-square bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg flex items-center justify-center border-2 border-dashed border-emerald-500/30">
              <div className="text-center space-y-4">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  اضغط على زر "بدء المسح" لفتح الكاميرا
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!scanning ? (
            <Button onClick={startScanning} className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-500">
              <Camera className="h-4 w-4 mr-2" />
              بدء المسح
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="destructive" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              إيقاف
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>• تأكد من وجود إضاءة كافية</p>
          <p>• ضع الكاميرا بشكل مباشر على QR code</p>
          <p>• اقترب أو ابتعد قليلاً حتى يتم المسح</p>
        </div>
      </CardContent>
    </Card>
  )
}
