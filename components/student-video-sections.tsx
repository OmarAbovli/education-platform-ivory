"use client"

import { useState } from "react"
import { Search, X, PackageOpen, LayoutGrid, SearchX } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ModernStudentVideoCard from "@/components/modern-student-video-card"
import { PurchasePackageButton } from "@/components/purchase-package-button"
import RedeemCodeDialog from "@/components/redeem-code-dialog"
import { cn } from "@/lib/utils"

interface Video {
  id: string
  title: string
  description?: string
  url: string
  category?: string
  is_free: boolean
  thumbnail_url?: string
  package_id?: string
}

interface Package {
  id: string
  name: string
  description?: string
  isAccessible: boolean
  price: number
  teacher_id: string
  videos: Video[]
}

interface TeacherGroup {
  teacherId: string
  teacherName: string
  packages: Package[]
}

interface Props {
  teacherVideoGroups: TeacherGroup[]
  userId: string
  userName?: string
}

export function StudentVideoSections({ teacherVideoGroups, userId, userName }: Props) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter logic
  const filteredGroups = teacherVideoGroups.map(group => ({
    ...group,
    packages: group.packages.map(pkg => ({
      ...pkg,
      videos: pkg.videos.filter(v => 
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(pkg => pkg.videos.length > 0 || !searchQuery) // If searching, only show packages with matches
  })).filter(group => group.packages.length > 0)

  const isSearching = searchQuery.length > 0
  const hasResults = filteredGroups.length > 0

  return (
    <div className="space-y-12">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-16 z-30 bg-background/80 backdrop-blur-md py-4 border-b border-border/50 -mx-4 px-4">
        <h2 className="text-2xl font-bold tracking-tight">Your Courses</h2>
        <div className="relative w-full max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
          <Input 
            placeholder="Search for lessons, subjects..." 
            className="pl-10 h-11 bg-white/5 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results Rendering */}
      {!hasResults && isSearching ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center">
            <SearchX className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold">No matches found</h3>
            <p className="text-muted-foreground text-sm">Try searching for a different keyword or subject.</p>
          </div>
          <Button variant="outline" onClick={() => setSearchQuery("")}>Clear Search</Button>
        </div>
      ) : (
        filteredGroups.map((teacherGroup) => (
          <div key={teacherGroup.teacherId} className="animate-in fade-in slide-in-from-bottom-5 duration-700">
            <h2 className="text-3xl font-black tracking-tighter mb-8 flex items-center gap-3">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 w-2 h-8 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              {teacherGroup.teacherName}
            </h2>
            
            {teacherGroup.packages.map((pkg) => (
              <section key={pkg.id} className="mb-16">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-white/5 gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-indigo-400" />
                      {pkg.name}
                      {!pkg.isAccessible && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-wider">
                          Locked
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{pkg.description || "Educational Course Content"}</p>
                  </div>
                  {!pkg.isAccessible && (
                    <div className="flex items-center gap-2">
                      <PurchasePackageButton pkg={pkg} />
                      <RedeemCodeDialog triggerVariant="ghost" size="sm" />
                    </div>
                  )}
                </div>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {pkg.videos.map((v) => {
                    const isLocked = !pkg.isAccessible && !v.is_free
                    return (
                      <ModernStudentVideoCard
                        key={v.id}
                        id={v.id}
                        title={v.title}
                        source={v.url}
                        thumbnailUrl={v.thumbnail_url || "/course-thumbnail.png"}
                        watermarkText={userName ? `${userName} • ${userId}` : userId}
                        antiDownload
                        hideRedeem={true}
                        isLocked={isLocked}
                        isCompleted={false}
                      />
                    )
                  })}

                  {/* Empty State when searching */}
                  {isSearching && pkg.videos.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-white/10">
                      <p>No matching lessons in this package.</p>
                    </div>
                  )}

                  {/* Unlock Card */}
                  {!pkg.isAccessible && !isSearching && (
                    <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 hover:bg-indigo-500/10 transition-all p-6 flex flex-col items-center justify-center text-center min-h-[250px]">
                      <div className="relative z-10 space-y-4">
                        <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto ring-1 ring-indigo-500/20">
                          <PackageOpen className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-1">Unlock Full Access</h4>
                          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                            Get all {pkg.videos.length} lessons in <strong>{pkg.name}</strong>
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 w-full max-w-[180px]">
                          <PurchasePackageButton pkg={pkg} className="w-full bg-indigo-600 hover:bg-indigo-500" />
                          <RedeemCodeDialog className="w-full" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
