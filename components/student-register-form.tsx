"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { selfRegisterStudent } from "@/server/student-register-actions"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, UserPlus, Phone, User, Lock, GraduationCap } from "lucide-react"
import type { Teacher } from "@/server/teacher-list-actions"

export function StudentRegisterForm({ teachers }: { teachers: Teacher[] }) {
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [guardianPhone, setGuardianPhone] = useState("")
    const [grade, setGrade] = useState<number | null>(null)
    const [teacherId, setTeacherId] = useState<string>("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()
    const router = useRouter()

    // Show teacher selector only if multiple teachers
    const showTeacherSelector = teachers.length > 1

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!grade) return

        // Validate teacher selection if multiple teachers
        if (showTeacherSelector && !teacherId) {
            toast({
                title: "Teacher Required",
                description: "Please select your teacher",
                variant: "destructive"
            })
            return
        }

        startTransition(async () => {
            const res = await selfRegisterStudent({
                name,
                phone,
                guardianPhone,
                grade,
                username,
                password,
                teacherId: teacherId || undefined
            })

            if (res.ok) {
                toast({
                    title: "Welcome! 🎉",
                    description: `Account created successfully for ${res.username}`
                })

                // Redirect to student dashboard
                router.push("/student")
            } else {
                toast({
                    title: "Registration Failed",
                    description: res.error,
                    variant: "destructive"
                })
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                </Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أحمد محمد / Ahmed Mohamed"
                    required
                    disabled={isPending}
                />
            </div>

            {/* Phone */}
            <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Your Phone Number
                </Label>
                <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+20 1234567890"
                    required
                    disabled={isPending}
                />
            </div>

            {/* Guardian Phone */}
            <div className="space-y-2">
                <Label htmlFor="guardian-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Guardian Phone Number
                </Label>
                <Input
                    id="guardian-phone"
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="+20 1234567890"
                    required
                    disabled={isPending}
                />
            </div>

            {/* Grade */}
            <div className="space-y-2">
                <Label>Select Your Grade</Label>
                <Select value={grade?.toString() ?? ""} onValueChange={(v) => setGrade(Number.parseInt(v))} disabled={isPending}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choose your grade" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">First Year Secondary</SelectItem>
                        <SelectItem value="2">Second Year Secondary</SelectItem>
                        <SelectItem value="3">Third Year Secondary</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Teacher Selection - Only if multiple teachers */}
            {showTeacherSelector && (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Select Your Teacher
                    </Label>
                    <Select value={teacherId} onValueChange={setTeacherId} disabled={isPending}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose your teacher" />
                        </SelectTrigger>
                        <SelectContent>
                            {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                    {teacher.subject && ` - ${teacher.subject}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Select the teacher you want to learn from
                    </p>
                </div>
            )}

            {/* Username */}
            <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Choose a Username
                </Label>
                <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="ahmed123"
                    required
                    disabled={isPending}
                    minLength={3}
                />
                <p className="text-xs text-muted-foreground">
                    Lowercase letters, numbers, and underscores only
                </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Create a Password
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={isPending}
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    At least 6 characters
                </p>
            </div>

            <Button
                type="submit"
                className="w-full"
                disabled={isPending || !grade || (showTeacherSelector && !teacherId)}
                size="lg"
            >
                {isPending ? (
                    "Creating your account..."
                ) : (
                    <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Create My Account
                    </>
                )}
            </Button>
        </form>
    )
}
