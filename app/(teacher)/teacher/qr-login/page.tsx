import { getTeacherQrTokens } from "@/server/qr-actions"
import { QrManagementTable } from "@/components/qr-management-table"

export const dynamic = "force-dynamic"
import { Button } from "@/components/ui/button"
import { ArrowLeft, QrCode } from "lucide-react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default async function QrLoginPage() {
    const res = await getTeacherQrTokens()
    const tokens = res.ok ? res.tokens : []

    return (
        <main className="mx-auto max-w-6xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 transition-colors">
                        <Link href="/teacher">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold italic text-emerald-600 flex items-center gap-2">
                            <QrCode className="h-8 w-8" />
                            QR Codes Management
                        </h1>
                        <p className="text-muted-foreground">Track usage and manage student QR login access.</p>
                    </div>
                </div>
            </div>

            <Card className="border-emerald-500/10 shadow-xl shadow-emerald-500/5">
                <CardHeader>
                    <CardTitle>Usage Overview</CardTitle>
                    <CardDescription>
                        View all generated QR tokens, their current usage counts, and expiration dates.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <QrManagementTable initialTokens={tokens} />
                </CardContent>
            </Card>
        </main>
    )
}
