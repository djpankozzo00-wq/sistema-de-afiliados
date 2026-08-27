import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'


export async function POST(request: Request) {
  try {
    const { caption, imageUrl, productId, title, affiliateUrl } = await request.json() as { caption?: string; imageUrl?: string; productId?: string; title?: string; affiliateUrl?: string }
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) return NextResponse.json({ error: 'Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.' }, { status: 503 })
    if (!caption?.trim()) return NextResponse.json({ error: 'A oferta não possui texto.' }, { status: 400 })
    if (!productId) return NextResponse.json({ error: 'Identificador do produto ausente.' }, { status: 400 })

    const existing = await db.execute(sql`SELECT product_id FROM telegram_sent_offers WHERE product_id = ${productId} LIMIT 1`)
    if (existing.rows.length) return NextResponse.json({ alreadySent: true, error: 'Esta oferta já foi enviada anteriormente. Busque outra oferta.' }, { status: 409 })

    const base = `https://api.telegram.org/bot${token}`
    const endpoint = imageUrl ? `${base}/sendPhoto` : `${base}/sendMessage`
    const body = imageUrl
      ? { chat_id: chatId, photo: imageUrl, caption: caption.slice(0, 1024) }
      : { chat_id: chatId, text: caption.slice(0, 4096) }
    let response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
    let data = await response.json() as { ok?: boolean; description?: string }

    // Algumas imagens da Shopee bloqueiam o download pelo Telegram. Nesse caso,
    // preservamos o disparo enviando a copy como texto em vez de falhar silenciosamente.
    if ((!response.ok || !data.ok) && imageUrl) {
      response = await fetch(`${base}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: caption.slice(0, 4096) }), cache: 'no-store' })
      data = await response.json() as { ok?: boolean; description?: string }
    }
    if (!response.ok || !data.ok) return NextResponse.json({ error: data.description || 'O Telegram recusou o envio. Confirme se o bot está no grupo e pode publicar mensagens.' }, { status: 502 })
    await db.execute(sql`INSERT INTO telegram_sent_offers (product_id, title, affiliate_url) VALUES (${productId}, ${title || 'Oferta Shopee'}, ${affiliateUrl || ''}) ON CONFLICT (product_id) DO NOTHING`)
    return NextResponse.json({ ok: true, sentAs: imageUrl && endpoint.endsWith('sendPhoto') ? 'photo' : 'text' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao enviar para o Telegram.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT product_id FROM telegram_sent_offers ORDER BY sent_at DESC`)
    return NextResponse.json({ ok: true, sentProductIds: result.rows.map((row) => String(row.product_id)) })
  } catch {
    return NextResponse.json({ ok: false, sentProductIds: [], error: 'Não foi possível consultar o histórico de ofertas.' }, { status: 500 })
  }
}
