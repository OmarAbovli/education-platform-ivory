"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import PhotoCard from "@/components/photo-card"
import { TypewriterText } from "@/components/typewriter-text"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, GraduationCap, Quote, LayoutGrid, Camera, Sparkles } from "lucide-react"
import TeacherPhotoUpload from "@/components/teacher-photo-upload"
import PackageCardPro from "@/components/package-card-pro"

export function TeacherProfileView({
    teacher,
    packages,
    photos,
    me
}: {
    teacher: any,
    packages: any[],
    photos: any[],
    me: any
}) {
    const isOwner = !!me && me.role === "teacher" && me.id === teacher.id
    const primary = teacher.theme_primary || "#10b981"
    const secondary = teacher.theme_secondary || "#14b8a6"

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-emerald-500/30 pb-20">
            {/* Premium Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
                {/* Animated Background Gradients */}
                <div className="absolute inset-0 z-0">
                    <div
                        className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full blur-[120px] opacity-20"
                        style={{ background: primary }}
                    />
                    <div
                        className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full blur-[120px] opacity-20"
                        style={{ background: secondary }}
                    />
                </div>

                <div className="container relative z-10 mx-auto max-w-6xl px-4">
                    <div className="flex flex-col items-center gap-12 text-center md:flex-row md:items-start md:text-left">
                        {/* Avatar with glow effect */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                        >
                            <div
                                className="absolute inset-x-0 bottom-0 h-2/3 w-full blur-2xl opacity-50"
                                style={{ background: primary }}
                            />
                            <div className="relative h-48 w-48 overflow-hidden rounded-2xl border-4 border-white/10 shadow-2xl md:h-56 md:w-56">
                                <img
                                    src={teacher.avatar_url || "/teatcher.jpg"}
                                    alt={teacher.name}
                                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex-1 space-y-6"
                        >
                            <div className="space-y-2">
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 backdrop-blur-sm">
                                    <GraduationCap className="mr-1 h-3 w-3" /> Expert Teacher
                                </Badge>
                                <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50">
                                    {teacher.name}
                                </h1>
                                <p className="text-xl font-medium text-emerald-400">{teacher.subject ?? "General English Specialist"}</p>
                            </div>

                            <p className="text-lg leading-relaxed text-slate-400 max-w-3xl">
                                {teacher.bio || "With decades of experience in educational excellence, I am dedicated to providing a transformative learning experience that empowers students to master the English language with confidence and style."}
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start pt-4">
                                {teacher.phone && (
                                    <a
                                        href={`https://wa.me/${String(teacher.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                            "Hello, I want to join YourPlatform. Can you create my student account?")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Button
                                            size="lg"
                                            className="h-12 rounded-full bg-emerald-600 px-8 font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/40"
                                        >
                                            <MessageCircle className="mr-2 h-5 w-5" /> Start Your Journey
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Philosophy & Slogans Section */}
            <section className="relative bg-slate-900/50 py-24 backdrop-blur-md">
                <div className="container mx-auto max-w-6xl px-4">
                    <div className="grid gap-16 md:grid-cols-2 lg:items-center">
                        <div className="space-y-8">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                                <Quote className="h-6 w-6" />
                            </div>
                            <h2 className="text-3xl font-bold md:text-4xl text-white">Educational Philosophy</h2>
                            <TypewriterText
                                text="I believe in making education a seamless part of your life. My platform is designed to save you time, enhance your focus, and provide a personalized learning experience that adapts to your pace."
                                className="text-xl leading-relaxed text-slate-400 italic"
                            />
                        </div>

                        <div className="grid gap-6">
                            {[
                                { title: "Efficiency", desc: "Time-saving, focus-boosting strategies for modern students." },
                                { title: "Commitment", desc: "Your success is not just a goal; it's our shared mission." },
                                { title: "Simplicity", desc: "Complex English concepts, beautifully simplified." }
                            ].map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ y: -5 }}
                                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Sparkles className="h-8 w-8 text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-emerald-400">{item.title}</h3>
                                    <p className="mt-2 text-slate-400">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Courses Section */}
            <section className="py-24">
                <div className="container mx-auto max-w-6xl px-4">
                    <div className="mb-12 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
                        <div className="space-y-2 text-center sm:text-left">
                            <h2 className="text-3xl font-bold text-white inline-flex items-center gap-3">
                                <LayoutGrid className="h-8 w-8 text-emerald-500" /> Learning Packages
                            </h2>
                            <p className="text-slate-400">Carefully curated curricula for every student level.</p>
                        </div>
                    </div>

                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {packages.map((pkg: any) => (
                            <PackageCardPro
                                key={pkg.id}
                                id={pkg.id}
                                name={pkg.name}
                                description={pkg.description}
                                price={pkg.price}
                                thumbnail_url={pkg.thumbnail_url}
                                grades={pkg.grades}
                                teacherId={teacher.id}
                            />
                        ))}
                        {packages.length === 0 && (
                            <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">
                                New learning experiences are being crafted. Check back soon.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Gallery Section */}
            <section className="bg-slate-900/30 py-24 border-t border-white/5">
                <div className="container mx-auto max-w-6xl px-4">
                    <div className="mb-12 flex flex-col items-center justify-between gap-6 sm:flex-row">
                        <div className="space-y-2 text-center sm:text-left">
                            <h2 className="text-3xl font-bold text-white inline-flex items-center gap-3">
                                <Camera className="h-8 w-8 text-emerald-500" /> Life at YourPlatform
                            </h2>
                            <p className="text-slate-400">Moments from our interactive classes and events.</p>
                        </div>
                        {isOwner && <TeacherPhotoUpload />}
                    </div>

                    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 space-y-6">
                        {photos.map((p: any) => (
                            <div key={p.id} className="break-inside-avoid">
                                <PhotoCard
                                    id={p.id}
                                    url={p.url}
                                    caption={p.caption}
                                    likeCount={p.like_count || 0}
                                    commentCount={p.comment_count || 0}
                                    likedByMe={p.liked_by_me || false}
                                    teacherId={teacher.id}
                                    teacherName={teacher.name}
                                    teacherAvatarUrl={teacher.avatar_url}
                                    isTeacher={isOwner}
                                    currentUserId={me?.id}
                                />
                            </div>
                        ))}
                    </div>
                    {photos.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">
                            The gallery is empty, but our classes are full of life.
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
