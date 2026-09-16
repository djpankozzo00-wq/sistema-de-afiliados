import { notFound } from 'next/navigation'
import { pool } from '@/lib/db'
import { TestAccessPanel } from '@/components/test-access-panel'

export default async function TestPanelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await pool.query("SELECT status, plan, group_count FROM subscription_links WHERE token = $1 AND token LIKE 'test_%' LIMIT 1", [token])
  if (!result.rows[0] || result.rows[0].status !== 'approved') notFound()
  return <TestAccessPanel token={token} plan={result.rows[0].plan || 'mensal'} groupCount={Math.min(3, Math.max(1, Number(result.rows[0].group_count) || 1))} />
}
