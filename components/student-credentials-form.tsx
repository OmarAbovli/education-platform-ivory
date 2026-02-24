"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { updateMyCredentials } from "@/server/student-actions"
import { Loader2 } from "lucide-react"

export function StudentCredentialsForm({ currentUsername }: { currentUsername?: string }) {
    const { toast } = useToast()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [username, setUsername] = useState(currentUsername ?? "")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (password && password !== confirmPassword) {
            toast({
                title: "خطأ",
                description: "كلمات المرور غير متطابقة",
                variant: "destructive"
            })
            return
        }

        startTransition(async () => {
            const res = await updateMyCredentials(username, password || undefined)

            if (res.ok) {
                toast({
                    title: "تم بنجاح",
                    description: "تم تحديث بيانات الدخول بنجاح",
                })
                setPassword("")
                setConfirmPassword("")
                router.refresh()
            } else {
                toast({
                    title: "خطأ",
                    description: res.error ?? "حدث خطأ أثناء التحديث",
                    variant: "destructive"
                })
            }
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>بيانات تسجيل الدخول</CardTitle>
                <CardDescription>
                    تحديث اسم المستخدم وكلمة المرور
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">اسم المستخدم</Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="اسم المستخدم"
                            required
                            minLength={3}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="password">كلمة المرور الجديدة (اختياري)</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="اتركها فارغة لعدم التغيير"
                                minLength={6}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="تأكيد كلمة المرور"
                                disabled={!password}
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        حفظ التغييرات
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
