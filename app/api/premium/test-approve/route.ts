import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const { token, plan, groups } = await request.json().catch(() => ({}))
  if (typeof token !== 'string' || !token.startsWith('test_')) return NextResponse.json({ error: 'Link de teste inválido.' }, { status: 400 })
  const days = plan === 'semanal' ? 7 : plan === 'mensal' ? 30 : null
  const prices: Record<string, number> = { semanal: 3899, mensal: 5960, vitalicio: 12590 }
  await pool.query("UPDATE subscription_links SET status = 'approved', plan = $1, price_cents = $2, group_count = $3, access_started_at = now(), access_expires_at = CASE WHEN $4::int IS NULL THEN NULL ELSE now() + ($4 || ' days')::interval END, updated_at = now() WHERE token = $5", [plan, prices[plan] || 5960, Math.min(3, Math.max(1, Number(groups) || 1)), days, token])
  return NextResponse.json({ approved: true })
}
