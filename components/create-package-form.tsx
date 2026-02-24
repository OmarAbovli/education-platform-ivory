"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createPackage } from "@/server/package-actions"
import { useToast } from "@/hooks/use-toast"
import { ThumbnailUpload } from "./thumbnail-upload"

export function CreatePackageForm({ onFinished }: { onFinished?: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("") // Stored as string to handle empty input
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [selectedGrades, setSelectedGrades] = useState<number[]>([])
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const toggleGrade = (grade: number) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        console.log("CreatePackageForm: onSubmit triggered.")

        const priceInCents = Math.round(parseFloat(price) * 100)
        console.log("CreatePackageForm: Calculated price in cents:", priceInCents)

        if (isNaN(priceInCents) || priceInCents < 0) {
          console.error("CreatePackageForm: Invalid price.")
          toast({ title: "Invalid Price", description: "Please enter a valid price.", variant: "destructive" })
          return
        }

        console.log("CreatePackageForm: Starting transition to call createPackage.")
        startTransition(async () => {
          try {
            const res = await createPackage({ 
              name, 
              description, 
              price: priceInCents, 
              thumbnailUrl,
              grades: selectedGrades.length > 0 ? selectedGrades : undefined
            })
            console.log("CreatePackageForm: Received response from createPackage:", res)

            if (res?.ok) {
              toast({ title: "Package Created", description: `The package "${name}" has been successfully created.` })
              router.refresh()
              onFinished?.()
            } else {
              toast({ title: "Error", description: res?.error ?? "Failed to create package.", variant: "destructive" })
            }
          } catch (error) {
            console.error("CreatePackageForm: Error during startTransition:", error)
            toast({ title: "Caught Error", description: "An unexpected error occurred.", variant: "destructive" })
          }
        })
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="pkg-name">Package Name</Label>
        <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Algebra Basics" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pkg-desc">Description</Label>
        <Textarea
          id="pkg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief summary of what this package includes."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pkg-price">Price (in EGP)</Label>
        <Input
          id="pkg-price"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g., 25.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Package Thumbnail</Label>
        <ThumbnailUpload value={thumbnailUrl} onChange={setThumbnailUrl} />
      </div>

      <div className="space-y-2">
        <Label>Target Grades (Secondary School)</Label>
        <p className="text-sm text-muted-foreground mb-2">Select which grades can access this package. Leave empty to make it available for all grades.</p>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((grade) => (
            <div key={grade} className="flex items-center space-x-2">
              <Checkbox
                id={`grade-${grade}`}
                checked={selectedGrades.includes(grade)}
                onCheckedChange={() => toggleGrade(grade)}
              />
              <label
                htmlFor={`grade-${grade}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Grade {grade} Secondary
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onFinished} disabled={isPending}>Cancel</Button>
        <Button disabled={isPending} type="submit">
          {isPending ? "Creating..." : "Create Package"}
        </Button>
      </div>
    </form>
  )
}
