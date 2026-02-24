'use client'

import { useState, useTransition } from "react"
import { updateQrMaxUses } from "@/server/qr-actions"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Edit2, Check, X, QrCode } from "lucide-react"

type QrToken = {
    id: string
    token: string
    user_id: string
    expires_at: string
    used: boolean
    is_permanent: boolean
    usage_count: number
    max_uses: number
    student_name: string
    student_username: string
    student_grade: number
}

export function QrManagementTable({ initialTokens }: { initialTokens: QrToken[] }) {
    const [tokens, setTokens] = useState(initialTokens)
    const [searchTerm, setSearchTerm] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<number>(0)
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const filteredTokens = tokens.filter(t =>
        t.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.student_username.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEdit = (token: QrToken) => {
        setEditingId(token.id)
        setEditValue(token.max_uses)
    }

    const handleSave = (id: string) => {
        if (editValue < 0) return

        startTransition(async () => {
            const res = await updateQrMaxUses(id, editValue)
            if (res.ok) {
                setTokens(tokens.map(t => t.id === id ? { ...t, max_uses: editValue, used: t.usage_count >= editValue } : t))
                setEditingId(null)
                toast({ title: "Success", description: "Usage limit updated" })
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" })
            }
        })
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by student name or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTokens.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No QR codes found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTokens.map((token) => (
                                <TableRow key={token.id}>
                                    <TableCell>
                                        <div className="font-medium">{token.student_name}</div>
                                        <div className="text-xs text-muted-foreground">{token.student_username}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200">
                                            Year {token.student_grade}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {editingId === token.id ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-semibold text-emerald-600">{token.usage_count}</span>
                                                    <span className="text-muted-foreground text-xs">/</span>
                                                    <Input
                                                        type="number"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                                                        className="w-16 h-8 py-0"
                                                        min={0}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-semibold text-emerald-600">{token.usage_count}</span>
                                                    <span className="text-muted-foreground text-xs">/</span>
                                                    <span className="text-sm">{token.max_uses}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {token.used ? (
                                            <Badge variant="destructive">Used Up</Badge>
                                        ) : new Date(token.expires_at) < new Date() ? (
                                            <Badge variant="outline">Expired</Badge>
                                        ) : (
                                            <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(token.expires_at).toLocaleDateString('ar-EG')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === token.id ? (
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => handleSave(token.id)} disabled={isPending}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)} disabled={isPending}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(token)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
