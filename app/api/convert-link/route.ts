import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

export async function POST(request: Request) {
  const { url } = await request.json()
  if (!url || !/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'URL inválida.' }, { status: 400 })
  const appId = process.env.SHOPEE_APP_ID
  const secret = process.env.SHOPEE_APP_SECRET
  if (!appId || !secret) return NextResponse.json({ shortUrl: url, mode: 'configuração pendente', signature: crypto.createHmac('sha256', 'preview').update(url).digest('hex') })
  const signature = crypto.createHmac('sha256', secret).update(`${appId}${url}`).digest('hex')
  return NextResponse.json({ shortUrl: url, signature, mode: 'ready' })
}
