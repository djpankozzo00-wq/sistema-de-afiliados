import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'


export async function POST(request: Request) {
  try {
    const { caption, imageUrl, productId, title, affiliateUrl, chatIds } = await request.json() as { caption?: string; imageUrl?: string; productId?: string; title?: string; affiliateUrl?: string; chatIds?: string[] }
    const token = process.env.TELEGRAM_BOT_TOKEN
    const defaultChatId = process.env.TELEGRAM_CHAT_ID
    if (!token) return NextResponse.json({ error: 'Configure TELEGRAM_BOT_TOKEN.' }, { status: 503 })
    if (!caption?.trim()) return NextResponse.json({ error: 'A oferta não possui texto.' }, { status: 400 })
    if (!productId) return NextResponse.json({ error: 'Identificador do produto ausente.' }, { status: 400 })

    const existing = await db.execute(sql`SELECT product_id FROM telegram_sent_offers WHERE product_id = ${productId} LIMIT 1`)
    if (existing.rows.length) return NextResponse.json({ alreadySent: true, error: 'Esta oferta já foi enviada anteriormente. Busque outra oferta.' }, { status: 409 })

    const destinationIds = [...new Set((chatIds && chatIds.length > 0 ? chatIds : [defaultChatId]).map((id) => String(id).trim()).filter(Boolean))]
    if (!destinationIds.length) return NextResponse.json({ error: 'Configure TELEGRAM_CHAT_ID ou adicione IDs de grupos nas configurações.' }, { status: 503 })

    const results: { chatId: string; success: boolean; method: string; error?: string }[] = []
    const base = `https://api.telegram.org/bot${token}`

    for (const chatId of destinationIds) {
      try {
        let endpoint = imageUrl ? `${base}/sendPhoto` : `${base}/sendMessage`
        let body = imageUrl
          ? { chat_id: chatId, photo: imageUrl, caption: caption.slice(0, 1024) }
          : { chat_id: chatId, text: caption.slice(0, 4096) }
        let response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
        let data = await response.json() as { ok?: boolean; description?: string }

        if ((!response.ok || !data.ok) && imageUrl) {
          endpoint = `${base}/sendMessage`
          body = { chat_id: chatId, text: caption.slice(0, 4096) }
          response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
          data = await response.json() as { ok?: boolean; description?: string }
        }

        if (!response.ok || !data.ok) {
          results.push({ chatId, success: false, method: 'unknown', error: data.description || 'Envio recusado' })
        } else {
          results.push({ chatId, success: true, method: endpoint.endsWith('sendPhoto') ? 'photo' : 'text' })
        }
      } catch (err) {
        results.push({ chatId, success: false, method: 'unknown', error: err instanceof Error ? err.message : 'Erro ao enviar' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    const allSucceeded = successCount === totalCount

    if (!allSucceeded && successCount === 0) {
      return NextResponse.json({ error: `Falha ao enviar para ${totalCount} destino(s). ${results[0]?.error || 'Confirme o bot está nos grupos e pode publicar.'}` }, { status: 502 })
    }

    await db.execute(sql`INSERT INTO telegram_sent_offers (product_id, title, affiliate_url) VALUES (${productId}, ${title || 'Oferta Shopee'}, ${affiliateUrl || ''}) ON CONFLICT (product_id) DO NOTHING`)

    const summary = totalCount === 1
      ? (allSucceeded ? '✓ Oferta enviada com sucesso.' : `✗ Falha ao enviar: ${results[0]?.error || 'erro desconhecido'}`)
      : (allSucceeded
        ? `✓ Oferta enviada para ${totalCount} destino(s).`
        : `⚠ Enviada para ${successCount}/${totalCount} destino(s). ${results.filter(r => !r.success).map(r => r.error).join('; ')}`)

    return NextResponse.json({ ok: allSucceeded, summary, results })
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
