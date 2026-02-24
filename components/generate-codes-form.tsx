"use client"

import { useState, useTransition } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select"
import { generatePackageCodes } from "../server/package-code-actions"
import { Loader2, Ticket } from "lucide-react"
import { toast } from "sonner"

type Package = {
    id: string
    name: string
    grades: number[] | null
}

type GenerateCodesFormProps = {
    packages: Package[]
    onCodesGenerated: (codes: Array<{ id: string; code: string; packageId: string; grade: number }>) => void
}

export default function GenerateCodesForm({ packages, onCodesGenerated }: GenerateCodesFormProps) {
    const [isPending, startTransition] = useTransition()
    const [selectedPackageId, setSelectedPackageId] = useState<string>("")
    const [selectedGrade, setSelectedGrade] = useState<string>("")
    const [count, setCount] = useState<string>("10")
    const [expiresInDays, setExpiresInDays] = useState<string>("")

    const selectedPackage = packages.find((p) => p.id === selectedPackageId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedPackageId || !selectedGrade) {
            toast.error("الرجاء اختيار الباقة والصف")
            return
        }

        const codeCount = parseInt(count)
        if (isNaN(codeCount) || codeCount < 1 || codeCount > 100) {
            toast.error("عدد الأكواد يجب أن يكون بين 1 و 100")
            return
        }

        startTransition(async () => {
            try {
                const result = await generatePackageCodes({
                    packageId: selectedPackageId,
                    grade: parseInt(selectedGrade),
                    count: codeCount,
                    expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
                })

                if (result.success && result.codes) {
                    toast.success(`تم توليد ${result.codes.length} كود بنجاح!`)
                    onCodesGenerated(result.codes.map(c => ({
                        ...c,
                        packageId: selectedPackageId,
                        grade: parseInt(selectedGrade)
                    })))

                    // Reset form
                    setCount("10")
                    setExpiresInDays("")
                } else {
                    toast.error(result.error || "فشل في توليد الأكواد")
                }
            } catch (error) {
                toast.error("حدث خطأ أثناء توليد الأكواد")
                console.error(error)
            }
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    توليد أكواد جديدة
                </CardTitle>
                <CardDescription>
                    قم بتوليد أكواد لفتح الباقات للطلاب. يمكن لكل طالب استخدام كود واحد فقط لكل باقة.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Package Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="package">الباقة</Label>
                        <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                            <SelectTrigger id="package">
                                <SelectValue placeholder="اختر الباقة" />
                            </SelectTrigger>
                            <SelectContent>
                                {packages.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground">
                                        لا توجد باقات متاحة
                                    </div>
                                ) : (
                                    packages.map((pkg) => (
                                        <SelectItem key={pkg.id} value={pkg.id}>
                                            {pkg.name} {pkg.grades ? `- الصفوف: ${pkg.grades.join(', ')}` : ''}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Grade Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="grade">الصف الدراسي</Label>
                        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                            <SelectTrigger id="grade">
                                <SelectValue placeholder="اختر الصف" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">الصف الأول الثانوي</SelectItem>
                                <SelectItem value="2">الصف الثاني الثانوي</SelectItem>
                                <SelectItem value="3">الصف الثالث الثانوي</SelectItem>
                            </SelectContent>
                        </Select>
                        {selectedPackage && selectedGrade && selectedPackage.grades && !selectedPackage.grades.includes(parseInt(selectedGrade)) && (
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                ⚠️ تحذير: الباقة المختارة للصفوف {selectedPackage.grades.join(', ')} وأنت تولد أكواد للصف {selectedGrade}
                            </p>
                        )}
                    </div>

                    {/* Count */}
                    <div className="space-y-2">
                        <Label htmlFor="count">عدد الأكواد (1-100)</Label>
                        <Input
                            id="count"
                            type="number"
                            min="1"
                            max="100"
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            placeholder="10"
                        />
                    </div>

                    {/* Expiration (Optional) */}
                    <div className="space-y-2">
                        <Label htmlFor="expires">مدة الصلاحية (بالأيام) - اختياري</Label>
                        <Input
                            id="expires"
                            type="number"
                            min="1"
                            value={expiresInDays}
                            onChange={(e) => setExpiresInDays(e.target.value)}
                            placeholder="اتركه فارغاً للأكواد الدائمة"
                        />
                        <p className="text-xs text-muted-foreground">
                            إذا تركته فارغاً، ستكون الأكواد صالحة للأبد
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                جاري التوليد...
                            </>
                        ) : (
                            "توليد الأكواد"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
