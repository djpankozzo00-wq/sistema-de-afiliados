import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

async function ensureTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS affiliate_deals (id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'local-admin', raw_url TEXT NOT NULL, short_url TEXT, title TEXT NOT NULL DEFAULT 'Novo achadinho da Shopee', image_url TEXT, caption TEXT, scheduled_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'Pendente', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
}

export async function GET() {
  try { await ensureTable(); const result = await db.execute(sql`SELECT id, raw_url, short_url, title, image_url, caption, scheduled_at, status, created_at FROM affiliate_deals WHERE user_id = 'local-admin' ORDER BY created_at DESC LIMIT 100`); return NextResponse.json(result.rows) } catch { return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try { const body = await request.json(); await ensureTable(); const result = await db.execute(sql`INSERT INTO affiliate_deals (raw_url, short_url, title, image_url, caption, scheduled_at) VALUES (${body.rawUrl}, ${body.shortUrl ?? body.rawUrl}, ${body.title ?? 'Novo achadinho da Shopee'}, ${body.imageUrl ?? null}, ${body.caption ?? null}, ${body.scheduledAt ? new Date(body.scheduledAt) : null}) RETURNING id, raw_url, short_url, title, image_url, caption, scheduled_at, status`); return NextResponse.json(result.rows[0], { status: 201 }) } catch { return NextResponse.json({ error: 'Não foi possível salvar o agendamento.' }, { status: 500 }) }
}

export async function DELETE(request: Request) { try { const { id } = await request.json(); await ensureTable(); await db.execute(sql`DELETE FROM affiliate_deals WHERE id = ${id} AND user_id = 'local-admin'`); return NextResponse.json({ ok: true }) } catch { return NextResponse.json({ error: 'Falha ao remover.' }, { status: 500 }) } }
