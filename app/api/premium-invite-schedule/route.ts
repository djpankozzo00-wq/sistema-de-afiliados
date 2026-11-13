import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INVITE_URL = 'https://t.me/+xc3ztvB9qLZjNGE5'
const IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20260827_215111_432-cPhPXBaX6OYZLBVAhaB1PFxJhwDr1P.jpg'
const CAPTION = '✨ ACHADINHOS PREMIUM ✨\n\n🔥 Quer receber ofertas exclusivas, descontos especiais e achadinhos selecionados da Shopee?\n\n🛍️ Entre agora no nosso grupo Premium e não perca nenhuma oportunidade!\n\n🎁 Ofertas selecionadas todos os dias\n💰 Preços especiais\n⚡ Promoções por tempo limitado\n\n👉 Entre no grupo: ' + INVITE_URL

async function ensureScheduleTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS premium_invite_schedule (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    next_run_at TIMESTAMPTZ NOT NULL,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
}

async function sendInvite(token: string, chatId: string) {
  const base = `https://api.telegram.org/bot${token}`
  let response = await fetch(`${base}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: IMAGE_URL, caption: CAPTION }),
    cache: 'no-store',
  })
  let result = await response.json() as { ok?: boolean; description?: string }
  if (!response.ok || !result.ok) {
    response = await fetch(`${base}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: CAPTION }),
      cache: 'no-store',
    })
    result = await response.json() as { ok?: boolean; description?: string }
  }
  if (!response.ok || !result.ok) throw new Error(result.description || 'O Telegram recusou o envio.')
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { botToken?: string; chatId?: string }
    const token = String(body.botToken || '').trim()
    const chatId = String(body.chatId || '').trim()
    if (!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(token)) {
      return NextResponse.json({ error: 'Token do Bot inválido. Confira as configurações do Telegram.' }, { status: 400 })
    }
    if (!chatId) return NextResponse.json({ error: 'Chat ID do Grupo 1 não informado.' }, { status: 400 })

    await ensureScheduleTable()
    await db.execute(sql`INSERT INTO integration_settings (provider, credentials, updated_at)
      VALUES ('telegram', ${JSON.stringify({ telegramBotToken: token, telegramChatIds: chatId })}::jsonb, NOW())
      ON CONFLICT (user_id, provider) DO UPDATE
      SET credentials = EXCLUDED.credentials, updated_at = NOW(), enabled = TRUE`)

    await sendInvite(token, chatId)
    await db.execute(sql`INSERT INTO premium_invite_schedule (id, chat_id, enabled, next_run_at, locked_until, updated_at)
      VALUES ('achadinhos-premium', ${chatId}, TRUE, NOW() + INTERVAL '24 hours', NULL, NOW())
      ON CONFLICT (id) DO UPDATE SET chat_id = EXCLUDED.chat_id, enabled = TRUE,
        next_run_at = NOW() + INTERVAL '24 hours', locked_until = NULL, updated_at = NOW()`)

    return NextResponse.json({ ok: true, message: 'Convite publicado agora. A próxima publicação ficou programada para o mesmo horário amanhã.' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível publicar e programar o convite.' }, { status: 500 })
  }
}
