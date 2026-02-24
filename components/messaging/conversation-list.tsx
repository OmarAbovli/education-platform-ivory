'use client'

import { type Conversation } from "@/lib/messaging-types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/lib/auth-provider"

import { Pin } from "lucide-react"

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
  pinnedParticipantIds?: string[]
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  pinnedParticipantIds = []
}: ConversationListProps) {
  const { user } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <header className="border-b p-4">
        <h2 className="text-xl font-bold">Inbox</h2>
        <p className="text-sm text-gray-500">{conversations.length} conversations</p>
      </header>
      <div className="flex-1 overflow-auto">
        <nav className="flex flex-col gap-1 p-2">
          {conversations.map((conv) => {
            const isSelected = conv.id === selectedConversationId
            const hasUnread = user?.role === 'student' ? conv.student_has_unread : conv.teacher_has_unread
            const isPinned = pinnedParticipantIds.includes(conv.participant.id)

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-gray-200/60 dark:hover:bg-gray-700/60",
                  isSelected && "bg-gray-200/80 dark:bg-gray-700/80",
                  isPinned && "bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conv.participant.avatar_url || undefined} alt={conv.participant.name || "User"} />
                  <AvatarFallback>{conv.participant.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold truncate">{conv.participant.name}</p>
                    {isPinned && <Pin className="h-3 w-3 text-amber-600 fill-amber-600 rotate-45" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {conv.last_message?.body || (isPinned ? "Start a conversation" : "No messages yet")}
                  </p>
                </div>
                <div className="flex flex-col items-end text-xs text-gray-500 self-start pt-1">
                  <time dateTime={conv.updated_at.toISOString()}>
                    {formatDistanceToNow(conv.updated_at, { addSuffix: true })}
                  </time>
                  {hasUnread && (
                    <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-sky-500" />
                  )}
                </div>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
