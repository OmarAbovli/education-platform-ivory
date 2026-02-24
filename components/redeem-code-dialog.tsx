"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Ticket, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { redeemPackageCode } from "@/server/package-code-actions"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-provider"

export default function RedeemCodeDialog({ triggerVariant = "outline", size = "default", className }: { triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link", size?: "default" | "sm" | "lg" | "icon", className?: string }) {
    const { user } = useAuth()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [code, setCode] = useState("")
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{
        success: boolean
        message: string
        packageName?: string
    } | null>(null)

    if (!user) return null

    const handleCodeChange = (value: string) => {
        let formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "")
        if (formatted.length > 4) formatted = formatted.slice(0, 4) + "-" + formatted.slice(4)
        if (formatted.length > 9) formatted = formatted.slice(0, 9) + "-" + formatted.slice(9)
        if (formatted.length > 14) formatted = formatted.slice(0, 14) + "-" + formatted.slice(14)
        if (formatted.length > 19) formatted = formatted.slice(0, 19)
        setCode(formatted)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code || code.length < 19) {
            toast.error("الرجاء إدخال كود صحيح")
            return
        }

        startTransition(async () => {
            try {
                const response = await redeemPackageCode(code)
                if (response.success) {
                    setResult({ success: true, message: `تم تفعيل الباقة بنجاح! 🎉`, packageName: response.packageName })
                    toast.success(`تم فتح ${response.packageName} بنجاح!`)
                    setTimeout(() => {
                        setOpen(false)
                        setCode("")
                        setResult(null)
                        router.refresh() // Refresh page
                    }, 2000)
                } else {
                    let errorMessage = "فشل في تفعيل الكود"
                    switch (response.error) {
                        case "INVALID_CODE": errorMessage = "الكود غير صحيح"; break
                        case "ALREADY_USED": errorMessage = "هذا الكود تم استخدامه من قبل"; break
                        case "WRONG_GRADE": errorMessage = "هذا الكود ليس للصف الدراسي الخاص بك"; break
                        case "ALREADY_HAVE_PACKAGE": errorMessage = "لديك هذه الباقة بالفعل"; break
                        case "EXPIRED": errorMessage = "هذا الكود منتهي الصلاحية"; break
                    }
                    setResult({ success: false, message: errorMessage })
                    toast.error(errorMessage)
                }
            } catch (error) {
                setResult({ success: false, message: "حدث خطأ أثناء تفعيل الكود" })
                toast.error("حدث خطأ أثناء تفعيل الكود")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => !isPending && setOpen(newOpen)}>
            <DialogTrigger asChild>
                <Button variant={triggerVariant} size={size} className={className ? className + " gap-2" : "gap-2"}>
                    <Ticket className="h-4 w-4" />
                    {size === "icon" ? "" : "Use Code"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-emerald-500" />
                        استخدام كود الباقة
                    </DialogTitle>
                    <DialogDescription>أدخل الكود الذي حصلت عليه لفتح الباقة</DialogDescription>
                </DialogHeader>
                {result ? (
                    <div className="py-6 text-center">
                        {result.success ? (
                            <>
                                <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
                                <h3 className="mt-4 text-lg font-semibold text-emerald-700 dark:text-emerald-300">{result.message}</h3>
                                {result.packageName && <p className="mt-2 text-sm text-muted-foreground">الباقة: {result.packageName}</p>}
                                <p className="mt-4 text-sm text-muted-foreground">جاري التحديث...</p>
                            </>
                        ) : (
                            <>
                                <XCircle className="mx-auto h-16 w-16 text-red-500" />
                                <h3 className="mt-4 text-lg font-semibold text-red-700 dark:text-red-300">{result.message}</h3>
                                <Button onClick={() => setResult(null)} className="mt-6" variant="outline">حاول مرة أخرى</Button>
                            </>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">كود الباقة</Label>
                            <Input
                                id="code"
                                value={code}
                                onChange={(e) => handleCodeChange(e.target.value)}
                                placeholder="COMP-XXXX-XXXX-XXXX"
                                className="text-center font-mono text-lg tracking-wider"
                                maxLength={19}
                                disabled={isPending}
                            />
                            <p className="text-xs text-muted-foreground">الكود بصيغة: COMP-XXXX-XXXX-XXXX</p>
                        </div>
                        <Button type="submit" className="w-full" disabled={isPending || code.length < 19}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    جاري التفعيل...
                                </>
                            ) : (
                                "تفعيل الكود"
                            )}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
