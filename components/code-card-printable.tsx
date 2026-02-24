"use client"

import { Card } from "./ui/card"
import { Ticket } from "lucide-react"

type CodeCardPrintableProps = {
    code: string
    packageName: string
    grade: number
    expiresAt?: string
}

export default function CodeCardPrintable({
    code,
    packageName,
    grade,
    expiresAt,
}: CodeCardPrintableProps) {
    // URL للطالب لاستخدام الكود مباشرة
    const redeemUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/student/packages?code=${code}`

    return (
        <Card className="relative overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950 dark:via-gray-900 dark:to-teal-950 print:border-emerald-600 print:break-inside-avoid">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, #10b981 0, #10b981 1px, transparent 0, transparent 50%)`,
                    backgroundSize: '10px 10px'
                }} />
            </div>

            <div className="relative p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-emerald-500 p-2">
                            <Ticket className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-emerald-900 dark:text-emerald-100">
                                YourPlatform
                            </h3>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                Package Access Code
                            </p>
                        </div>
                    </div>
                    {expiresAt && (
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">صالح حتى</p>
                            <p className="text-sm font-medium">
                                {new Date(expiresAt).toLocaleDateString("ar-EG")}
                            </p>
                        </div>
                    )}
                </div>

                {/* Package Info */}
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">الباقة:</p>
                    <h4 className="text-lg font-bold text-foreground">{packageName}</h4>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        الصف {grade === 1 ? "الأول" : grade === 2 ? "الثاني" : "الثالث"} الثانوي
                    </p>
                </div>

                {/* Code Display */}
                <div className="rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-white/50 dark:bg-gray-950/50 p-4">
                    <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
                        كود التفعيل:
                    </p>
                    <div className="mb-4 rounded-md bg-emerald-100 dark:bg-emerald-900/30 p-3">
                        <p className="text-center font-mono text-2xl font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                            {code}
                        </p>
                    </div>
                    <ol className="space-y-1 text-right text-xs text-emerald-700 dark:text-emerald-300">
                        <li>١. سجل دخول إلى حسابك على YourPlatform</li>
                        <li>٢. اذهب إلى صفحة الباقات</li>
                        <li>٣. اضغط على "Use Code" واكتب الكود أعلاه</li>
                        <li>٤. استمتع بمحتوى الباقة! 🎉</li>
                    </ol>
                </div>

                {/* Footer */}
                <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3 text-center">
                    <p className="text-xs text-muted-foreground">
                        يمكن استخدام هذا الكود مرة واحدة فقط
                    </p>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        www.yourplatform.com
                    </p>
                </div>
            </div>

            {/* Corner Decoration */}
            <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/10" style={{
                clipPath: 'polygon(100% 0, 0 0, 100% 100%)'
            }} />
            <div className="absolute bottom-0 left-0 h-20 w-20 bg-emerald-500/10" style={{
                clipPath: 'polygon(0 100%, 100% 100%, 0 0)'
            }} />
        </Card>
    )
}
