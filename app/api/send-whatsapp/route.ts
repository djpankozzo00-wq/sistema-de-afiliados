import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { caption, text, imageUrl, groupId } = await request.json()
  const baseUrl = process.env.EVOLUTION_API_BASE_URL
  const instance = process.env.EVOLUTION_API_INSTANCE
  const token = process.env.EVOLUTION_API_TOKEN
  if (!baseUrl || !instance || !token) return NextResponse.json({ ok: false, error: 'Configure a Evolution API em Configurações.' }, { status: 503 })
  const endpoint = imageUrl ? `${baseUrl.replace(/\/$/,'')}/message/sendMedia/${instance}` : `${baseUrl.replace(/\/$/,'')}/message/sendText/${instance}`
  const body = imageUrl ? { number: groupId, mediatype: 'image', media: imageUrl, caption: caption ?? text } : { number: groupId, text: text ?? caption }
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: token }, body: JSON.stringify(body) })
  return NextResponse.json({ ok: response.ok, data: await response.json().catch(() => null) }, { status: response.ok ? 200 : 502 })
}
