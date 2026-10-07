import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

const normalizeTitle = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')

export async function POST(request: Request) {
  try {
    const { caption, imageUrl, productId, title, affiliateUrl, chatIds, targetChatIds, forceLink, botToken } = await request.json() as { caption?: string; imageUrl?: string; productId?: string; title?: string; affiliateUrl?: string; chatIds?: string[]; targetChatIds?: string[]; forceLink?: boolean; botToken?: string }
    const token = String(botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim()
    const defaultChatId = process.env.TELEGRAM_CHAT_ID
    if (!token) return NextResponse.json({ error: 'Configure TELEGRAM_BOT_TOKEN.' }, { status: 503 })
    if (!caption?.trim()) return NextResponse.json({ error: 'A oferta não possui texto.' }, { status: 400 })
    if (!productId) return NextResponse.json({ error: 'Identificador do produto ausente.' }, { status: 400 })


    // Sempre inclui o grupo padrão do ambiente e soma os grupos enviados pelo painel.
    // Antes, quando chatIds existia, ele substituía TELEGRAM_CHAT_ID e apenas um destino recebia a oferta.
    const requestedIds = Array.isArray(targetChatIds) && targetChatIds.length ? targetChatIds : [defaultChatId, ...(chatIds || [])]
    const destinationIds = [...new Set(requestedIds.map((id) => String(id ?? '').trim() === 'default' ? String(defaultChatId || '') : String(id ?? '').trim()).filter(Boolean))]
    if (!destinationIds.length) return NextResponse.json({ error: 'Configure TELEGRAM_CHAT_ID ou adicione IDs de grupos nas configurações.' }, { status: 503 })

    const isAffiliateLinkOffer = forceLink === true || String(productId).startsWith('affiliate-')
    const normalizedIncomingTitle = normalizeTitle(title || '')
    const results: { chatId: string; success: boolean; method: string; error?: string }[] = []
    const base = `https://api.telegram.org/bot${token}`

    for (const chatId of destinationIds) {
      if (!isAffiliateLinkOffer) {
        const cooldown = chatId === String(defaultChatId || '') ? '24 hours' : '7 days'
        await db.execute(sql`DELETE FROM telegram_sent_offers WHERE (chat_id = ${defaultChatId} AND sent_at < NOW() - INTERVAL '24 hours') OR (chat_id <> ${defaultChatId} AND sent_at < NOW() - INTERVAL '7 days')`)
        const titleRows = await db.execute(sql`SELECT title FROM telegram_sent_offers WHERE chat_id = ${chatId} AND sent_at >= NOW() - ${cooldown}::interval`)
        const duplicateInThisGroup = titleRows.rows.some((row) => normalizeTitle(String(row.title || '')) === normalizedIncomingTitle)
        if (duplicateInThisGroup) {
          results.push({ chatId, success: false, method: 'skipped', error: 'Oferta já publicada anteriormente. Publicação bloqueada automaticamente.' })
          continue
        }
        await db.execute(sql`INSERT INTO telegram_sent_offers (product_id, chat_id, title, affiliate_url) VALUES (${productId}, ${chatId}, ${title || 'Oferta Shopee'}, ${affiliateUrl || ''})`)
      }
      try {
        const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[character] || character)
        const lines = caption.split('\n')
        const formattedCaption = `<b>${escapeHtml(lines[0] || '')}</b>${lines.slice(1).length ? `\n${lines.slice(1).map(escapeHtml).join('\n')}` : ''}`
        let endpoint = imageUrl ? `${base}/sendPhoto` : `${base}/sendMessage`
        let body = imageUrl
          ? { chat_id: chatId, photo: imageUrl, caption: formattedCaption.slice(0, 1024), parse_mode: 'HTML' }
          : { chat_id: chatId, text: formattedCaption.slice(0, 4096), parse_mode: 'HTML' }
        let response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
        let data = await response.json() as { ok?: boolean; description?: string }

        if ((!response.ok || !data.ok) && imageUrl) {
          endpoint = `${base}/sendMessage`
          body = { chat_id: chatId, text: formattedCaption.slice(0, 4096), parse_mode: 'HTML' }
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

    return NextResponse.json({ ok: allSucceeded, summary, results, sentChatIds: results.filter((result) => result.success).map((result) => result.chatId) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao enviar para o Telegram.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const scope = new URL(request.url).searchParams.get('scope')
    if (scope === '24h') await db.execute(sql`DELETE FROM telegram_sent_offers WHERE chat_id = ${process.env.TELEGRAM_CHAT_ID} AND sent_at < NOW() - INTERVAL '24 hours'`)
    else if (scope === '7d') await db.execute(sql`DELETE FROM telegram_sent_offers WHERE chat_id <> ${process.env.TELEGRAM_CHAT_ID} AND sent_at < NOW() - INTERVAL '7 days'`)
    else await db.execute(sql`DELETE FROM telegram_sent_offers`)
    return NextResponse.json({ ok: true, scope })
  } catch { return NextResponse.json({ error: 'Não foi possível limpar o histórico.' }, { status: 500 }) }
}

export async function GET() {
  try {
    // O painel mostra somente as publicações de hoje para facilitar o controle diário.
    // A consulta de bloqueio acima continua usando uma janela móvel de 24 horas por grupo.
    await db.execute(sql`DELETE FROM telegram_sent_offers WHERE sent_at < NOW() - CASE WHEN chat_id = ${process.env.TELEGRAM_CHAT_ID} THEN INTERVAL '24 hours' ELSE INTERVAL '7 days' END`)
    const result = await db.execute(sql`SELECT product_id, title, chat_id, affiliate_url, sent_at FROM telegram_sent_offers WHERE sent_at >= NOW() - INTERVAL '24 hours' ORDER BY sent_at DESC`)
    const weekResult = await db.execute(sql`SELECT product_id, title, chat_id, affiliate_url, sent_at FROM telegram_sent_offers WHERE sent_at >= NOW() - INTERVAL '7 days' ORDER BY sent_at DESC`)
    // O produto só volta a ficar disponível após o maior prazo configurado (7 dias).
    // Assim ele não reaparece no painel enquanto ainda estiver bloqueado em nenhum grupo.
    const configuredChatIds = [process.env.TELEGRAM_CHAT_ID].filter(Boolean).map(String)
    return NextResponse.json({ ok: true, sentProductIds: [], blockedProductIds: [], publishedTitles: weekResult.rows.map((row) => String(row.title || '')), history: result.rows, history24h: result.rows, history7d: weekResult.rows, configuredChatIds })
  } catch {
    return NextResponse.json({ ok: false, sentProductIds: [], error: 'Não foi possível consultar o histórico de ofertas.' }, { status: 500 })
  }
}
