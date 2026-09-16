import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const raw = await request.text()
  const authorization = request.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.SYNC_PAY_WEBHOOK_SECRET || ''}`
  if (!process.env.SYNC_PAY_WEBHOOK_SECRET || authorization !== expected) return NextResponse.json({ error: 'Autorização do webhook inválida' }, { status: 401 })
  const event = JSON.parse(raw)
  const paymentId = event.id || event.identifier || event.reference_id
  const status = String(event.status || '').toLowerCase()
  const approved = ['approved', 'paid', 'completed', 'success', 'succeeded'].includes(status)
  if (paymentId && approved) { await pool.query("UPDATE subscription_links SET status = 'approved', access_started_at = COALESCE(access_started_at, now()), access_expires_at = CASE WHEN plan = 'vitalicio' THEN NULL WHEN plan = 'semanal' THEN COALESCE(access_expires_at, now()) + interval '7 days' WHEN plan = 'mensal' THEN COALESCE(access_expires_at, now()) + interval '30 days' ELSE access_expires_at END, updated_at = now() WHERE payment_id = $1", [paymentId]) }
  return NextResponse.json({ received: true })
}
