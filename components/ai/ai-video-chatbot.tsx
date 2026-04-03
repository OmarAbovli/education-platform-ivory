"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Send, Sparkles, Loader2, User, Bot, HelpCircle } from "lucide-react"
import { askVideoAI } from "@/server/video-ai-actions"
import { cn } from "@/lib/utils"

type Message = {
  role: 'user' | 'model'
  text: string
}

export function AiVideoChatbot({ videoId, videoTitle }: { videoId: string, videoTitle?: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }])
    setIsLoading(true)

    // Build history for Gemini
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }))

    const res = await askVideoAI(videoId, userMessage, history)
    
    if (res.ok && res.text) {
      setMessages((prev) => [...prev, { role: 'model', text: res.text as string }])
    } else {
      setMessages((prev) => [...prev, { role: 'model', text: res.error || "Sorry, I couldn't process that question." }])
    }
    
    setIsLoading(false)
  }

  const suggestedQuestions = [
    "What are the main topics discussed?",
    "Can you explain the last part of the video?",
    "Give me 3 practice questions.",
    "Summary of the first 10 minutes?"
  ]

  return (
    <Card className="flex flex-col h-[500px] border-emerald-100 shadow-sm overflow-hidden">
      <CardHeader className="bg-emerald-50/30 border-b p-4">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
             <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-emerald-900">Virtual Assistant</CardTitle>
            <CardDescription className="text-[10px]">Ask anything about the video: {videoTitle || ""}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 relative">
        <ScrollArea className="h-full px-4 py-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[350px] space-y-4 text-center px-6">
              <Bot className="h-10 w-10 text-emerald-200" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900 italic">"أهلاً بك! أنا مساعدك الذكي لهذا الدرس. اسألني أي سؤال عما شرحه المدرس."</p>
                <p className="text-xs text-muted-foreground">Hello! I'm your AI tutor. Ask me anything about this lesson.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {suggestedQuestions.map((q) => (
                   <button 
                    key={q} 
                    onClick={() => setInput(q)}
                    className="text-[10px] px-3 py-1.5 border rounded-full bg-white hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                   >
                    {q}
                   </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn(
                "flex gap-3",
                m.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <Avatar className="h-8 w-8 shrink-0">
                  {m.role === 'user' ? (
                    <AvatarFallback className="bg-emerald-100"><User className="h-4 w-4 text-emerald-600" /></AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-emerald-500"><Bot className="h-4 w-4 text-white" /></AvatarFallback>
                  )}
                </Avatar>
                <div className={cn(
                  "rounded-2xl px-4 py-2 text-sm max-w-[85%]",
                  m.role === 'user' 
                    ? "bg-emerald-600 text-emerald-50 rounded-tr-none" 
                    : "bg-slate-100 text-slate-800 rounded-tl-none border"
                )}>
                   {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-emerald-500"><Bot className="h-4 w-4 text-white" /></AvatarFallback>
                </Avatar>
                <div className="bg-slate-100 rounded-2xl rounded-tl-none border px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t bg-slate-50/50">
        <form 
          className="flex w-full items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Input 
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..." 
            className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
