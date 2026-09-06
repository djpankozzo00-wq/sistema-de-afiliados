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
    const product = { id: `affiliate-${Date.now()}`, title, imageUrl, originalPrice: 0, dealPrice: 0, rating: 0, stock: 1, affiliateUrl, caption: `${title}\n\n${description}\n\nConfira aqui: ${affiliateUrl}` }
    return NextResponse.json({ product })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível preparar a oferta.' }, { status: 400 }) }
}
