import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'


export async function POST(request: Request) {
  try {
    const { caption, imageUrl, productId, title, affiliateUrl, chatIds, targetChatIds } = await request.json() as { caption?: string; imageUrl?: string; productId?: string; title?: string; affiliateUrl?: string; chatIds?: string[]; targetChatIds?: string[] }
    const token = process.env.TELEGRAM_BOT_TOKEN
    const defaultChatId = process.env.TELEGRAM_CHAT_ID
    if (!token) return NextResponse.json({ error: 'Configure TELEGRAM_BOT_TOKEN.' }, { status: 503 })
    if (!caption?.trim()) return NextResponse.json({ error: 'A oferta não possui texto.' }, { status: 400 })
    if (!productId) return NextResponse.json({ error: 'Identificador do produto ausente.' }, { status: 400 })

        // O bloqueio é verificado por produto + grupo, permitindo enviar a mesma oferta a outro grupo.

    // Sempre inclui o grupo padrão do ambiente e soma os grupos enviados pelo painel.
    // Antes, quando chatIds existia, ele substituía TELEGRAM_CHAT_ID e apenas um destino recebia a oferta.
    const requestedIds = Array.isArray(targetChatIds) && targetChatIds.length ? targetChatIds : [defaultChatId, ...(chatIds || [])]
    const destinationIds = [...new Set(requestedIds.map((id) => String(id ?? '').trim()).filter(Boolean))]
    if (!destinationIds.length) return NextResponse.json({ error: 'Configure TELEGRAM_CHAT_ID ou adicione IDs de grupos nas configurações.' }, { status: 503 })

    const results: { chatId: string; success: boolean; method: string; error?: string }[] = []
    const base = `https://api.telegram.org/bot${token}`

    for (const chatId of destinationIds) {
      // Reserva atômica: impede dois cliques/requisições simultâneas de publicar a mesma oferta no mesmo grupo.
      const reservation = await db.execute(sql`INSERT INTO telegram_sent_offers (product_id, chat_id, title, affiliate_url) VALUES (${productId}, ${chatId}, ${title || 'Oferta Shopee'}, ${affiliateUrl || ''}) ON CONFLICT (product_id, chat_id) DO UPDATE SET title = EXCLUDED.title, affiliate_url = EXCLUDED.affiliate_url, sent_at = NOW() WHERE telegram_sent_offers.sent_at < NOW() - INTERVAL '24 hours'`)
      if (!reservation.rowCount) {
        results.push({ chatId, success: false, method: 'skipped', error: 'Oferta já enviada anteriormente neste grupo' })
        continue
      }
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
          await db.execute(sql`DELETE FROM telegram_sent_offers WHERE product_id = ${productId} AND chat_id = ${chatId}`)
          results.push({ chatId, success: false, method: 'unknown', error: data.description || 'Envio recusado' })
        } else {
          results.push({ chatId, success: true, method: endpoint.endsWith('sendPhoto') ? 'photo' : 'text' })
        }
      } catch (err) {
        await db.execute(sql`DELETE FROM telegram_sent_offers WHERE product_id = ${productId} AND chat_id = ${chatId}`)
        results.push({ chatId, success: false, method: 'unknown', error: err instanceof Error ? err.message : 'Erro ao enviar' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    const allSucceeded = successCount === totalCount

    if (!allSucceeded && successCount === 0) {
      return NextResponse.json({ error: `Falha ao enviar para ${totalCount} destino(s). ${results[0]?.error || 'Confirme o bot está nos grupos e pode publicar.'}` }, { status: 502 })
    }

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
    const result = await db.execute(sql`SELECT product_id, title, sent_at FROM telegram_sent_offers ORDER BY sent_at DESC LIMIT 500`)
    const recent = await db.execute(sql`SELECT DISTINCT product_id FROM telegram_sent_offers WHERE sent_at >= NOW() - INTERVAL '24 hours'`)
    const configuredChatIds = [process.env.TELEGRAM_CHAT_ID].filter(Boolean).map(String)
    return NextResponse.json({ ok: true, sentProductIds: recent.rows.map((row) => String(row.product_id)), history: result.rows, configuredChatIds })
  } catch {
    return NextResponse.json({ ok: false, sentProductIds: [], error: 'Não foi possível consultar o histórico de ofertas.' }, { status: 500 })
  }
}
