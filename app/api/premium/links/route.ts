import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  if (body.password !== '031') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const token = randomBytes(32).toString('hex')
  await pool.query('INSERT INTO subscription_links (token, plan, price_cents) VALUES ($1, $2, $3)', [token, 'pending', 0])
  return NextResponse.json({ token, url: `/acesso/${token}` })
}
