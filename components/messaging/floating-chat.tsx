'use client'

import { useEffect, useState } from "react"
import { ArrowLeft, MessageSquare, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { getConversationsForUser, getUnreadConversationCount, getSubscribedTeachers } from "@/server/messaging-actions"
import { type Conversation } from "@/lib/messaging-types"
import { ConversationList } from "@/components/messaging/conversation-list"
import { MessageView } from "@/components/messaging/message-view"
import { NewMessageView } from "@/components/messaging/new-message-view"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-provider"
import { Pin } from "lucide-react"

export function FloatingChat() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [view, setView] = useState<"list" | "conversation" | "new">("list")
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [initTeacherId, setInitTeacherId] = useState<string | null>(null)
  const [pinnedTeacherIds, setPinnedTeacherIds] = useState<string[]>([])

  // Effect for polling the unread count for the badge
  useEffect(() => {
    if (!user || user.role !== "student") return
    getUnreadConversationCount().then(setUnreadCount)
    const interval = setInterval(() => {
      getUnreadConversationCount().then(setUnreadCount)
    }, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [user])

  // Effect for fetching the full conversation list when the sheet opens
  useEffect(() => {
    if (isOpen && user?.role === 'student') {
      Promise.all([
        getConversationsForUser(),
        getSubscribedTeachers()
      ]).then(([convs, teachers]) => {
        setPinnedTeacherIds(teachers.map(t => t.id))
        const convMap = new Map(convs.map(c => [c.teacher_id, c]))
        const pinned: Conversation[] = []
        const others: Conversation[] = []

        // Pinned Teachers (Subscribed)
        teachers.forEach(t => {
          if (convMap.has(t.id)) {
            const existing = convMap.get(t.id)!
            pinned.push(existing)
            convMap.delete(t.id)
          } else {
            // Ghost (Pinned)
            pinned.push({
              id: `ghost-${t.id}`,
              student_id: user.id,
              teacher_id: t.id,
              subject: null,
              status: 'active',
              student_has_unread: false,
              teacher_has_unread: false,
              created_at: new Date(),
              updated_at: new Date(), // Pinned at top
              participant: {
                id: t.id,
                name: t.name || "Teacher",
                avatar_url: t.avatar_url
              },
              last_message: null
            })
          }
        })

        // Remaining conversations
        others.push(...Array.from(convMap.values()))

        setConversations([...pinned, ...others])
      })

      setUnreadCount(0) // Optimistically clear badge count
    } else {
      // Reset view when sheet is closed
      setView("list")
      setSelectedConversationId(null)
      setInitTeacherId(null)
    }
  }, [isOpen, user])

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)

  const handleSelectConversation = (id: string) => {
    if (id.startsWith('ghost-')) {
      const teacherId = id.replace('ghost-', '')
      setInitTeacherId(teacherId)
      setSelectedConversationId(null)
      setView("new")
    } else {
      setSelectedConversationId(id)
      setInitTeacherId(null)
      setView("conversation")

      const conv = conversations.find((c) => c.id === id)
      if (conv && conv.student_has_unread) {
        setConversations((convs) =>
          convs.map((c) => (c.id === id ? { ...c, student_has_unread: false } : c))
        )
      }
    }
  }

  const handleMessageSent = (newConversationId: string) => {
    // After a new message is sent, refresh the conversation list and switch to the new conversation
    getConversationsForUser().then(setConversations)
    setSelectedConversationId(newConversationId)
    setInitTeacherId(null)
    setView("conversation")
  }

  const handleBackToList = () => {
    setSelectedConversationId(null)
    setInitTeacherId(null)
    setView("list")
    // Refresh conversation list on back to see latest states
    getConversationsForUser().then(setConversations)
  }

  // Don't render anything if the user is not a student
  if (user?.role !== "student") {
    return null
  }

  const renderContent = () => {
    if (view === "new") {
      return <NewMessageView onMessageSent={handleMessageSent} initialTeacherId={initTeacherId} />
    }
    if (view === "conversation" && selectedConversation) {
      return <MessageView key={selectedConversation.id} conversation={selectedConversation} />
    }
    return (
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        pinnedParticipantIds={pinnedTeacherIds}
      />
    )
  }

  const getTitle = () => {
    if (view === "new") return "New Message"
    if (view === "conversation" && selectedConversation) return selectedConversation.participant.name
    return "Your Messages"
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50" size="icon">
          <MessageSquare className="h-8 w-8" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0">{unreadCount}</Badge>
          )}
          <span className="sr-only">Open Chat</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[440px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {view !== "list" && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBackToList}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <SheetTitle className="truncate">{getTitle()}</SheetTitle>
          </div>
          {view === "list" && (
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setView("new")}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  )
}
