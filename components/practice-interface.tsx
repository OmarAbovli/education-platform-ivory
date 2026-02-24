'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  startPracticeSession,
  sendMessage,
  endPracticeSession,
} from '@/server/ai-practice-actions'
import {
  MessageSquare,
  Send,
  Mic,
  StopCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BarChart3,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Message {
  role: 'student' | 'ai'
  content: string
  analysis?: {
    hasErrors: boolean
    grammarCorrections: Array<{ error: string; correction: string }>
    vocabularySuggestions: Array<{ word: string; betterWord: string; context: string }>
  }
}

interface PracticeInterfaceProps {
  userId: string
  userName: string
}

const TOPICS = [
  { value: 'free', label: '💬 محادثة حرة' },
  { value: 'daily', label: '☀️ الحياة اليومية' },
  { value: 'travel', label: '✈️ السفر والرحلات' },
  { value: 'food', label: '🍔 الطعام والمطاعم' },
  { value: 'hobbies', label: '🎮 الهوايات والترفيه' },
  { value: 'work', label: '💼 العمل والدراسة' },
  { value: 'technology', label: '💻 التكنولوجيا' },
  { value: 'sports', label: '⚽ الرياضة' },
]

export function PracticeInterface({ userId, userName }: PracticeInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('free')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [sessionReport, setSessionReport] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStartSession = async () => {
    setIsLoading(true)
    console.log('🚀 Starting practice session...')
    try {
      const topic = TOPICS.find((t) => t.value === selectedTopic)?.label.split(' ')[1] || 'various topics'
      console.log('📝 Topic:', topic)
      
      const result = await startPracticeSession(userId, topic, 'chat')
      console.log('✅ Result:', result)

      if (result.success && result.session) {
        console.log('✅ Session created:', result.session.id)
        setSessionId(result.session.id)
        setIsSessionActive(true)
        setMessages([
          {
            role: 'ai',
            content: result.welcomeMessage || 'Hello! Ready to practice English?',
          },
        ])
      } else {
        console.error('❌ Session creation failed:', result)
        alert('فشل في بدء الجلسة. تحقق من الـ Console للتفاصيل.')
      }
    } catch (error) {
      console.error('❌ Error starting session:', error)
      alert('خطأ: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isSending) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsSending(true)

    // إضافة رسالة الطالب فوراً
    setMessages((prev) => [
      ...prev,
      {
        role: 'student',
        content: userMessage,
      },
    ])

    try {
      const result = await sendMessage(sessionId, userMessage)

      if (result.success && result.aiResponse) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: result.aiResponse,
            analysis: result.analysis,
          },
        ])
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleEndSession = async () => {
    if (!sessionId) return

    setIsLoading(true)
    try {
      const result = await endPracticeSession(sessionId)

      if (result.success) {
        setSessionReport(result.report)
        setShowReport(true)
        setIsSessionActive(false)
      }
    } catch (error) {
      console.error('Error ending session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewSession = () => {
    setShowReport(false)
    setSessionId(null)
    setMessages([])
    setSessionReport(null)
  }

  // Report View
  if (showReport && sessionReport) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            تقرير الجلسة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* الدرجات */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{sessionReport.scores.grammar}</p>
                <p className="text-xs text-muted-foreground mt-1">القواعد</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{sessionReport.scores.vocabulary}</p>
                <p className="text-xs text-muted-foreground mt-1">المفردات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{sessionReport.scores.fluency}</p>
                <p className="text-xs text-muted-foreground mt-1">الطلاقة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {sessionReport.scores.overall}
                </p>
                <p className="text-xs text-muted-foreground mt-1">الإجمالي</p>
              </CardContent>
            </Card>
          </div>

          {/* معلومات الجلسة */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">المدة</p>
              <p className="text-lg font-semibold">
                {Math.floor(sessionReport.duration / 60)} دقيقة و {sessionReport.duration % 60} ثانية
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">عدد الرسائل</p>
              <p className="text-lg font-semibold">{sessionReport.totalMessages} رسالة</p>
            </div>
          </div>

          {/* نقاط القوة */}
          {sessionReport.strengths.length > 0 && (
            <div>
              <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                نقاط القوة
              </h3>
              <ul className="space-y-1">
                {sessionReport.strengths.map((strength: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* نقاط الضعف والاقتراحات */}
          {(sessionReport.weaknesses.length > 0 || sessionReport.suggestions.length > 0) && (
            <div>
              <h3 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                اقتراحات للتحسين
              </h3>
              <ul className="space-y-1">
                {sessionReport.weaknesses.map((weakness: string, i: number) => (
                  <li key={`w-${i}`} className="text-sm text-muted-foreground">
                    • {weakness}
                  </li>
                ))}
                {sessionReport.suggestions.map((suggestion: string, i: number) => (
                  <li key={`s-${i}`} className="text-sm text-muted-foreground">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* الأخطاء الشائعة */}
          {sessionReport.commonMistakes.length > 0 && (
            <div>
              <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                أخطاء شائعة
              </h3>
              <div className="space-y-2">
                {sessionReport.commonMistakes.map((mistake: any, i: number) => (
                  <div key={i} className="text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                    <p className="text-red-600 line-through">{mistake.error}</p>
                    <p className="text-green-600 mt-1">✓ {mistake.correction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* زر جلسة جديدة */}
          <Button onClick={handleNewSession} className="w-full" size="lg">
            <MessageSquare className="h-5 w-5 mr-2" />
            ابدأ جلسة جديدة
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Main Chat Interface
  return (
    <div className="space-y-4">
      {/* اختيار الموضوع */}
      {!isSessionActive && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">اختر موضوع المحادثة</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TOPICS.map((topic) => (
                <button
                  key={topic.value}
                  onClick={() => setSelectedTopic(topic.value)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedTopic === topic.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-center">{topic.label}</p>
                </button>
              ))}
            </div>
            <Button
              onClick={handleStartSession}
              disabled={isLoading}
              className="w-full mt-6"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  جاري البدء...
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5 mr-2" />
                  ابدأ المحادثة
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      {isSessionActive && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              محادثة نشطة
            </CardTitle>
            <Button
              onClick={handleEndSession}
              disabled={isLoading}
              variant="destructive"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <StopCircle className="h-4 w-4 mr-2" />
                  إنهاء الجلسة
                </>
              )}
            </Button>
          </CardHeader>

          {/* Messages */}
          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-950/50">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'student'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-900 border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                    {/* عرض التحليل للرسائل من AI */}
                    {msg.role === 'ai' && msg.analysis && msg.analysis.hasErrors && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        {msg.analysis.grammarCorrections.length > 0 && (
                          <div className="text-xs">
                            <p className="font-semibold text-orange-600 mb-1">تصحيحات نحوية:</p>
                            {msg.analysis.grammarCorrections.map((correction, j) => (
                              <p key={j} className="text-gray-600 dark:text-gray-400">
                                <span className="line-through">{correction.error}</span> →{' '}
                                <span className="text-green-600">{correction.correction}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-900 border rounded-2xl px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="اكتب رسالتك بالإنجليزية..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
