import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function GET() { const result = await db.execute(sql`SELECT provider, enabled, updated_at FROM integration_settings WHERE user_id = 'local-admin' ORDER BY provider`); return NextResponse.json(result.rows) }
export async function POST(request: Request) { const { provider, credentials } = await request.json(); if (!provider || !credentials) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 }); await db.execute(sql`INSERT INTO integration_settings (provider, credentials, updated_at) VALUES (${provider}, ${JSON.stringify(credentials)}::jsonb, NOW()) ON CONFLICT (user_id, provider) DO UPDATE SET credentials = EXCLUDED.credentials, updated_at = NOW(), enabled = TRUE`); return NextResponse.json({ ok: true }) }
