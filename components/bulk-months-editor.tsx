"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { bulkUpdateMonthsForClassification } from "@/server/teacher-actions"

const allMonths = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
]

export default function BulkMonthsEditor({
  classification = "center",
  affectedCount = 0,
}: {
  classification: "center" | "online"
  affectedCount: number
}) {
  const [months, setMonths] = useState<number[]>([])
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function toggleMonth(m: number) {
    setMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  function setAll() {
    setMonths(allMonths.map((m) => m.value))
  }

  function clearAll() {
    setMonths([])
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Bulk Update Months</CardTitle>
        <CardDescription>
          Apply month permissions to all {classification === "center" ? "Center" : "Online"} students you manage.
          {affectedCount > 0 ? ` Affected students: ${affectedCount}.` : " No students in this category yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" type="button" onClick={setAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={clearAll}>
            Clear
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {allMonths.map((m) => (
            <label key={m.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={months.includes(m.value)} onCheckedChange={() => toggleMonth(m.value)} />
              <span>{m.label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            disabled={isPending || affectedCount === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await bulkUpdateMonthsForClassification(months, classification)
                if (res.ok) {
                  toast({
                    title: "Months updated",
                    description: `Updated ${res.updatedCount} student${res.updatedCount === 1 ? "" : "s"}.`,
                  })
                  // Refresh the page data by reloading
                  if (typeof window !== "undefined") {
                    window.location.reload()
                  }
                } else {
                  toast({ title: "Error", description: res.error ?? "Could not update months", variant: "destructive" })
                }
              })
            }
          >
            {isPending ? "Applying..." : "Apply to Category"}
          </Button>
          <Label className="text-xs text-muted-foreground">
            This replaces month permissions for all students in this category.
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}
