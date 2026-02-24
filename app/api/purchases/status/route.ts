import { NextResponse } from 'next/server'
import { sql } from '@/server/db'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const claim = String(url.searchParams.get('claim') ?? '')
    if (!claim) return NextResponse.json({ ok: false, error: 'missing_claim' }, { status: 400 })

    const rows = (await sql`SELECT id, status, amount_cents, months_count, months_list FROM purchases WHERE claim_token = ${claim} LIMIT 1`) as any[]
    const p = rows[0]
    if (!p) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    return NextResponse.json({ ok: true, status: p.status, amount_cents: p.amount_cents, months_count: p.months_count, months_list: p.months_list })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
