import SiteHeader from "@/components/site-header"
import { QRScanner } from "@/components/qr-scanner"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function QRScannerPage() {
  return (
    <main>
      <SiteHeader />
      
      <section className="relative flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950 dark:via-zinc-950 dark:to-teal-950">
        <div className="mx-auto w-full max-w-6xl px-4 py-12">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                العودة لتسجيل الدخول العادي
              </Button>
            </Link>
          </div>

          {/* QR Scanner */}
          <QRScanner />

          {/* Info */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              إذا لم يكن لديك QR code، يمكنك{" "}
              <Link href="/login" className="underline hover:text-foreground">
                تسجيل الدخول بالطريقة العادية
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              أو{" "}
              <Link
                href="https://wa.me/201503860035"
                className="underline hover:text-foreground"
              >
                تواصل مع المدرس للحصول على QR code
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
