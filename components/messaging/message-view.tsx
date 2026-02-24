'use client'

import { useEffect, useRef, useState, useTransition } from "react"
import { getMessagesForConversation } from "@/server/messaging-actions"
import { type Conversation, type Message } from "@/lib/messaging-types"
import { sendMessage } from "@/server/messaging-actions"
import { useAuth } from "@/lib/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { nanoid } from "nanoid"

interface MessageViewProps {
  conversation: Conversation
}

export function MessageView({ conversation }: MessageViewProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const fetchedMessages = await getMessagesForConversation(conversation.id)
        setMessages(fetchedMessages)
      } catch (e) {
        setError("Failed to load messages.")
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMessages()
  }, [conversation.id])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (formData: FormData) => {
    const body = formData.get("body") as string
    if (!body.trim() || !user) return

    formRef.current?.reset()

    const optimisticMessage: Message = {
      id: nanoid(),
      conversation_id: conversation.id,
      sender_id: user.id,
      body: body,
      created_at: new Date(),
      sender: {
        name: user.name || null,
        avatar_url: user.avatar_url || null,
      },
    }

    setMessages((prevMessages) => [...prevMessages, optimisticMessage])

    startTransition(async () => {
      try {
        await sendMessage({ conversationId: conversation.id, body })
      } catch (e) {
        console.error("Failed to send message", e)
        // Revert optimistic update on error
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== optimisticMessage.id))
        // Optionally, show a toast notification for the error
      }
    })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading messages...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 border-b p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.participant.avatar_url || undefined} />
          <AvatarFallback>{conversation.participant.name?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-semibold">{conversation.participant.name}</h2>
      </header>
      <div ref={scrollAreaRef} className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isOwnMessage = msg.sender_id === user?.id
          return (
            <div
              key={msg.id}
              className={cn("flex items-start gap-3", isOwnMessage && "flex-row-reverse")}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={msg.sender.avatar_url || undefined} />
                <AvatarFallback>{msg.sender.name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "max-w-[70%] rounded-lg p-3 text-sm",
                  isOwnMessage ? "bg-sky-500 text-white" : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                <p>{msg.body}</p>
                <time className="text-xs opacity-70 mt-1 block text-right">
                  {format(msg.created_at, "p")}
                </time>
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t p-4">
        <form ref={formRef} action={handleSendMessage} className="flex items-center gap-2">
          <Textarea
            name="body"
            placeholder="Type your message..."
            className="flex-1 resize-none"
            rows={1}
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending}>
            <SendHorizontal className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
