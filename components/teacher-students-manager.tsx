'use client'

import { useState } from "react"
import { getMyStudents, getMyStudentsFiltered } from "@/server/teacher-actions"
import type { VideoPackage } from "@/server/package-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TeacherStudentRow } from "@/components/teacher-student-row"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { useDebouncedCallback } from "use-debounce"

// Define the student type based on the return type of getMyStudents
type Student = Awaited<ReturnType<typeof getMyStudents>>[0]

export default function TeacherStudentsManager({ packages }: { packages: VideoPackage[] }) {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleFetch = async () => {
    if (hasFetched) return
    setIsLoading(true)
    try {
      const studentData = await getMyStudents()
      setStudents(studentData as Student[])
      setHasFetched(true)
    } catch (error) {
      console.error("Failed to fetch students:", error)
      // Optionally, set an error state to show in the UI
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccordionToggle = (value: string) => {
    const isOpening = value === "students-list"
    setIsOpen(isOpening)
    if (isOpening && !hasFetched) {
      handleFetch()
    }
  }

  const handleSearch = useDebouncedCallback(async (term: string) => {
    setIsLoading(true)
    try {
      const studentData = await getMyStudentsFiltered({ q: term })
      setStudents(studentData as Student[])
    } catch (error) {
      console.error("Failed to search students:", error)
    } finally {
      setIsLoading(false)
    }
  }, 300)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Students</CardTitle>
        <CardDescription>Credentials, classification, and package-based access per student.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible onValueChange={handleAccordionToggle}>
          <AccordionItem value="students-list">
            <AccordionTrigger className="text-base font-medium">Show/Hide Student List</AccordionTrigger>
            <AccordionContent className="grid gap-4 pt-4">
              {isOpen && (
                <Input
                  placeholder="Search by name or username..."
                  onChange={(e) => handleSearch(e.target.value)}
                />
              )}
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading students...</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pl-3 font-medium">Student</th>
                        <th className="py-2 px-3 font-medium">Grade</th>
                        <th className="py-2 px-3 font-medium">Credentials & Classification</th>
                        <th className="py-2 px-3 font-medium">Teacher Packages</th>
                        <th className="py-2 px-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <TeacherStudentRow key={s.id} student={s as any} packages={packages} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
