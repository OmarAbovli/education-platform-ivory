import { NextResponse } from 'next/server'
import { sql } from '@/server/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('Paymob Webhook: Received body', JSON.stringify(body, null, 2));

    // Paymob sends different shapes, try to extract order id and our claim token (merchant_order_id)
    const orderId = body?.obj?.order?.id ?? body?.order?.id ?? body?.order_id ?? body?.data?.id ?? null
    const claimToken = body?.obj?.order?.merchant_order_id ?? body?.order?.merchant_order_id ?? null
    console.log('Paymob Webhook: Extracted orderId', orderId, 'and claimToken', claimToken);

    if (!orderId && !claimToken) {
      console.error('Paymob Webhook: Missing both order_id and merchant_order_id in payload');
      return NextResponse.json({ ok: false, error: 'missing_order_id' }, { status: 400 })
    }

    // Heuristics to detect paid
    const success = body?.obj?.success ?? body?.success ?? body?.is_paid ?? false
    console.log('Paymob Webhook: Extracted success status', success);

    if (success) {
      console.log(`Paymob Webhook: Payment successful for orderId ${orderId}. Updating purchase status.`);
      if (claimToken) {
        await sql`
          UPDATE purchases SET status = 'paid', paid_at = NOW()
          WHERE claim_token = ${String(claimToken)}
        `
        console.log(`Paymob Webhook: Purchase status updated for claimToken ${claimToken}.`);
      } else if (orderId) {
        // Fallback to old method if claim token is not present
        await sql`
          UPDATE purchases SET status = 'paid', paid_at = NOW()
          WHERE paymob_order_id = ${String(orderId)}
        `
        console.log(`Paymob Webhook: Purchase status updated for orderId ${orderId} using fallback.`);
      }
    } else {
      console.log(`Paymob Webhook: Payment not successful for orderId ${orderId}. Status: ${success}`);
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Paymob Webhook: Caught error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
