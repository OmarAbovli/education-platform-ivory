"use client"

import { useState } from "react"
import GenerateCodesForm from "../../../../../components/generate-codes-form"
import CodeCardPrintable from "../../../../../components/code-card-printable"
import { Button } from "../../../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card"
import { ArrowLeft, Printer } from "lucide-react"
import Link from "next/link"

export default function GenerateCodesClientPage({
    packages,
}: {
    packages: Array<{ id: string; name: string; grades: number[] | null }>
}) {
    const [generatedCodes, setGeneratedCodes] = useState<
        Array<{ id: string; code: string; packageId: string; grade: number }>
    >([])

    const selectedPackage = generatedCodes.length > 0
        ? packages.find((p) => p.id === generatedCodes[0].packageId)
        : null

    const handlePrint = () => {
        window.print()
    }

    return (
        <main className="container mx-auto max-w-7xl px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/teacher/codes">
                    <Button variant="ghost" className="mb-4 gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        رجوع إلى إدارة الأكواد
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold">توليد أكواد جديدة</h1>
                <p className="mt-2 text-muted-foreground">
                    قم بتوليد أكواد وصول للباقات وطباعتها أو تحميلها
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Form */}
                <div className="print:hidden">
                    <GenerateCodesForm
                        packages={packages}
                        onCodesGenerated={(codes) => setGeneratedCodes(codes)}
                    />
                </div>

                {/* Generated Codes Display */}
                <div>
                    {generatedCodes.length > 0 ? (
                        <>
                            <div className="mb-4 flex items-center justify-between print:hidden">
                                <h2 className="text-xl font-semibold">
                                    الأكواد المولدة ({generatedCodes.length})
                                </h2>
                                <Button onClick={handlePrint} className="gap-2">
                                    <Printer className="h-4 w-4" />
                                    طباعة
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {generatedCodes.map((code) => (
                                    <CodeCardPrintable
                                        key={code.id}
                                        code={code.code}
                                        packageName={selectedPackage?.name || "باقة"}
                                        grade={code.grade}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>معاينة الأكواد</CardTitle>
                                <CardDescription>
                                    ستظهر الأكواد المولدة هنا بعد توليدها
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                املأ النموذج واضغط &quot;توليد الأكواد&quot; لرؤية الأكواد هنا
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
        </main>
    )
}
