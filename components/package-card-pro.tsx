"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, Star } from "lucide-react"
import Link from "next/link"

interface PackageCardProProps {
  id: string
  name: string
  description?: string
  price: number
  thumbnail_url?: string
  grades: number[]
  teacherId?: string
}

const gradeNames: { [key: number]: string } = {
  1: "الأول الثانوي",
  2: "الثاني الثانوي", 
  3: "الثالث الثانوي"
}

export default function PackageCardPro({
  id,
  name,
  description,
  price,
  thumbnail_url,
  grades,
  teacherId
}: PackageCardProProps) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={thumbnail_url || "/teacher-avatar.png"}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-white/90 text-black font-bold">
            {price > 0 ? `${(price / 100).toFixed(0)} جنيه` : "مجاني"}
          </Badge>
        </div>

        {/* Grades Badge */}
        {grades && grades.length > 0 && (
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="bg-black/50 text-white border-white/30">
              <Users className="w-3 h-3 mr-1" />
              {grades.map(g => gradeNames[g] || `الصف ${g}`).join(" - ")}
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
          {name}
        </CardTitle>
        {description && (
          <CardDescription className="line-clamp-2 text-sm">
            {description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>باقة تعليمية</span>
          </div>
          
          <Link href={`/packages/${id}`}>
            <Button size="sm" className="transition-all duration-300 hover:scale-105">
              عرض الباقة
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
