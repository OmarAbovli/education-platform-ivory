"use client"

import { useState, useTransition } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createBulkStudents } from "@/server/teacher-actions"
import { useToast } from "@/hooks/use-toast"
import type { StudentClassification } from "@/server/teacher-actions"
import type { VideoPackage } from "@/server/package-actions"
import { StudentCardsPrintable } from "./student-cards-printable"

type BulkStudentData = {
    id: string
    name: string
    username: string
    password: string
    qrToken: string
}

export function BulkStudentForm({ packages }: { packages: VideoPackage[] }) {
    const [names, setNames] = useState("")
    const [phone, setPhone] = useState("")
    const [guardianPhone, setGuardianPhone] = useState("")
    const [grade, setGrade] = useState<number | null>(null)
    const [classification, setClassification] = useState<StudentClassification>("center")
    const [packageIds, setPackageIds] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const [generatedStudents, setGeneratedStudents] = useState<BulkStudentData[]>([])

    function togglePackage(id: string) {
        setPackageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!grade) return

        const nameArray = names.split("\n").map(n => n.trim()).filter(Boolean)

        if (nameArray.length === 0) {
            toast({
                title: "Error",
                description: "Please enter at least one student name",
                variant: "destructive"
            })
            return
        }

        if (nameArray.length > 50) {
            toast({
                title: "Error",
                description: "Maximum 50 students per batch",
                variant: "destructive"
            })
            return
        }

        startTransition(async () => {
            const res = await createBulkStudents({
                names: nameArray,
                phone,
                guardianPhone,
                grade,
                classification,
                packageIds
            })

            if (res.ok) {
                toast({
                    title: "Success!",
                    description: `Created ${res.students.length} students successfully`
                })
                setGeneratedStudents(res.students)

                // Reset form
                setNames("")
                setPhone("")
                setGuardianPhone("")
                setGrade(null)
                setClassification("center")
                setPackageIds([])
            } else {
                toast({
                    title: "Error",
                    description: res.error ?? "Failed to create students",
                    variant: "destructive"
                })
            }
        })
    }

    // If students are generated, show the cards
    if (generatedStudents.length > 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Generated Student Cards</h2>
                    <Button
                        variant="outline"
                        onClick={() => setGeneratedStudents([])}
                    >
                        Create More Students
                    </Button>
                </div>
                <StudentCardsPrintable
                    students={generatedStudents}
                    packages={packages.filter(p => packageIds.includes(p.id))}
                    grade={grade!}
                />
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
                <Label htmlFor="names">Student Names (one per line)</Label>
                <Textarea
                    id="names"
                    value={names}
                    onChange={(e) => setNames(e.target.value)}
                    placeholder={"أحمد محمد\nفاطمة علي\nعمر حسن"}
                    rows={8}
                    required
                    className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                    Enter each student name on a new line. Maximum 50 students.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="phone">Student Phone</Label>
                    <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+20 1234567890"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="guardian-phone">Guardian Phone</Label>
                    <Input
                        id="guardian-phone"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="+20 1234567890"
                        required
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select value={grade?.toString() ?? ""} onValueChange={(v) => setGrade(Number.parseInt(v))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">First year</SelectItem>
                            <SelectItem value="2">Second year</SelectItem>
                            <SelectItem value="3">Third year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Classification</Label>
                    <Select value={classification} onValueChange={(v) => setClassification(v as StudentClassification)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Assign Packages</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {packages.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={packageIds.includes(p.id)}
                                onCheckedChange={() => togglePackage(p.id)}
                            />
                            <span>{p.name}</span>
                        </label>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    Optional: Select packages to grant access to all students.
                </p>
            </div>

            <Button disabled={isPending || !grade} type="submit" className="w-full sm:w-auto">
                {isPending ? "Creating..." : "Generate Student Cards"}
            </Button>
        </form>
    )
}
