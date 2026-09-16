import { notFound } from 'next/navigation'
import { pool } from '@/lib/db'
import { PremiumCheckout } from '@/components/premium-checkout'

export default async function AccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await pool.query('SELECT token, status, plan, price_cents, access_expires_at FROM subscription_links WHERE token = $1 LIMIT 1', [token])
  if (!result.rows[0]) notFound()
  const expiresAt = result.rows[0].access_expires_at ? new Date(result.rows[0].access_expires_at) : null
  const expired = expiresAt ? expiresAt.getTime() <= Date.now() : false
  return <PremiumCheckout token={token} initialStatus={expired ? 'expired' : result.rows[0].status} initialExpiresAt={expired ? null : expiresAt?.toISOString() ?? null} isTest={token.startsWith('test_')} />
}
