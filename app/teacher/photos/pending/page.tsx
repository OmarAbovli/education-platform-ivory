"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, Image as ImageIcon, Clock, AlertCircle } from "lucide-react"
import { getPendingPhotoUploads, approvePhotoUpload, rejectPhotoUpload } from "@/server/photo-actions"

export default function PendingPhotosPage() {
  const [uploads, setUploads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({})
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null)

  useEffect(() => {
    loadPendingUploads()
  }, [])

  const loadPendingUploads = async () => {
    setLoading(true)
    const result = await getPendingPhotoUploads()
    if (result.success) {
      setUploads(result.uploads || [])
    }
    setLoading(false)
  }

  const handleApprove = async (photoId: string) => {
    const result = await approvePhotoUpload(photoId)
    if (result.success) {
      loadPendingUploads()
    } else {
      alert(result.error || 'فشل قبول الصورة')
    }
  }

  const handleReject = async (photoId: string) => {
    const reason = rejectionReason[photoId] || ''
    const result = await rejectPhotoUpload(photoId, reason)
    if (result.success) {
      setShowRejectDialog(null)
      setRejectionReason({})
      loadPendingUploads()
    } else {
      alert(result.error || 'فشل رفض الصورة')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-white">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">الصور المنتظرة</h1>
            <p className="text-slate-400">راجع الصور المرفوعة من الطلاب</p>
          </div>
        </div>

        {uploads.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-12 text-center">
              <ImageIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">لا توجد صور منتظرة</h3>
              <p className="text-slate-400">جميع الصور تمت مراجعتها</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploads.map((upload) => (
              <Card key={upload.id} className="bg-slate-900/50 border-amber-400/20 hover:border-amber-400/40 transition-all overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={upload.image_url}
                    alt={upload.caption || 'صورة'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-3 py-1 bg-amber-500/90 text-white text-xs rounded-full font-medium">
                    {upload.upload_type === 'gallery' ? '📷 معرض' : '💬 شات'}
                  </div>
                </div>

                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    {upload.student_avatar ? (
                      <img
                        src={upload.student_avatar}
                        alt={upload.student_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                        {upload.student_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-semibold">{upload.student_name}</div>
                      <div className="text-xs text-slate-400">
                        الصف {upload.student_grade === 1 ? 'الأول' : upload.student_grade === 2 ? 'الثاني' : 'الثالث'}
                      </div>
                    </div>
                  </div>
                  {upload.caption && (
                    <p className="text-sm text-slate-300 mt-2">{upload.caption}</p>
                  )}
                  <div className="text-xs text-slate-500 mt-2">
                    {new Date(upload.created_at).toLocaleString('ar-EG', {
                      timeZone: 'Africa/Cairo'
                    })}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {showRejectDialog === upload.id ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="سبب الرفض (اختياري)..."
                        value={rejectionReason[upload.id] || ''}
                        onChange={(e) => setRejectionReason({
                          ...rejectionReason,
                          [upload.id]: e.target.value
                        })}
                        rows={3}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReject(upload.id)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          تأكيد الرفض
                        </Button>
                        <Button
                          onClick={() => setShowRejectDialog(null)}
                          variant="outline"
                          size="sm"
                          className="border-slate-700"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(upload.id)}
                        className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        قبول
                      </Button>
                      <Button
                        onClick={() => setShowRejectDialog(upload.id)}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        رفض
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
