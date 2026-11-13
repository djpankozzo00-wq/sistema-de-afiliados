import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  const inviteUrl = 'https://t.me/+xc3ztvB9qLZjNGE5'
  const imageUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20260827_215111_432-cPhPXBaX6OYZLBVAhaB1PFxJhwDr1P.jpg'
  const caption = '✨ ACHADINHOS PREMIUM ✨\n\n🔥 Quer receber ofertas exclusivas, descontos especiais e achadinhos selecionados da Shopee?\n\n🛍️ Entre agora no nosso grupo Premium e não perca nenhuma oportunidade!\n\n🎁 Ofertas selecionadas todos os dias\n💰 Preços especiais\n⚡ Promoções por tempo limitado\n\n👉 Entre no grupo: ' + inviteUrl
  const base = `https://api.telegram.org/bot${token}`
  let response = await fetch(`${base}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, photo: imageUrl, caption }), cache: 'no-store' })
  let result = await response.json() as { ok?: boolean; description?: string }
  if (!response.ok || !result.ok) {
    response = await fetch(`${base}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: caption }), cache: 'no-store' })
    result = await response.json() as { ok?: boolean; description?: string }
  }
  if (!response.ok || !result.ok) throw new Error(result.description || 'O Telegram recusou o envio.')
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  try {
    await ensureScheduleTable()
    const claimed = await db.execute(sql`UPDATE premium_invite_schedule
      SET locked_until = NOW() + INTERVAL '5 minutes', updated_at = NOW()
      WHERE id = 'achadinhos-premium' AND enabled = TRUE AND next_run_at <= NOW()
        AND (locked_until IS NULL OR locked_until < NOW())
      RETURNING chat_id`)
    if (!claimed.rows.length) return NextResponse.json({ ok: true, sent: false, message: 'Nenhuma publicação pendente.' })

    const chatId = '-1003323444997'
    const settings = await db.execute(sql`SELECT credentials FROM integration_settings
      WHERE user_id = 'local-admin' AND provider = 'telegram' AND enabled = TRUE LIMIT 1`)
    const credentials = settings.rows[0]?.credentials as { telegramBotToken?: string } | undefined
    const token = String(credentials?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim()
    if (!token) throw new Error('Token do bot não encontrado nas configurações do servidor.')

    await sendInvite(token, chatId)
    await db.execute(sql`UPDATE premium_invite_schedule
      SET next_run_at = GREATEST(next_run_at + INTERVAL '24 hours', NOW() + INTERVAL '1 minute'),
          locked_until = NULL, updated_at = NOW()
      WHERE id = 'achadinhos-premium'`)
    return NextResponse.json({ ok: true, sent: true, chatId })
  } catch (error) {
    await db.execute(sql`UPDATE premium_invite_schedule SET locked_until = NULL, updated_at = NOW() WHERE id = 'achadinhos-premium'`).catch(() => undefined)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha no envio agendado.' }, { status: 500 })
  }
}
