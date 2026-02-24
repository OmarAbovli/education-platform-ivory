"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface ExamCountdownProps {
  scheduledAt: string
  onExpire?: () => void
}

export function ExamCountdown({ scheduledAt, onExpire }: ExamCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const examTime = new Date(scheduledAt).getTime()
      const difference = examTime - now

      if (difference <= 0) {
        setIsExpired(true)
        setTimeLeft("بدأ الآن!")
        onExpire?.()
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      let timeString = ""
      
      if (days > 0) {
        timeString = `${days} يوم ${hours} ساعة`
      } else if (hours > 0) {
        timeString = `${hours} ساعة ${minutes} دقيقة`
      } else if (minutes > 0) {
        timeString = `${minutes} دقيقة ${seconds} ثانية`
      } else {
        timeString = `${seconds} ثانية`
      }

      setTimeLeft(timeString)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [scheduledAt, onExpire])

  return (
    <div className={`flex items-center gap-1.5 ${isExpired ? 'text-green-400 animate-pulse' : 'text-blue-400'}`}>
      <Clock className="h-3.5 w-3.5" />
      <span className="text-xs font-semibold">{timeLeft}</span>
    </div>
  )
}
