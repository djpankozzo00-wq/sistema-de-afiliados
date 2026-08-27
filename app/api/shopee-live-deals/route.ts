import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

type Credentials = { appId?: string; secretKey?: string; affiliateId?: string }

function sign(appId: string, secretKey: string, payload: string, timestamp: number) {
  return createHash('sha256').update(`${appId}${timestamp}${payload}${secretKey}`).digest('hex')
}

function caption(title: string, price: number, original: number, url: string) {
  const discount = Math.round((1 - price / original) * 100)
  return `OFERTA RELÂMPAGO\n\n${title}\n\nPor apenas R$ ${price.toFixed(2).replace('.', ',')} (antes R$ ${original.toFixed(2).replace('.', ',')}) — ${discount}% OFF.\n\nConfira antes que acabe: ${url}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { credentials?: Credentials }
    const credentials = body.credentials || {}
    const secretKey = !credentials.secretKey || credentials.secretKey === 'process.env.API_KEY' ? process.env.API_KEY || '' : credentials.secretKey
    const appId = credentials.appId || '18336041241'
    const affiliateId = credentials.affiliateId || '18336041241'
    if (!appId || !secretKey || !affiliateId) {
      return NextResponse.json({ products: [], error: 'Configure App ID, Secret Key e Affiliate ID para ativar a busca ao vivo.' }, { status: 200 })
    }

    const endpoint = process.env.SHOPEE_AFFILIATE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql'
    const query = `query { productOfferV2(keyword: "", listType: 2, sortType: 2, page: 1, limit: 10) { nodes { itemId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate sales ratingStar commissionRate } } }`
    const payload = JSON.stringify({ query })
    const timestamp = Math.floor(Date.now() / 1000)
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${sign(appId, secretKey, payload, timestamp)}` }, body: payload, cache: 'no-store' })
    const data = await response.json() as { data?: { productOfferV2?: { nodes?: Array<{ itemId?: string | number; productName?: string; imageUrl?: string; priceMin?: number; priceMax?: number; ratingStar?: number; sales?: number; offerLink?: string; productLink?: string }> } }; errors?: Array<{ message?: string }> }
    if (!response.ok || data.errors) return NextResponse.json({ products: [], error: data.errors?.[0]?.message || 'A Shopee recusou a consulta. Verifique App ID, Secret Key e o endpoint da sua conta.' }, { status: 502 })
    const nodes = data.data?.productOfferV2?.nodes || []
    const products = nodes.map((item, index) => {
      const originalPrice = Number(item.priceMax || item.priceMin || 0)
      const dealPrice = Number(item.priceMin || 0)
      const affiliateUrl = item.offerLink || item.productLink || `https://shope.ee/${affiliateId}/${item.itemId || index}`
      return { id: `${item.itemId || index}-${Date.now()}`, title: item.productName || 'Oferta Shopee', imageUrl: item.imageUrl || '', originalPrice, dealPrice, rating: Number(item.ratingStar || 0), stock: Number(item.sales || 0), affiliateUrl, caption: caption(item.productName || 'Oferta Shopee', dealPrice, originalPrice, affiliateUrl) }
    }).filter((item) => item.dealPrice > 0)
    return NextResponse.json({ products, refreshedAt: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ products: [], error: error instanceof Error ? error.message : 'Falha inesperada ao consultar a Shopee.' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true, service: 'shopee-live-deals' }) }
