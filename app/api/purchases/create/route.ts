import { NextResponse } from 'next/server'
import { sql } from '@/server/db'
import { randomUUID } from 'crypto'
import bcrypt from "bcryptjs"

async function createPaymobAuthToken(apiKey: string) {
  const res = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  })
  return res.json()
}

async function createPaymobOrder(authToken: string, amount_cents: number, merchant_order_id: string) {
  const res = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents,
      currency: 'EGP',
      items: [],
      merchant_order_id,
    }),
  })
  return res.json()
}

async function createPaymentKey(authToken: string, integrationId: string, orderId: number, amount_cents: number, billingData: any) {
  const res = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents,
      expiration: 3600,
      order_id: orderId,
      billing_data: billingData,
      integration_id: Number(integrationId),
      currency: 'EGP',
    }),
  })
  return res.json()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const parent_phone = String(body.parent_phone ?? '').trim() || null
    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '').trim()
    const grade = Number(body.grade ?? 0)
    const teacher_id_input = String(body.teacher_id ?? '').trim()
    const student_type = String(body.student_type ?? 'center').trim()
    const packageId = body.packageId ? String(body.packageId).trim() : ''

    const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY
    const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID ?? process.env.paymob_integration_id_card
    const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID

    if (!PAYMOB_API_KEY || !PAYMOB_INTEGRATION_ID || !PAYMOB_IFRAME_ID) {
      return NextResponse.json({ ok: false, error: 'paymob_env_missing' }, { status: 500 })
    }

    let amount_cents = 0
    let monthsCount = 0
    let monthsArray: number[] = []
    let teacher_id = teacher_id_input

    if (packageId) {
      // New package-based flow
      if (!name || !phone || !username || !password || !grade) {
        return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
      }

      const [pkg] = (await sql`
        SELECT id, teacher_id, price
        FROM packages
        WHERE id = ${packageId}
        LIMIT 1;
      `) as { id: string; teacher_id: string; price: number }[]

      if (!pkg) {
        return NextResponse.json({ ok: false, error: 'package_not_found' }, { status: 404 })
      }

      teacher_id = pkg.teacher_id
      amount_cents = pkg.price // already stored in cents
    } else {
      // Legacy months-based flow (kept for backwards compatibility)
      const monthsInput = body.months
      monthsArray = Array.isArray(monthsInput)
        ? monthsInput.map(Number).filter((n) => !isNaN(n) && n > 0 && n < 13)
        : []
      monthsCount = monthsArray.length || Number(body.months_count ?? 0) || 1

      if (!name || !phone || !monthsCount || monthsCount < 1 || !username || !password || !grade || !teacher_id) {
        return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
      }

      const PRICE_PER_MONTH_EGP = Number(process.env.PRICE_PER_MONTH_EGP ?? 50)
      amount_cents = Math.round(monthsCount * PRICE_PER_MONTH_EGP * 100)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const claim = 'c_' + randomUUID()

    const auth = await createPaymobAuthToken(PAYMOB_API_KEY)
    const authToken = auth?.token
    if (!authToken) throw new Error('paymob auth failed: ' + JSON.stringify(auth))

    const order = await createPaymobOrder(authToken, amount_cents, claim)
    const orderId = order?.id
    if (!orderId) throw new Error('paymob order failed: ' + JSON.stringify(order))

    const billingData = {
      street: String(body.street ?? 'N/A'),
      building: String(body.building ?? 'N/A'),
      apartment: String(body.apartment ?? 'N/A'),
      email: String(body.email ?? `${phone}@example.com`),
      floor: String(body.floor ?? 'N/A'),
      first_name: String(name.split(' ')[0] ?? name),
      last_name: String(name.split(' ').slice(1).join(' ') || 'N/A'),
      phone_number: phone,
      shipping_method: String(body.shipping_method ?? 'N/A'),
      postal_code: String(body.postal_code ?? '00000'),
      city: String(body.city ?? 'Cairo'),
      country: String(body.country ?? 'EG'),
      state: String(body.state ?? 'Cairo'),
    }

    const key = await createPaymentKey(authToken, PAYMOB_INTEGRATION_ID, orderId, amount_cents, billingData)
    const payment_token = key?.token
    if (!payment_token) throw new Error('payment key failed: ' + JSON.stringify(key))

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${payment_token}`

    // store pending purchase with claim token
    await sql`
      INSERT INTO purchases (paymob_order_id, payment_token, claim_token, amount_cents, currency, months_count, months_list, customer_name, customer_phone, parent_phone, status, created_at, username, password_hash, grade, teacher_id, student_type, package_id)
      VALUES (
        ${String(orderId)},
        ${payment_token},
        ${claim},
        ${amount_cents},
        'EGP',
        ${monthsCount},
        ${JSON.stringify(monthsArray)},
        ${name},
        ${phone},
        ${parent_phone},
        'pending',
        NOW(),
        ${username},
        ${passwordHash},
        ${grade},
        ${teacher_id},
        ${student_type},
        ${packageId || null}
      )
    `

    return NextResponse.json({ ok: true, iframeUrl, payment_token, claim })
  } catch (err: any) {
    console.error("[CREATE PURCHASE ERROR]", err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
