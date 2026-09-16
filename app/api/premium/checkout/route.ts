import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

const prices: Record<string, number> = { semanal: 3899, mensal: 5960, vitalicio: 12590 }

export async function POST(request: Request) {
  const { token, plan, groups } = await request.json().catch(() => ({}))
  if (!token || !prices[plan] || ![1, 2, 3].includes(groups)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const link = await pool.query('SELECT id FROM subscription_links WHERE token = $1 AND status = $2 LIMIT 1', [token, 'pending'])
  if (!link.rows[0]) return NextResponse.json({ error: 'Link inválido ou já utilizado' }, { status: 404 })
  const apiUrl = process.env.SYNC_PAY_API_URL
  if (!apiUrl || !process.env.SYNC_PAY_API_KEY) return NextResponse.json({ error: 'SyncPay não configurada' }, { status: 503 })
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/checkout`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.SYNC_PAY_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: prices[plan] / 100, currency: 'BRL', external_reference: token, metadata: { token, plan, groups } }) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return NextResponse.json({ error: data.message || data.error || 'SyncPay recusou o pagamento', details: process.env.NODE_ENV === 'development' ? data : undefined }, { status: 502 })
  const payload = data.data || data.payment || data.transaction || data
  const pixCode = payload.pix_code || payload.pixCode || payload.copy_paste || payload.copyPaste || payload.qr_code_text || payload.qrCodeText || payload.qrcode_text || payload.qr_code
  const qrCode = payload.qr_code_image || payload.qrCodeImage || payload.qr_code_url || payload.qrCodeUrl || payload.qr_code_base64 || payload.qrCodeBase64 || (typeof payload.qr_code === 'string' && payload.qr_code.startsWith('data:image') ? payload.qr_code : null)
  const paymentId = payload.id || payload.payment_id || payload.paymentId || payload.transaction_id || null
  if (!pixCode && !qrCode && !payload.checkout_url && !payload.url && !payload.payment_url) return NextResponse.json({ error: 'A SyncPay não retornou os dados do Pix.', details: process.env.NODE_ENV === 'development' ? data : undefined }, { status: 502 })
  await pool.query('UPDATE subscription_links SET plan = $1, price_cents = $2, group_count = $3, payment_id = $4, updated_at = now() WHERE token = $5', [plan, prices[plan], groups, paymentId, token])
  return NextResponse.json({ paymentId, pixCode: typeof pixCode === 'string' && !pixCode.startsWith('data:image') ? pixCode : null, qrCode: typeof qrCode === 'string' ? qrCode : null, checkoutUrl: payload.checkout_url || payload.url || payload.payment_url || null })
}
