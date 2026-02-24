import type { Metadata } from "next"
import SiteHeader from "@/components/site-header"
import { StudentRegisterForm } from "@/components/student-register-form"
import { GraduationCap, Sparkles, BookOpen } from "lucide-react"
import Link from "next/link"
import { getAvailableTeachers } from "@/server/teacher-list-actions"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
    title: "Create Your Account - Join YourPlatform",
    description: "Create your free student account and start your learning journey with YourPlatform",
}

export default async function RegisterPage() {
    const teachers = await getAvailableTeachers()

    return (
        <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950 dark:via-zinc-950 dark:to-teal-950">
            <SiteHeader />

            <div className="container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">

                    {/* Left Side - Welcome Content */}
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                            <Sparkles className="h-4 w-4" />
                            <span>Join thousands of students</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                            Start Your Learning Journey Today
                        </h1>

                        <p className="text-lg text-muted-foreground">
                            Create your free account in minutes and unlock access to interactive courses, live sessions, and personalized learning experiences.
                        </p>

                        <div className="space-y-4 pt-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
                                    <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Expert Teachers</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Learn from qualified and experienced educators
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
                                    <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Interactive Content</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Engage with videos, quizzes, and live sessions
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
                                    <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Track Your Progress</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Monitor your achievements and growth over time
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Registration Form */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
                            <p className="text-muted-foreground">
                                Fill in your details to get started
                            </p>
                        </div>

                        <StudentRegisterForm teachers={teachers} />

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                                    Sign in here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
