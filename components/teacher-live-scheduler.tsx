'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { scheduleLiveSession, deleteLiveSession, getScheduledLiveSessions } from '@/server/live-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { VideoPackage } from '@/server/package-actions'

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  embed_url: z.string().url('Must be a valid URL'),
  start_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  is_free: z.boolean().default(false),
  grades: z.object({
    1: z.boolean().default(false),
    2: z.boolean().default(false),
    3: z.boolean().default(false),
  }).default({ 1: false, 2: false, 3: false }),
})

type ScheduledSession = Awaited<ReturnType<typeof getScheduledLiveSessions>>[0]

export function TeacherLiveScheduler({
  initialSessions,
  packages,
}: {
  initialSessions: ScheduledSession[]
  packages: VideoPackage[]
}) {
  const [sessions, setSessions] = useState(initialSessions)
  const [isPending, startTransition] = useTransition()
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      embed_url: '',
      start_at: '',
      is_free: false,
      grades: { 1: false, 2: false, 3: false },
    },
  })

  function togglePackage(id: string) {
    setSelectedPackageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const selectedGrades = Object.entries(values.grades)
        .filter(([, checked]) => checked)
        .map(([grade]) => Number(grade))

      const result = await scheduleLiveSession({
        title: values.title,
        embed_url: values.embed_url,
        start_at: new Date(values.start_at),
        is_free: values.is_free,
        grades: selectedGrades,
        packageIds: selectedPackageIds,
      })

      if (result.ok) {
        form.reset()
        setSelectedPackageIds([])
        const updatedSessions = await getScheduledLiveSessions()
        setSessions(updatedSessions)
      } else {
        alert(result.error || 'Failed to schedule session')
      }
    })
  }

  const handleDelete = (sessionId: string) => {
    startTransition(async () => {
      const result = await deleteLiveSession(sessionId)
      if (result.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId))
      } else {
        alert(result.error || 'Failed to delete session')
      }
    })
  }

  const formErrors = form.formState.errors;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule a New Live Session</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            {form.formState.isSubmitted && Object.keys(formErrors).length > 0 && (
                <Alert variant="destructive">
                    <AlertDescription>
                        Please fix the errors below before submitting.
                    </AlertDescription>
                </Alert>
            )}

            <Input placeholder="Session Title" {...form.register('title')} />
            {formErrors.title && <p className="text-sm font-medium text-destructive">{formErrors.title.message}</p>}
            
            <Input placeholder="Embed URL (e.g., YouTube, Vimeo)" {...form.register('embed_url')} />
            {formErrors.embed_url && <p className="text-sm font-medium text-destructive">{formErrors.embed_url.message}</p>}

            <Input type="datetime-local" {...form.register('start_at')} />
            {formErrors.start_at && <p className="text-sm font-medium text-destructive">{formErrors.start_at.message}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Grades</Label>
                <div className="flex gap-4 mt-2">
                  {[1, 2, 3].map(grade => (
                    <div key={grade} className="flex items-center gap-2">
                      <Checkbox id={`grade-${grade}`} {...form.register(`grades.${grade}`)} />
                      <Label htmlFor={`grade-${grade}`}>Grade {grade}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Restrict to Packages (optional)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {packages.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={selectedPackageIds.includes(p.id)}
                        onCheckedChange={() => togglePackage(p.id)}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="is_free" {...form.register('is_free')} />
              <Label htmlFor="is_free">Free for everyone</Label>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? 'Scheduling...' : 'Schedule Session'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h3 className="font-semibold">Upcoming Sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no upcoming sessions scheduled.</p>
        ) : (
          <ul className="grid gap-3">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between rounded-md border bg-card p-3">
                <div>
                  <p className="font-medium">{session.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.start_at).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {session.is_free ? <Badge variant="secondary">Free</Badge> : <Badge variant="outline">Paid</Badge>}
                    {session.grades?.map(g => <Badge key={g} variant="outline">Grade {g}</Badge>)}
                    {session.package_ids?.map((pid) => {
                      const pkg = packages.find((p) => p.id === pid)
                      return (
                        <Badge key={pid} variant="outline">
                          {pkg?.name ?? 'Package'}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(session.id)} disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}