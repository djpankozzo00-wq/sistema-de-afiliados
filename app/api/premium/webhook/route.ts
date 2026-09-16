import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const raw = await request.text()
  const signature = request.headers.get('x-syncpay-signature') || ''
  const expected = createHmac('sha256', process.env.SYNC_PAY_WEBHOOK_SECRET || '').update(raw).digest('hex')
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  const event = JSON.parse(raw)
  const token = event.external_reference || event.metadata?.token
  const approved = ['approved', 'paid', 'completed'].includes(String(event.status || event.type).toLowerCase())
  if (token && approved) { const plan = event.metadata?.plan || 'mensal'; const days = plan === 'semanal' ? 7 : plan === 'mensal' ? 30 : null; await pool.query("UPDATE subscription_links SET status = 'approved', access_started_at = COALESCE(access_started_at, now()), access_expires_at = CASE WHEN $1::int IS NULL THEN NULL ELSE now() + ($1 || ' days')::interval END, updated_at = now() WHERE token = $2", [days, token]) }
  return NextResponse.json({ received: true })
}
