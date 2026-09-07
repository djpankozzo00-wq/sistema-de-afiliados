import { NextResponse } from 'next/server'

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
const absoluteUrl = (value: string, base: string) => { try { return new URL(value, base).toString() } catch { return '' } }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const affiliateUrl = typeof body?.affiliateUrl === 'string' ? body.affiliateUrl.trim() : ''
    const parsed = new URL(affiliateUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL inválida')
    const response = await fetch(parsed.toString(), { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow', signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Não foi possível acessar o link')
    const html = await response.text()
    const getMeta = (property: string) => { const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i')); return match ? match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"') : '' }
    const title = clean(getMeta('og:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') || 'Oferta por link')
    const description = clean(getMeta('og:description') || getMeta('description') || 'Confira esta oferta especial.')
    const imageUrl = absoluteUrl(getMeta('og:image'), response.url || affiliateUrl)
    const getNumberMeta = (keys: string[]) => { for (const key of keys) { const value = getMeta(key).replace(/[^0-9,.-]/g, '').replace(/\.(?=[0-9]{3}(?:\D|$))/g, '').replace(',', '.'); const parsed = Number(value); if (Number.isFinite(parsed) && parsed > 0) return parsed } return 0 }
    const dealPrice = getNumberMeta(['product:price:amount', 'og:price:amount', 'price'])
    const originalPrice = getNumberMeta(['product:original_price:amount', 'og:original_price:amount', 'original_price']) || dealPrice
    const discount = originalPrice > dealPrice && dealPrice > 0 ? Math.round((1 - dealPrice / originalPrice) * 100) : 0
    const struck = (value: string) => value.split('').map((character) => `${character}\u0336`).join('')
    const productEmoji = /fone|áudio|headset|caixa de som/i.test(title) ? '🎧' : /tênis|sapato|sandália|chinelo/i.test(title) ? '👟' : /cozinha|panela|organizador|casa/i.test(title) ? '🏠' : /beleza|maquiagem|perfume|skincare/i.test(title) ? '✨' : /celular|eletrônico|smart|cabo|carregador/i.test(title) ? '📱' : '🛍️'
    const formattedPrice = dealPrice.toFixed(2).replace('.', ',')
    const formattedOriginal = originalPrice.toFixed(2).replace('.', ',')
    const caption = `🔥 OFERTA RELÂMPAGO 🔥\n\n${productEmoji} ${title}\n\n💰 Por apenas R$ ${formattedPrice}!\n${discount > 0 ? `🏷️ De ${struck(`R$ ${formattedOriginal}`)} por R$ ${formattedPrice} — ${discount}% OFF` : ''}\n⭐ Achadinho com preço especial\n\n🚀 Confira antes que acabe:\n${affiliateUrl}`
    const product = { id: `affiliate-${Date.now()}`, title, imageUrl, originalPrice, dealPrice, rating: 0, stock: 1, affiliateUrl, caption }
    return NextResponse.json({ product })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível preparar a oferta.' }, { status: 400 }) }
}
