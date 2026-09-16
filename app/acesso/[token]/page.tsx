import { notFound } from 'next/navigation'
import { pool } from '@/lib/db'
import { PremiumCheckout } from '@/components/premium-checkout'

export default async function AccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await pool.query('SELECT token, status, plan, price_cents FROM subscription_links WHERE token = $1 LIMIT 1', [token])
  if (!result.rows[0]) notFound()
  return <PremiumCheckout token={token} initialStatus={result.rows[0].status} isTest={token.startsWith('test_')} />
}
