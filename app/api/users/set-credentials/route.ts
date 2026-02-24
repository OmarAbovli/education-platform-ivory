import { NextResponse } from 'next/server'
import { sql } from '@/server/db'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    const grade = Number(body.grade ?? 1)
    if (!username || !password) return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })

    // Identify current user from session cookie
    const sessionId = (req as any).cookies?.get?.('session_id')?.value ?? null
    // Fallback: try headers cookie parsing
    if (!sessionId) {
      const cookieHeader = (req as any).headers?.get('cookie') ?? ''
      const match = cookieHeader.match(/session_id=([^;]+)/)
      if (match) {
        (req as any).cookies = { get: (_k: string) => ({ value: match[1] }) }
      }
    }

    const sid = (req as any).cookies?.get?.('session_id')?.value
    const me = await getCurrentUser(sid)
    if (!me) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })
    if (me.role !== 'student') return NextResponse.json({ ok: false, error: 'invalid_role' }, { status: 403 })

    // Check username uniqueness
    const existing = (await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`) as any[]
    if (existing.length > 0) return NextResponse.json({ ok: false, error: 'username_taken' }, { status: 400 })

    const hash = await bcrypt.hash(password, 10)
    await sql`
      UPDATE users SET username = ${username}, password_hash = ${hash}, grade = ${grade}
      WHERE id = ${me.id} AND role = 'student'
    `

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
