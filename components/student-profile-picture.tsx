"use client"

import { useState, useRef } from "react"
import { Camera, Upload, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { uploadProfilePicture, removeProfilePicture } from "@/server/student-profile-actions"

type StudentProfilePictureProps = {
  currentAvatar?: string | null
  userName?: string
}

export function StudentProfilePicture({ currentAvatar, userName }: StudentProfilePictureProps) {
  const [avatar, setAvatar] = useState<string | null>(currentAvatar || null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    if (!file.type.startsWith('image/')) {
      toast({ title: 'يرجى اختيار صورة فقط', variant: 'destructive' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت', variant: 'destructive' })
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadProfilePicture(formData)

      if (result.success && result.url) {
        setAvatar(result.url)
        setPreview(null)
        toast({ title: 'تم تحديث صورة البروفايل!' })
        
        // Reload page to update all instances
        window.location.reload()
      } else {
        toast({ title: result.error || 'فشل رفع الصورة', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'حدث خطأ أثناء رفع الصورة', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!confirm('هل تريد حذف صورة البروفايل؟')) return

    setUploading(true)

    try {
      const result = await removeProfilePicture()

      if (result.success) {
        setAvatar(null)
        setPreview(null)
        toast({ title: 'تم حذف صورة البروفايل' })
        
        // Reload page to update all instances
        window.location.reload()
      } else {
        toast({ title: result.error || 'فشل حذف الصورة', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'حدث خطأ أثناء حذف الصورة', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const cancelPreview = () => {
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>صورة البروفايل</CardTitle>
        <CardDescription>قم بتحميل صورة شخصية لحسابك</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar Display */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-32 w-32 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : avatar ? (
                <img src={avatar} alt={userName || 'Profile'} className="h-full w-full object-cover" />
              ) : (
                <User className="h-16 w-16 text-white" />
              )}
            </div>
            {(avatar || preview) && (
              <button
                onClick={preview ? cancelPreview : handleRemove}
                disabled={uploading}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex flex-col items-center gap-3 w-full">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {preview ? (
              <div className="flex gap-2 w-full">
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-500"
                >
                  {uploading ? (
                    <>جاري الرفع...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      تأكيد الرفع
                    </>
                  )}
                </Button>
                <Button
                  onClick={cancelPreview}
                  disabled={uploading}
                  variant="outline"
                >
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                اختر صورة جديدة
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              الحد الأقصى 5 ميجابايت • JPG, PNG, GIF
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
