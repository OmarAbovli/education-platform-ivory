'use client'

import { useState, useEffect } from "react";
import { getConversationsForUser } from "@/server/messaging-actions";
import { type Conversation } from "@/lib/messaging-types";
import { ConversationList } from "@/components/messaging/conversation-list";
import { MessageView } from "@/components/messaging/message-view";
import { Mail, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import TeacherCompose from "@/components/messaging/teacher-compose"

export default function TeacherMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    getConversationsForUser().then(data => {
      setConversations(data);
      setIsLoading(false);
    });
  }, []);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const conversationListComponent = (
    <ConversationList
      conversations={conversations}
      selectedConversationId={selectedConversationId}
      onSelectConversation={setSelectedConversationId}
    />
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading conversations...</div>;
  }

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] h-[calc(100vh-3.5rem)]">
      <div className="hidden border-r bg-gray-100/40 md:flex md:flex-col dark:bg-gray-800/40">
        {conversationListComponent}
      </div>
      <div className="flex flex-col bg-white dark:bg-gray-950">
        <header className="flex h-14 items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <PanelLeft className="h-6 w-6" />
                <span className="sr-only">Open conversations</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              {conversationListComponent}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{selectedConversation ? selectedConversation.participant.name : "Messages"}</h1>
            <div className="ml-2">
              <TeacherCompose onMessageSent={(id) => setSelectedConversationId(id)} />
            </div>
          </div>
        </header>
        <div className="hidden md:flex md:items-center md:justify-between md:h-14 md:px-6 border-b bg-gray-100/40 dark:bg-gray-800/40">
          <h1 className="text-lg font-semibold">{selectedConversation ? selectedConversation.participant.name : "Messages"}</h1>
          <div>
            <TeacherCompose onMessageSent={(id) => setSelectedConversationId(id)} />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {selectedConversation ? (
            <MessageView key={selectedConversation.id} conversation={selectedConversation} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="p-6 rounded-full bg-gray-100 dark:bg-gray-800">
                <Mail className="h-10 w-10 text-gray-500" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-600 dark:text-gray-300">Select a conversation</h2>
              <p className="text-gray-500 dark:text-gray-400">Choose a conversation from the list to see the messages.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}