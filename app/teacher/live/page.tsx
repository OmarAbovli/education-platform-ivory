"use client"

import { TeacherGoLive } from "@/components/teacher-go-live"
import { getTeacherCallHistory, getCallReport } from "@/server/livekit-actions"
import { getTeacherPackages, type VideoPackage } from "@/server/package-actions"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

// Professional SVG Icons
const Icons = {
    Live: () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>),
    History: () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>),
    Report: () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>),
    Users: () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
    Refresh: () => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>),
    Close: () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
}

export default function TeacherLivePage() {
    const [history, setHistory] = useState<any[]>([])
    const [packages, setPackages] = useState<VideoPackage[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedReport, setSelectedReport] = useState<any>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const [historyRes, packagesRes] = await Promise.all([
            getTeacherCallHistory(),
            getTeacherPackages()
        ])

        if (historyRes.success) {
            setHistory(historyRes.calls || [])
        }
        setPackages(packagesRes)
        setLoading(false)
    }

    async function viewReport(roomName: string) {
        const res = await getCallReport(roomName)
        if (res.success) {
            setSelectedReport(res.data)
        }
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-slate-100 font-sans dark" dir="rtl">
            <div className="max-w-7xl mx-auto p-8 space-y-12">

                {/* Header */}
                <header className="border-b border-slate-800 pb-6 flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <span className="text-indigo-500"><Icons.Live /></span>
                        إدارة البث المباشر
                    </h1>
                    <p className="text-slate-400 max-w-2xl">
                        ابدأ حصصك المباشرة وتابع تقارير الحضور والغياب بدقة.
                    </p>
                </header>

                {/* Create Session Card */}
                <section className="bg-[#121214] rounded-xl border border-slate-800 overflow-hidden shadow-2xl shadow-black/50">
                    <div className="bg-[#1c1c1f] px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            جلسة بث جديدة
                        </h2>
                        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest hidden sm:block">Live Session Control</span>
                    </div>
                    <div className="p-6">
                        {/* We enforce dark mode on children to ensure Inputs are visible */}
                        <div className="dark">
                            <TeacherGoLive packages={packages} />
                        </div>
                    </div>
                </section>

                {/* History Section */}
                <section className="space-y-6">
                    <div className="flex justify-between items-end">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Icons.History />
                            سجل الحصص السابقة
                        </h2>
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-md hover:bg-indigo-500/10"
                        >
                            <Icons.Refresh />
                            تحديث
                        </button>
                    </div>

                    <div className="bg-[#121214] rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500 animate-pulse">جاري تحميل البيانات...</div>
                        ) : history.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center gap-4">
                                <div className="p-4 bg-slate-900 rounded-full text-slate-600"><Icons.History /></div>
                                <p className="text-slate-500">لا توجد حصص مسجلة في الأرشيف حتى الآن.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-[#1c1c1f] text-slate-400 font-medium">
                                        <tr>
                                            <th className="p-4 whitespace-nowrap">عنوان / تاريخ الحصة</th>
                                            <th className="p-4 whitespace-nowrap">الفئة المستهدفة</th>
                                            <th className="p-4 whitespace-nowrap">المدة الزمنية</th>
                                            <th className="p-4 whitespace-nowrap">إحصائيات الحضور</th>
                                            <th className="p-4 whitespace-nowrap text-left">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {history.map((call) => {
                                            const duration = call.ended_at
                                                ? Math.round((new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 60000)
                                                : 0;

                                            return (
                                                <tr key={call.id} className="group hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-200">
                                                                {call.room_name.replace('ELHELAL-LIVE-', '')}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {format(new Date(call.started_at), "PPP", { locale: ar })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                                                            {call.grade ? `الصف ${call.grade}` : 'عام'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-400 font-mono">
                                                        {duration > 0 ? `${duration} دقيقة` : 'غير محدد'}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-emerald-400 font-bold">{call.participant_count}</span>
                                                            <span className="text-slate-600 text-xs">طالب</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-left">
                                                        <button
                                                            onClick={() => viewReport(call.room_name)}
                                                            className="text-indigo-400 hover:text-white hover:bg-indigo-600 px-3 py-1.5 rounded transition-all text-xs font-semibold border border-indigo-900/50 bg-indigo-500/10"
                                                        >
                                                            عرض التفاصيل
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Report Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="bg-[#121214] w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#1c1c1f]">
                            <div className="flex flex-col">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Icons.Report />
                                    تقرير الحصة التفصيلي
                                </h2>
                                <span className="text-xs text-slate-500 mt-1 font-mono">
                                    Room ID: {selectedReport.call.room_name}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-red-600/20 hover:border-red-600/50 border border-transparent rounded-lg transition-all"
                            >
                                <Icons.Close />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">

                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm font-medium mb-1">الحضور الفعلي</p>
                                        <p className="text-4xl font-bold text-emerald-400">{selectedReport.participants.length}</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Icons.Users />
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm font-medium mb-1">الغياب المسجل</p>
                                        <p className="text-4xl font-bold text-rose-400">{selectedReport.absentStudents.length}</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                        <Icons.Close />
                                    </div>
                                </div>
                            </div>

                            {/* Participants Table */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white border-l-4 border-emerald-500 pl-3">
                                    سجل الحضور والمشاركة
                                </h3>
                                <div className="border border-slate-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-slate-900 text-slate-400">
                                            <tr>
                                                <th className="p-4">الطالب</th>
                                                <th className="p-4">وقت الدخول</th>
                                                <th className="p-4">مدة التحدث</th>
                                                <th className="p-4">مرات رفع اليد</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 bg-[#0c0c0e]">
                                            {selectedReport.participants.length > 0 ? selectedReport.participants.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4 font-medium text-slate-200">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.role === 'teacher' ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-800 text-slate-300'}`}>
                                                                {p.name?.[0]}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span>{p.name}</span>
                                                                {p.role === 'teacher' && <span className="text-[10px] text-indigo-400">معلم (المضيف)</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-slate-400 font-mono">
                                                        {new Date(p.joined_at).toLocaleTimeString('ar-EG')}
                                                    </td>
                                                    <td className="p-4 font-mono">
                                                        <span className={p.speaking_duration_seconds > 0 ? "text-emerald-400" : "text-slate-600"}>
                                                            {p.speaking_duration_seconds || 0} ث
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono text-center">
                                                        <span className={p.hand_raise_count > 0 ? "text-amber-400" : "text-slate-600"}>
                                                            {p.hand_raise_count || 0}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={3} className="p-8 text-center text-slate-500">
                                                        لا يوجد حضور مسجل لهذه الجلسة.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Absent List */}
                            {selectedReport.absentStudents.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white border-l-4 border-rose-500 pl-3">
                                        قائمة الطلاب الغائبين
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {selectedReport.absentStudents.map((s: any) => (
                                            <div key={s.id} className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                                                <span className="text-rose-200 text-sm truncate">{s.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-800 bg-[#1c1c1f] flex justify-end">
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-white text-black font-semibold rounded-lg transition-colors"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
