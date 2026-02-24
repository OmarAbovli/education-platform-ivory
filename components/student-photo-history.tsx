"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { getMyPhotoUploads } from "@/server/photo-actions"

export function StudentPhotoHistory() {
  const [uploads, setUploads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUploads()
  }, [])

  const loadUploads = async () => {
    const result = await getMyPhotoUploads()
    if (result.success) {
      setUploads(result.uploads || [])
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6 text-center text-slate-400">
          جاري التحميل...
        </CardContent>
      </Card>
    )
  }

  if (uploads.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">لم تقم برفع أي صور بعد</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'في انتظار المراجعة',
          icon: Clock,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20'
        }
      case 'approved':
        return {
          label: 'تم القبول',
          icon: CheckCircle,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20'
        }
      case 'rejected':
        return {
          label: 'تم الرفض',
          icon: XCircle,
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20'
        }
      default:
        return {
          label: 'غير معروف',
          icon: AlertCircle,
          color: 'text-slate-400',
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/20'
        }
    }
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">سجل الصور المرفوعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uploads.map((upload) => {
            const statusInfo = getStatusInfo(upload.status)
            const StatusIcon = statusInfo.icon

            return (
              <div
                key={upload.id}
                className={`rounded-lg border ${statusInfo.border} ${statusInfo.bg} overflow-hidden`}
              >
                <div className="flex gap-4 p-4">
                  <img
                    src={upload.image_url}
                    alt={upload.caption || 'صورة'}
                    className="w-20 h-20 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    {upload.caption && (
                      <p className="text-white font-medium mb-2 truncate">
                        {upload.caption}
                      </p>
                    )}
                    <div className={`flex items-center gap-2 mb-2 ${statusInfo.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{statusInfo.label}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(upload.created_at).toLocaleDateString('ar-EG', {
                        timeZone: 'Africa/Cairo',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    {upload.status === 'rejected' && upload.rejection_reason && (
                      <div className="mt-2 text-sm text-red-400">
                        <strong>السبب:</strong> {upload.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
