import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { caption, imageUrl } = await request.json() as { caption?: string; imageUrl?: string }
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) return NextResponse.json({ error: 'Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.' }, { status: 503 })
    if (!caption?.trim()) return NextResponse.json({ error: 'A oferta não possui texto.' }, { status: 400 })

    const base = `https://api.telegram.org/bot${token}`
    const endpoint = imageUrl ? `${base}/sendPhoto` : `${base}/sendMessage`
    const body = imageUrl
      ? { chat_id: chatId, photo: imageUrl, caption: caption.slice(0, 1024) }
      : { chat_id: chatId, text: caption.slice(0, 4096) }
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
    const data = await response.json() as { ok?: boolean; description?: string }
    if (!response.ok || !data.ok) return NextResponse.json({ error: data.description || 'O Telegram recusou o envio.' }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao enviar para o Telegram.' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true, service: 'telegram' }) }
