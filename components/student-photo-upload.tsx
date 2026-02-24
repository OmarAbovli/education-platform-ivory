"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { uploadPhotoForApproval } from "@/server/photo-actions"

type Props = {
  teacherId: string
  onSuccess?: () => void
}

export function StudentPhotoUpload({ teacherId, onSuccess }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار صورة فقط')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
      return
    }

    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)

    try {
      // Upload image to server
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const uploadData = await uploadRes.json()

      if (!uploadData.ok) {
        throw new Error(uploadData.error || 'فشل رفع الصورة')
      }

      // Submit for approval
      const result = await uploadPhotoForApproval({
        imageUrl: uploadData.url,
        caption: caption.trim() || undefined,
        uploadType: 'gallery',
        teacherId
      })

      if (result.success) {
        // Reset form
        setSelectedFile(null)
        setPreview(null)
        setCaption('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        
        alert('تم رفع الصورة بنجاح! في انتظار موافقة المدرس')
        onSuccess?.()
      } else {
        throw new Error(result.error || 'فشل إرسال الصورة')
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Card className="bg-slate-900/50 border-emerald-400/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Upload className="h-5 w-5" />
          رفع صورة جديدة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full h-32 border-2 border-dashed border-slate-700 hover:border-emerald-400/50 bg-slate-800/50"
            >
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8 text-slate-400" />
                <span className="text-slate-400">اضغط لاختيار صورة</span>
                <span className="text-xs text-slate-500">الحد الأقصى: 5 ميجابايت</span>
              </div>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full rounded-lg object-cover max-h-64"
              />
              <Button
                onClick={clearSelection}
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                وصف الصورة (اختياري)
              </label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="أضف وصف للصورة..."
                rows={3}
                className="bg-slate-800 border-slate-700 text-white"
                maxLength={500}
              />
              <div className="text-xs text-slate-500 mt-1">
                {caption.length}/500
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ImageIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-300">
                  <strong>ملاحظة:</strong> سيتم مراجعة الصورة من قبل المدرس قبل نشرها في المعرض
                </div>
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  رفع الصورة
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
