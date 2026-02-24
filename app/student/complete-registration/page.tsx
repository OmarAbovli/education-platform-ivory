"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CompleteRegistrationPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [grade, setGrade] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/users/set-credentials', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password, grade }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed')
      // On success go to student dashboard
      router.push('/student')
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">أكمل إنشاء حسابك</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm">اسم المستخدم</label>
          <input className="w-full mt-1 p-2 border rounded" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm">كلمة المرور</label>
          <input type="password" className="w-full mt-1 p-2 border rounded" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm">الصف</label>
          <select value={String(grade)} onChange={(e) => setGrade(Number(e.target.value))} className="w-full mt-1 p-2 border rounded">
            <option value={1}>الصف الاول</option>
            <option value={2}>الصف الثاني</option>
            <option value={3}>الصف الثالث</option>
            <option value={4}>الصف الرابع</option>
            <option value={5}>الصف الخامس</option>
            <option value={6}>الصف السادس</option>
          </select>
        </div>
        <div>
          <button className="px-4 py-2 bg-green-600 text-white rounded" disabled={loading}>{loading ? 'جارٍ الحفظ...' : 'أكمل التسجيل'}</button>
        </div>
        {error && <div className="text-red-600">{error}</div>}
      </form>
    </main>
  )
}
