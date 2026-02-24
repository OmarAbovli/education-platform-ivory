import { getCurrentUser } from "../../../../lib/auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import SiteHeader from "../../../../components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { ArrowRight, Plus, Ticket } from "lucide-react"
import Link from "next/link"
import { getCodeStatistics, getTeacherCodes } from "../../../../server/package-code-actions"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../../components/ui/table"
import { Badge } from "../../../../components/ui/badge"

export const metadata = {
    title: "إدارة أكواد الباقات | YourPlatform",
    description: "إدارة وتوليد أكواد الوصول للباقات التعليمية",
}

export default async function TeacherCodesPage() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
        redirect("/login")
    }

    // Get codes and statistics
    const [codesResult, statsResult] = await Promise.all([
        getTeacherCodes({ includeUsed: true }),
        getCodeStatistics(),
    ])

    const codes = codesResult.success ? codesResult.codes || [] : []
    const stats = statsResult.success ? statsResult.stats : null

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />
            <main className="container mx-auto max-w-7xl px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <Ticket className="h-8 w-8 text-emerald-500" />
                            إدارة أكواد الباقات
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            قم بتوليد وإدارة أكواد الوصول للباقات التعليمية
                        </p>
                    </div>
                    <Link href="/teacher/codes/generate">
                        <Button size="lg" className="gap-2">
                            <Plus className="h-5 w-5" />
                            توليد أكواد جديدة
                        </Button>
                    </Link>
                </div>

                {/* Statistics */}
                {stats && (
                    <div className="mb-8 grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    إجمالي الأكواد
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    المستخدمة
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">{stats.used}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    غير المستخدمة
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{stats.unused}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    المنتهية
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-600">{stats.expired}</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Codes Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>جميع الأكواد</CardTitle>
                        <CardDescription>
                            عرض جميع الأكواد المولدة مع حالة كل كود
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {codes.length === 0 ? (
                            <div className="py-12 text-center">
                                <Ticket className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                                <p className="mt-4 text-muted-foreground">
                                    لم يتم توليد أي أكواد بعد
                                </p>
                                <Link href="/teacher/codes/generate">
                                    <Button className="mt-4">
                                        <Plus className="mr-2 h-4 w-4" />
                                        توليد أكواد جديدة
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الكود</TableHead>
                                            <TableHead>الباقة</TableHead>
                                            <TableHead>الصف</TableHead>
                                            <TableHead>الحالة</TableHead>
                                            <TableHead>استخدمه</TableHead>
                                            <TableHead>تاريخ الإنشاء</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {codes.map((code) => (
                                            <TableRow key={code.id}>
                                                <TableCell>
                                                    <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                                                        {code.code}
                                                    </code>
                                                </TableCell>
                                                <TableCell className="font-medium">{code.packageName}</TableCell>
                                                <TableCell>الصف {code.grade}</TableCell>
                                                <TableCell>
                                                    {code.isUsed ? (
                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                                            مستخدم
                                                        </Badge>
                                                    ) : code.expiresAt && new Date(code.expiresAt) < new Date() ? (
                                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                                            منتهي
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                            متاح
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {code.isUsed && code.usedByStudentName ? (
                                                        <div>
                                                            <div className="font-medium text-foreground">
                                                                {code.usedByStudentName}
                                                            </div>
                                                            <div className="text-xs">
                                                                {new Date(code.usedAt!).toLocaleDateString("ar-EG")}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(code.createdAt).toLocaleDateString("ar-EG")}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
