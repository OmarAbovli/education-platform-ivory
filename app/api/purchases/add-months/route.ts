
import { NextResponse } from 'next/server'
import { sql } from '@/server/db'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'

// Copied from create/route.ts - consider refactoring to a shared lib
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

async function createPaymentKey(
  authToken: string,
  integrationId: string,
  orderId: number,
  amount_cents: number,
  billingData: any,
) {
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
    // 1. Authenticate user
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionCookie)
    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    // 2. Get and validate input
    const body = await req.json()
    const monthsInput = body.months
    const teacherId = body.teacherId
    const monthsArray: number[] = Array.isArray(monthsInput)
      ? monthsInput.map(Number).filter((n) => !isNaN(n) && n > 0 && n < 13)
      : []
    const monthsCount = monthsArray.length

    if (monthsCount === 0 || !teacherId) {
      return NextResponse.json({ ok: false, error: 'missing_months_or_teacher' }, { status: 400 })
    }

    // 3. Get Paymob config
    const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY
    const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID ?? process.env.paymob_integration_id_card
    const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID
    const PRICE_PER_MONTH_EGP = Number(process.env.PRICE_PER_MONTH_EGP ?? 50)

    if (!PAYMOB_API_KEY || !PAYMOB_INTEGRATION_ID || !PAYMOB_IFRAME_ID) {
      return NextResponse.json({ ok: false, error: 'paymob_env_missing' }, { status: 500 })
    }

    // 4. Create Paymob transaction
    const amount_cents = Math.round(monthsCount * PRICE_PER_MONTH_EGP * 100)
    const claim = 'c_' + randomUUID()

    const auth = await createPaymobAuthToken(PAYMOB_API_KEY)
    const authToken = auth?.token
    if (!authToken) throw new Error('paymob auth failed: ' + JSON.stringify(auth))

    const order = await createPaymobOrder(authToken, amount_cents, claim)
    const orderId = order?.id
    if (!orderId) throw new Error('paymob order failed: ' + JSON.stringify(order))

    // Use user's existing data for billing
    const billingData = {
      email: user.email || `${user.phone}@example.com`,
      first_name: user.name?.split(' ')[0] ?? 'N/A',
      last_name: user.name?.split(' ').slice(1).join(' ') || 'N/A',
      phone_number: user.phone ?? 'N/A',
      street: "N/A",
      building: "N/A",
      apartment: "N/A",
      floor: "N/A",
      shipping_method: "N/A",
      postal_code: "00000",
      city: "Cairo",
      country: "EG",
      state: "Cairo",
    }

    const key = await createPaymentKey(authToken, PAYMOB_INTEGRATION_ID, orderId, amount_cents, billingData)
    const payment_token = key?.token
    if (!payment_token) throw new Error('payment key failed: ' + JSON.stringify(key))

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${payment_token}`

    // 5. Store pending purchase, linking it to the existing user and teacher
    await sql`
      INSERT INTO purchases (user_id, teacher_id, paymob_order_id, payment_token, claim_token, amount_cents, currency, months_count, months_list, status, created_at, customer_name, customer_phone)
      VALUES (${user.id}, ${teacherId}, ${String(
      orderId,
    )}, ${payment_token}, ${claim}, ${amount_cents}, 'EGP', ${monthsCount}, ${JSON.stringify(
      monthsArray,
    )}, 'pending', NOW(), ${user.name}, ${user.phone})
    `

    return NextResponse.json({ ok: true, iframeUrl })
  } catch (err: any) {
    console.error("[ADD_MONTHS_PURCHASE_ERROR]", err)
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
