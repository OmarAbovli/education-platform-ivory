"use client"

import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type CheckoutPackage = {
  id: string
  teacher_id: string
  name: string
  description: string | null
  price: number
  thumbnail_url: string | null
}

export default function PaymobCheckoutPage() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [parentPhone, setParentPhone] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [grade, setGrade] = useState<number | null>(null)
  const [teachers, setTeachers] = useState<any[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [packages, setPackages] = useState<CheckoutPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/teachers')
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.length === 0) {
          setError("No teachers found. Please contact support.")
          return
        }
        setTeachers(data)
        if (data.length === 1) {
          setTeacherId(data[0].id)
        }
      })
  }, [])

  // Load packages for selected teacher + grade
  useEffect(() => {
    if (!teacherId || !grade) {
      setPackages([])
      setSelectedPackageId(null)
      return
    }

    setPackagesLoading(true)
    fetch(`/api/packages?teacherId=${teacherId}&grade=${grade}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("failed_to_fetch_packages")))
      .then((data: CheckoutPackage[]) => {
        setPackages(data || [])
        setSelectedPackageId(data && data.length > 0 ? data[0].id : null)
      })
      .catch(() => {
        setPackages([])
        setSelectedPackageId(null)
      })
      .finally(() => setPackagesLoading(false))
  }, [teacherId, grade])

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  )

  const total = useMemo(() => {
    if (!selectedPackage) return 0
    // price is stored in cents
    return selectedPackage.price / 100
  }, [selectedPackage])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!teacherId) {
      setError("Please select a teacher.")
      return
    }
    if (!grade) return setError('الرجاء اختيار الصف الدراسي')
    if (!selectedPackageId) return setError('الرجاء اختيار الباكدج')
    setLoading(true)
    try {
      const res = await fetch('/api/purchases/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          parent_phone: parentPhone,
          username,
          password,
          grade,
          teacher_id: teacherId,
          student_type: 'online',
          packageId: selectedPackageId,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || JSON.stringify(j) || 'Create failed')

      if (j.iframeUrl) {
        // Redirect the user to the Paymob payment page
        window.location.href = j.iframeUrl
      } else {
        throw new Error('No iframe URL returned from server')
      }
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-900 shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2">احصل على حساب - الدفع</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">اختر الصف والمدرس ثم اختر الباكدج المناسبة لهذا الصف واضغط "ادفع الآن".</p>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">اسم الطالب</label>
              <input className="w-full mt-1 p-3 border rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">موبايل الطالب</label>
              <input className="w-full mt-1 p-3 border rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">موبايل ولي الأمر (اختياري)</label>
              <input className="w-full mt-1 p-3 border rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">اسم المستخدم</label>
              <input className="w-full mt-1 p-3 border rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">كلمة المرور</label>
              <input className="w-full mt-1 p-3 border rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
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
            {teachers.length > 1 && (
              <div>
                <Label>Teacher</Label>
                <Select value={teacherId?.toString() ?? ""} onValueChange={(v) => setTeacherId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedPackage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">سعر الباكدج المختارة</label>
                <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{total} EGP</div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">اختر الباكدج</label>
            {(!teacherId || !grade) && (
              <p className="text-sm text-gray-500">الرجاء اختيار الصف والمدرس أولاً لعرض الباكدجات المتاحة.</p>
            )}
            {teacherId && grade && packagesLoading && (
              <p className="text-sm text-gray-500">جاري تحميل الباكدجات المتاحة...</p>
            )}
            {teacherId && grade && !packagesLoading && packages.length === 0 && (
              <p className="text-sm text-gray-500">لا توجد باكدجات متاحة لهذا الصف مع هذا المدرس.</p>
            )}
            {teacherId && grade && packages.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`text-sm p-3 rounded-lg border text-right ${selectedPackageId === pkg.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100'}`}
                  >
                    <div className="font-semibold">{pkg.name}</div>
                    {pkg.description && <div className="text-xs opacity-80 mt-1">{pkg.description}</div>}
                    <div className="text-xs mt-1">السعر: {pkg.price / 100} EGP</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">المجموع</div>
              <div className="text-2xl font-bold">{total} EGP</div>
            </div>
            <div>
              <button className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow dark:bg-blue-500 dark:hover:bg-blue-600" disabled={loading || !teacherId}>{loading ? 'جاري الإعداد...' : 'ادفع الآن'}</button>
            </div>
          </div>

          {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
        </form>
      </div>
      <p className="mt-6 text-sm text-gray-600">بعد الدفع ستتم إعادة توجيهك لإكمال إنشاء الحساب واختيار اسم المستخدم وكلمة المرور والصف.</p>
    </main>
  )
}
