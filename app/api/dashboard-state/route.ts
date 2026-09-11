import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

const STATE_ID = 'shared-admin'

export async function GET() {
  const result = await db.execute(sql`SELECT state, updated_at FROM dashboard_state WHERE id = ${STATE_ID}`)
  return NextResponse.json(result.rows[0] ?? { state: {}, updated_at: null })
}

export async function PUT(request: Request) {
  const payload = await request.json()
  const state = payload?.state
  if (!state || typeof state !== 'object') return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
  await db.execute(sql`INSERT INTO dashboard_state (id, state, updated_at) VALUES (${STATE_ID}, ${JSON.stringify(state)}::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`)
  return NextResponse.json({ ok: true, updated_at: new Date().toISOString() })
}
