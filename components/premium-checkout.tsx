'use client'

import { useEffect, useMemo, useState } from 'react'

const plans = [
  { id: 'semanal', name: 'Semanal', price: 'R$ 38,99', days: 7 },
  { id: 'mensal', name: 'Mensal', price: 'R$ 59,60', days: 30 },
  { id: 'vitalicio', name: 'Vitalício', price: 'R$ 125,90', days: null },
]

export function PremiumCheckout({ token, initialStatus }: { token: string; initialStatus: string }) {
  const [selected, setSelected] = useState(plans[1])
  const [groups, setGroups] = useState(1)
  const [status, setStatus] = useState(initialStatus)
  const [message, setMessage] = useState('')
  const [seconds, setSeconds] = useState(0)
  const expiresAt = useMemo(() => selected.days ? Date.now() + selected.days * 86400000 : null, [selected.days])

  useEffect(() => { if (status !== 'approved') return; const timer = window.setInterval(() => setSeconds(Math.max(0, (expiresAt ?? Date.now()) - Date.now())), 1000); return () => window.clearInterval(timer) }, [status, expiresAt])
  const countdown = status === 'approved' && selected.days ? new Date(seconds).toISOString().slice(11, 19) : status === 'approved' ? 'Sem expiração' : 'Aguardando pagamento'
  const checkout = async () => { setMessage('Gerando pagamento Pix...'); const response = await fetch('/api/premium/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, plan: selected.id, groups }) }); const data = await response.json(); if (!response.ok) return setMessage(data.error || 'Não foi possível gerar o pagamento.'); window.location.href = data.checkoutUrl }

  return <main className="min-h-screen bg-background px-4 py-12 text-foreground"><div className="mx-auto max-w-4xl"><p className="mb-3 text-xs uppercase tracking-[0.3em] text-primary">Achadinhos Premium</p><h1 className="text-4xl font-black">Escolha seu acesso</h1><p className="mt-3 text-muted-foreground">Pagamento aprovado libera o painel e suas configurações.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{plans.map((plan) => <button key={plan.id} onClick={() => setSelected(plan)} className={`rounded-3xl border p-6 text-left ${selected.id === plan.id ? 'border-primary bg-primary/10' : 'border-border bg-card/70'}`}><span className="text-lg font-bold">{plan.name}</span><strong className="mt-4 block text-3xl">{plan.price}</strong><span className="mt-2 block text-xs text-muted-foreground">{plan.days ? `${plan.days} dias de acesso` : 'Acesso sem expiração'}</span></button>)}</div><div className="mt-6 rounded-3xl border border-border bg-card/60 p-6"><p className="font-bold">Quantos grupos deseja usar?</p><div className="mt-4 flex gap-2">{[1, 2, 3].map((count) => <button key={count} onClick={() => setGroups(count)} className={`rounded-xl border px-5 py-3 ${groups === count ? 'border-primary bg-primary/15 text-primary' : 'border-border'}`}>{count} grupo{count > 1 ? 's' : ''}</button>)}</div><button onClick={checkout} className="mt-6 w-full rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground">Pagar com SyncPay</button>{message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}{status === 'approved' && <p className="mt-4 text-primary">Tempo restante: {countdown}</p>}</div></div></main>
}
