'use client'

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { deletePackage, VideoPackage } from "@/server/package-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function TeacherPackageRow({ pkg }: { pkg: VideoPackage }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, startDeleting] = useTransition()

  function onDeleteConfirmed() {
    startDeleting(async () => {
      const res = await deletePackage(pkg.id)
      toast({
        title: res.ok ? "Deleted" : "Error",
        description: res.ok ? "Package removed" : ((res as any).error ?? "Failed to delete"),
        variant: res.ok ? "default" : "destructive",
      })
      if (res.ok) {
        router.refresh()
      }
    })
  }

  const gradesDisplay = pkg.grades && pkg.grades.length > 0 
    ? pkg.grades.sort().map(g => `Grade ${g}`).join(", ")
    : "All Grades"

  return (
    <tr className="border-t align-top">
      <td className="py-2 pr-3">
        <div className="font-medium">{pkg.name || "Untitled"}</div>
      </td>
      <td className="py-2 pr-3">
        <div className="line-clamp-2 max-w-[420px] text-muted-foreground">{pkg.description}</div>
      </td>
      <td className="py-2 pr-3">
        <div className="text-muted-foreground">
          {(pkg.price / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "EGP",
          })}
        </div>
      </td>
      <td className="py-2 pr-3">
        <div className="text-sm text-muted-foreground">{gradesDisplay}</div>
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
                {/* TODO: Create the edit page for packages */}
                <Link href={`/teacher/packages/${pkg.id}/edit`}>Edit</Link>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this package?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. Deleting a package will not delete the videos inside it. The videos will become unpackaged.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteConfirmed} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </td>
    </tr>
  )
}
