"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import QRCode from "qrcode"
import type { VideoPackage } from "@/server/package-actions"

type Student = {
    id: string
    name: string
    username: string
    password: string
    qrToken: string
}

type StudentCardsPrintableProps = {
    students: Student[]
    packages: VideoPackage[]
    grade: number
}

export function StudentCardsPrintable({ students, packages, grade }: StudentCardsPrintableProps) {
    const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
    const cardsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Generate QR codes for all students
        async function generateQRCodes() {
            const codes: Record<string, string> = {}

            for (const student of students) {
                const loginUrl = `${window.location.origin}/qr-login?token=${student.qrToken}`
                try {
                    const qrDataUrl = await QRCode.toDataURL(loginUrl, {
                        width: 200,
                        margin: 1,
                        color: {
                            dark: "#000000",
                            light: "#FFFFFF"
                        }
                    })
                    codes[student.id] = qrDataUrl
                } catch (error) {
                    console.error("Error generating QR code for", student.id, error)
                }
            }

            setQrCodes(codes)
        }

        generateQRCodes()
    }, [students])

    function handlePrint() {
        window.print()
    }

    function handleDownloadPDF() {
        // Use browser's print dialog with "Save as PDF" option
        window.print()
    }

    const gradeNames = {
        1: "First Year",
        2: "Second Year",
        3: "Third Year"
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 print:hidden">
                <Button onClick={handlePrint}>
                    Print Cards
                </Button>
                <Button onClick={handleDownloadPDF} variant="outline">
                    Save as PDF
                </Button>
            </div>

            <div ref={cardsRef} className="space-y-4">
                {students.map((student, index) => (
                    <div
                        key={student.id}
                        className="student-card border-2 border-gray-800 rounded-lg p-6 bg-white print:break-after-page print:border-black"
                        style={{
                            width: "100%",
                            maxWidth: "400px",
                            margin: "0 auto"
                        }}
                    >
                        {/* Header */}
                        <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Student Access Card</h2>
                            <p className="text-sm text-gray-600">Grade: {gradeNames[grade as keyof typeof gradeNames]}</p>
                        </div>

                        {/* Student Info */}
                        <div className="space-y-3 mb-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Student Name</p>
                                <p className="text-lg font-bold text-gray-900">{student.name}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Student ID</p>
                                    <p className="text-sm font-mono font-semibold text-gray-900 break-all">
                                        {student.id}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Username</p>
                                    <p className="text-sm font-mono font-semibold text-gray-900 break-all">
                                        {student.username}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 uppercase">Password</p>
                                <p className="text-lg font-mono font-bold text-gray-900 tracking-wider">
                                    {student.password}
                                </p>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="border-t-2 border-gray-300 pt-4">
                            <div className="flex flex-col items-center">
                                {qrCodes[student.id] ? (
                                    <img
                                        src={qrCodes[student.id]}
                                        alt={`QR Code for ${student.name}`}
                                        className="w-32 h-32"
                                    />
                                ) : (
                                    <div className="w-32 h-32 bg-gray-200 animate-pulse rounded" />
                                )}
                                <p className="text-xs text-gray-600 mt-2 text-center">
                                    Scan to login (one-time use)
                                </p>
                            </div>
                        </div>

                        {/* Package Access */}
                        {packages.length > 0 && (
                            <div className="border-t-2 border-gray-300 pt-4 mt-4">
                                <p className="text-xs text-gray-500 uppercase mb-2">Package Access</p>
                                <ul className="text-sm space-y-1">
                                    {packages.map((pkg) => (
                                        <li key={pkg.id} className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                                            <span className="text-gray-900">{pkg.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="border-t-2 border-gray-300 pt-3 mt-4">
                            <p className="text-xs text-gray-500 text-center">
                                Keep this card safe • Do not share your credentials
                            </p>
                        </div>

                        {/* Card number for printing (hidden on screen) */}
                        <div className="print:block hidden text-center text-xs text-gray-400 mt-2">
                            Card {index + 1} of {students.length}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
        @media print {
          @page {
            size: A5;
            margin: 1cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .student-card {
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          .student-card:last-child {
            page-break-after: auto;
          }
          
          /* Hide non-printable elements */
          nav, header, footer, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
        </div>
    )
}
