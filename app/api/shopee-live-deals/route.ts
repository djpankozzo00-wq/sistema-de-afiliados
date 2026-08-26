import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'

type Credentials = { appId?: string; secretKey?: string; affiliateId?: string }

function sign(appId: string, secretKey: string, payload: string) {
  return createHmac('sha256', secretKey).update(`${appId}${payload}`).digest('hex')
}

function caption(title: string, price: number, original: number, url: string) {
  const discount = Math.round((1 - price / original) * 100)
  return `OFERTA RELÂMPAGO\n\n${title}\n\nPor apenas R$ ${price.toFixed(2).replace('.', ',')} (antes R$ ${original.toFixed(2).replace('.', ',')}) — ${discount}% OFF.\n\nConfira antes que acabe: ${url}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { credentials?: Credentials }
    const credentials = body.credentials || {}
    if (!credentials.appId || !credentials.secretKey || !credentials.affiliateId) {
      return NextResponse.json({ products: [], error: 'Configure App ID, Secret Key e Affiliate ID para ativar a busca ao vivo.' }, { status: 200 })
    }

    const endpoint = process.env.SHOPEE_AFFILIATE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql'
    const query = `query { productOfferV2(shopId: 0, limit: 10, sortType: 2) { nodes { productName imageUrl priceMin priceMax rating discount link } } }`
    const payload = JSON.stringify({ query })
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `SHA256 Credential=${credentials.appId}, Signature=${sign(credentials.appId, credentials.secretKey, payload)}` }, body: payload, cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || data.errors) return NextResponse.json({ products: [], error: data.errors?.[0]?.message || 'A Shopee recusou a consulta.' }, { status: 502 })
    const nodes = data.data?.productOfferV2?.nodes || []
    const products = nodes.map((item: { productName: string; imageUrl: string; priceMin: number; priceMax: number; rating: number; discount: number; link: string }, index: number) => {
      const originalPrice = Number(item.priceMax || item.priceMin || 0)
      const dealPrice = Number(item.priceMin || 0)
      const affiliateUrl = item.link || `https://shope.ee/${credentials.affiliateId}/${index}`
      return { id: `${index}-${Date.now()}`, title: item.productName, imageUrl: item.imageUrl, originalPrice, dealPrice, rating: Number(item.rating || 0), stock: 0, affiliateUrl, caption: caption(item.productName, dealPrice, originalPrice, affiliateUrl) }
    }).filter((item: { dealPrice: number }) => item.dealPrice > 0)
    return NextResponse.json({ products, refreshedAt: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ products: [], error: error instanceof Error ? error.message : 'Falha inesperada ao consultar a Shopee.' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true, service: 'shopee-live-deals' }) }
