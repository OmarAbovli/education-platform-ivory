"use client"

import { useState } from "react"
import { VideoPackage } from "@/server/package-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TeacherPackageRow } from "@/components/teacher-package-row"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CreatePackageForm } from "./create-package-form"

export function TeacherPackagesManager({ initialPackages }: { initialPackages: VideoPackage[] }) {
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Video Packages</CardTitle>
          <CardDescription>Manage your video packages.</CardDescription>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Package</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Package</DialogTitle>
            </DialogHeader>
            <CreatePackageForm onFinished={() => setCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {initialPackages.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven’t created any packages yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Grades</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialPackages.map((p) => (
                  <TeacherPackageRow key={p.id} pkg={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
