'use client'

import { useEffect, useMemo, useState } from 'react'

function isImageSource(value: string) { return value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/') }

const plans = [
  { id: 'semanal', name: 'Semanal', price: 'R$ 38,99', days: 7 },
  { id: 'mensal', name: 'Mensal', price: 'R$ 59,60', days: 30 },
  { id: 'vitalicio', name: 'Vitalício', price: 'R$ 125,90', days: null },
]

export function PremiumCheckout({ token, initialStatus, isTest = false }: { token: string; initialStatus: string; isTest?: boolean }) {
  const [selected, setSelected] = useState(plans[1])
  const [groups, setGroups] = useState(1)
  const [status, setStatus] = useState(initialStatus)
  const [message, setMessage] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [pix, setPix] = useState<{ code: string | null; image: string | null; checkoutUrl: string | null }>({ code: null, image: null, checkoutUrl: null })
  const expiresAt = useMemo(() => selected.days ? Date.now() + selected.days * 86400000 : null, [selected.days])

  useEffect(() => { if (status !== 'approved') return; const timer = window.setInterval(() => setSeconds(Math.max(0, (expiresAt ?? Date.now()) - Date.now())), 1000); return () => window.clearInterval(timer) }, [status, expiresAt])
  const countdown = status === 'approved' && selected.days ? new Date(seconds).toISOString().slice(11, 19) : status === 'approved' ? 'Sem expiração' : 'Aguardando pagamento'
  const simulateApproval = async () => { setMessage('Simulando aprovação...'); const response = await fetch('/api/premium/test-approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, plan: selected.id, groups }) }); const data = await response.json(); if (!response.ok) return setMessage(data.error || 'Não foi possível simular.'); setStatus('approved'); setMessage('Pagamento aprovado em modo de teste. Acesso liberado.'); }
  const checkout = async () => { setMessage('Gerando pagamento Pix...'); setPix({ code: null, image: null, checkoutUrl: null }); const response = await fetch('/api/premium/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, plan: selected.id, groups }) }); const data = await response.json().catch(() => ({ error: 'A API retornou uma resposta inválida.' })); if (!response.ok) return setMessage(data.error || 'Não foi possível gerar o pagamento.'); setPix({ code: data.pixCode || null, image: data.qrCode && isImageSource(data.qrCode) ? data.qrCode : data.pixCode ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data.pixCode)}` : null, checkoutUrl: data.checkoutUrl || null }); setMessage('Pix gerado. Escaneie o QR Code ou copie o código abaixo.') } 
const copyPix = async () => { if (!pix.code) return; await navigator.clipboard.writeText(pix.code); setMessage('Código Pix copiado.') }

  return <main className="min-h-screen bg-background px-4 py-12 text-foreground"><div className="mx-auto max-w-4xl"><p className="mb-3 text-xs uppercase tracking-[0.3em] text-primary">Achadinhos Premium</p><h1 className="text-4xl font-black">Escolha seu acesso</h1><p className="mt-3 text-muted-foreground">Pagamento aprovado libera o painel e suas configurações.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{plans.map((plan) => <button key={plan.id} onClick={() => setSelected(plan)} className={`rounded-3xl border p-6 text-left ${selected.id === plan.id ? 'border-primary bg-primary/10' : 'border-border bg-card/70'}`}><span className="text-lg font-bold">{plan.name}</span><strong className="mt-4 block text-3xl">{plan.price}</strong><span className="mt-2 block text-xs text-muted-foreground">{plan.days ? `${plan.days} dias de acesso` : 'Acesso sem expiração'}</span></button>)}</div><div className="mt-6 rounded-3xl border border-border bg-card/60 p-6"><p className="font-bold">Quantos grupos deseja usar?</p><div className="mt-4 flex gap-2">{[1, 2, 3].map((count) => <button key={count} onClick={() => setGroups(count)} className={`rounded-xl border px-5 py-3 ${groups === count ? 'border-primary bg-primary/15 text-primary' : 'border-border'}`}>{count} grupo{count > 1 ? 's' : ''}</button>)}</div>{isTest ? <button onClick={simulateApproval} className="mt-6 w-full rounded-2xl bg-amber-500 px-5 py-4 font-bold text-black">Simular aprovação do pagamento</button> : <button onClick={checkout} className="mt-6 w-full rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground">Gerar Pix</button>}{message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}{pix.image && <div className="mt-6 rounded-2xl border border-primary/30 bg-background/70 p-5 text-center"><p className="font-bold text-primary">Pague com Pix</p><img src={pix.image} alt="QR Code para pagamento Pix" className="mx-auto mt-4 size-64 rounded-xl bg-white p-2" />{pix.code && <><p className="mt-4 text-left text-xs text-muted-foreground">Pix copia e cola</p><textarea readOnly value={pix.code} className="mt-2 min-h-24 w-full resize-none rounded-xl border border-border bg-background p-3 text-xs" /><button onClick={copyPix} className="mt-3 w-full rounded-xl border border-primary/40 px-4 py-3 font-semibold text-primary">Copiar código Pix</button></>}</div>}{pix.checkoutUrl && <a href={pix.checkoutUrl} target="_blank" rel="noreferrer" className="mt-4 block text-center text-sm text-primary underline">Abrir página de pagamento</a>}{status === 'approved' && <p className="mt-4 text-primary">Tempo restante: {countdown}</p>}</div></div></main>
}
