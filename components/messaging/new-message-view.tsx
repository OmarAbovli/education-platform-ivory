'use client'

import { useEffect, useRef, useState, useTransition } from "react"
import { getSubscribedTeachers } from "@/server/messaging-actions"
import { sendMessage } from "@/server/messaging-actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SendHorizontal } from "lucide-react"

type Teacher = {
  id: string
  name: string | null
  avatar_url: string | null
}

interface NewMessageViewProps {
  onMessageSent: (conversationId: string) => void
  initialTeacherId?: string | null
}

export function NewMessageView({ onMessageSent, initialTeacherId }: NewMessageViewProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    getSubscribedTeachers().then((data) => {
      setTeachers(data)
      if (initialTeacherId) {
        const preselected = data.find(t => t.id === initialTeacherId)
        if (preselected) setSelectedTeacher(preselected)
      } else if (data.length === 1) {
        setSelectedTeacher(data[0])
      }
      setIsLoading(false)
    })
  }, [initialTeacherId])

  const handleSendMessage = async (formData: FormData) => {
    const body = formData.get("body") as string
    if (!body.trim() || !selectedTeacher) return

    startTransition(async () => {
      try {
        const result = await sendMessage({ teacherId: selectedTeacher.id, body })
        if (result.success && result.conversationId) {
          onMessageSent(result.conversationId)
        }
      } catch (e) {
        console.error("Failed to send message", e)
        // Optionally show an error toast
      }
    })
  }

  if (isLoading) {
    return <div className="p-4 text-center">Loading teachers...</div>
  }

  if (!selectedTeacher) {
    return (
      <div className="p-2">
        <p className="p-2 text-sm font-medium text-gray-600 dark:text-gray-300">
          Who do you want to message?
        </p>
        <div className="flex flex-col gap-1">
          {teachers.map((teacher) => (
            <button
              key={teacher.id}
              onClick={() => setSelectedTeacher(teacher)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-gray-200/60 dark:hover:bg-gray-700/60"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={teacher.avatar_url || undefined} alt={teacher.name || "Teacher"} />
                <AvatarFallback>{teacher.name?.charAt(0).toUpperCase() || "T"}</AvatarFallback>
              </Avatar>
              <p className="font-semibold">{teacher.name}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1">
        <p className="text-sm text-gray-500 mb-2">
          New message to <span className="font-semibold">{selectedTeacher.name}</span>:
        </p>
        <form ref={formRef} action={handleSendMessage} className="flex flex-col gap-2 h-full">
          <Textarea
            name="body"
            placeholder="Type your question..."
            className="flex-1 resize-none"
            rows={5}
            disabled={isPending}
            required
          />
          <Button type="submit" disabled={isPending} className="w-full">
            <SendHorizontal className="h-5 w-5 mr-2" />
            Send Message
          </Button>
        </form>
      </div>
    </div>
  )
}
