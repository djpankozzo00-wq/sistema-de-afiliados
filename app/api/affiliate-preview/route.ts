import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
const absoluteUrl = (value: string, base: string) => { try { return new URL(value, base).toString() } catch { return '' } }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const affiliateUrl = typeof body?.affiliateUrl === 'string' ? body.affiliateUrl.trim() : ''
    const parsed = new URL(affiliateUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL inválida')
    const credentials = body?.credentials as { appId?: string; secretKey?: string; affiliateId?: string } | undefined
    const secretKey = credentials?.secretKey && credentials.secretKey !== 'process.env.API_KEY' ? credentials.secretKey : process.env.API_KEY
    if (secretKey && credentials?.appId) {
      const endpoint = process.env.SHOPEE_AFFILIATE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql'
      const query = `query { productOfferV2(keyword: "${affiliateUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", listType: 2, sortType: 1, page: 1, limit: 10) { nodes { itemId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate sales ratingStar commissionRate } } }`
      const payload = JSON.stringify({ query })
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createHash('sha256').update(`${credentials.appId}${timestamp}${payload}${secretKey}`).digest('hex')
      const apiResponse = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `SHA256 Credential=${credentials.appId}, Timestamp=${timestamp}, Signature=${signature}` }, body: payload, cache: 'no-store' })
      const apiData = await apiResponse.json() as { data?: { productOfferV2?: { nodes?: Array<Record<string, unknown>> } } }
      const item = apiData.data?.productOfferV2?.nodes?.find((node) => String(node.offerLink || node.productLink || '').includes(parsed.pathname.split('/').pop() || '')) || apiData.data?.productOfferV2?.nodes?.[0]
      if (apiResponse.ok && item?.productName) {
        const dealPrice = Number(item.priceMin || 0); const discountRate = Number(item.priceDiscountRate || 0); const originalPrice = discountRate > 0 && discountRate < 100 ? dealPrice / (1 - discountRate / 100) : Number(item.priceMax || dealPrice); const finalUrl = String(item.offerLink || item.productLink || affiliateUrl); const discount = originalPrice > dealPrice ? Math.round((1 - dealPrice / originalPrice) * 100) : 0; const formatted = (value: number) => value.toFixed(2).replace('.', ','); const title = String(item.productName); const caption = `🔥 OFERTA RELÂMPAGO 🔥\\n\\n🛍️ ${title}\\n\\n💰 Por apenas R$ ${formatted(dealPrice)}!\\n${discount > 0 ? `🏷️ De R$ ${formatted(originalPrice)} por R$ ${formatted(dealPrice)} — ${discount}% OFF\\n` : ''}⭐ Achadinho com preço especial\\n\\n🚀 Confira antes que acabe:\\n${finalUrl}`
        return NextResponse.json({ product: { id: `affiliate-${item.itemId || Date.now()}`, title, imageUrl: String(item.imageUrl || ''), originalPrice, dealPrice, rating: Number(item.ratingStar || 0), commissionRate: Number(item.commissionRate || 0), stock: Number(item.sales || 0), affiliateUrl: finalUrl, caption } })
      }
    }
    const response = await fetch(parsed.toString(), { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow', signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Não foi possível acessar o link')
    const html = await response.text()
    const decode = (value: string) => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    const getMeta = (property: string) => { const escaped = property.replace(':', '\\:'); const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i')); return match ? decode(match[1]) : '' }
    const title = clean(getMeta('og:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') || 'Oferta por link')
    const description = clean(getMeta('og:description') || getMeta('description') || 'Confira esta oferta especial.')
    const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap((match) => { try { const value = JSON.parse(match[1].trim()); return Array.isArray(value) ? value : [value] } catch { return [] } })
    const offer = jsonLdBlocks.map((value) => value?.offers).find((value) => value && !Array.isArray(value)) || jsonLdBlocks.find((value) => value?.price || value?.offers?.price)?.offers || {}
    const imageCandidate = getMeta('og:image') || getMeta('twitter:image') || jsonLdBlocks.flatMap((value) => { const image = value?.image; return Array.isArray(image) ? image : [typeof image === 'object' ? image?.url : image] }).find(Boolean) || ''
    const htmlImage = html.match(/<(?:img|meta)[^>]+(?:src|data-src|content)=["']([^"']+)["']/i)?.[1] || html.match(/https?:\\?\/[^"'\\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\s]*)?/i)?.[0] || ''
    const imageUrl = absoluteUrl(String(imageCandidate || htmlImage), response.url || affiliateUrl)
    const getNumber = (value: unknown) => { const text = String(value ?? '').replace(/[^0-9,.-]/g, '').replace(/\.(?=[0-9]{3}(?:\D|$))/g, '').replace(',', '.'); const parsed = Number(text); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0 }
    const getNumberMeta = (keys: string[]) => keys.map((key) => getNumber(getMeta(key))).find((value) => value > 0) || 0
    const dealPrice = getNumber(offer?.price) || getNumberMeta(['product:price:amount', 'og:price:amount', 'price']) || getNumber((html.match(/(?:R\$|BRL)\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/i) || [])[1])
    const originalPrice = getNumber(offer?.highPrice) || getNumberMeta(['product:original_price:amount', 'og:original_price:amount', 'original_price']) || dealPrice
    const discount = originalPrice > dealPrice && dealPrice > 0 ? Math.round((1 - dealPrice / originalPrice) * 100) : 0
    const rating = getNumber(offer?.ratingValue) || getNumberMeta(['product:rating', 'rating', 'og:rating'])
    const stock = getNumber(offer?.inventoryLevel) || getNumberMeta(['product:availability', 'availability'])
    const struck = (value: string) => value.split('').map((character) => `${character}\u0336`).join('')
    const productEmoji = /fone|áudio|headset|caixa de som/i.test(title) ? '🎧' : /tênis|sapato|sandália|chinelo/i.test(title) ? '👟' : /cozinha|panela|organizador|casa/i.test(title) ? '🏠' : /beleza|maquiagem|perfume|skincare/i.test(title) ? '✨' : /celular|eletrônico|smart|cabo|carregador/i.test(title) ? '📱' : '🛍️'
    const formattedPrice = dealPrice.toFixed(2).replace('.', ',')
    const formattedOriginal = originalPrice.toFixed(2).replace('.', ',')
    const caption = `🔥 OFERTA RELÂMPAGO 🔥\n\n${productEmoji} ${title}\n\n💰 Por apenas R$ ${formattedPrice}!\n${discount > 0 ? `🏷️ De ${struck(`R$ ${formattedOriginal}`)} por R$ ${formattedPrice} — ${discount}% OFF` : ''}\n⭐ Achadinho com preço especial\n\n🚀 Confira antes que acabe:\n${affiliateUrl}`
    const product = { id: `affiliate-${Date.now()}`, title, imageUrl, originalPrice, dealPrice, rating: rating || 0, stock: stock || 1, affiliateUrl, caption }
    return NextResponse.json({ product })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível preparar a oferta.' }, { status: 400 }) }
}
