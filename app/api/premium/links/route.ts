import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

const plans = { semanal: { price: 3899, days: 7 }, mensal: { price: 5960, days: 30 }, vitalicio: { price: 12590, days: null } } as const

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  if (body.password !== '031') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const plan = plans[body.plan as keyof typeof plans] ?? plans.semanal
  const token = randomBytes(32).toString('hex')
  await pool.query('INSERT INTO subscription_links (token, plan, price_cents) VALUES ($1, $2, $3)', [token, body.plan ?? 'semanal', plan.price])
  return NextResponse.json({ token, url: `/acesso/${token}` })
}
