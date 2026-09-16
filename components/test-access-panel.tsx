'use client'

import { useEffect, useState } from 'react'
import { AdminDashboard } from '@/components/admin-dashboard'

const steps = ['API da Shopee', 'Grupos de destino', 'Bot de ofertas']

export function TestAccessPanel({ token, plan = 'mensal', expiresAt, groupCount = 1 }: { token: string; plan?: string; expiresAt?: string | null; groupCount?: number }) {
  const duration = plan === 'semanal' ? 7 : plan === 'vitalicio' ? null : 30
  const storageKey = `premium-test-configured:${token}`
  const [configured, setConfigured] = useState(false)
  const [selectedGroupCount, setSelectedGroupCount] = useState(groupCount)
  useEffect(() => { const saved = window.sessionStorage.getItem(storageKey); const savedCount = Number(window.sessionStorage.getItem(`${storageKey}:groups`)); setConfigured(saved === 'true'); if (savedCount >= 1 && savedCount <= 3) setSelectedGroupCount(savedCount) }, [storageKey])
  const expiry = expiresAt ? new Date(expiresAt).getTime() : null
  const [remaining, setRemaining] = useState(() => expiry ? Math.max(0, expiry - Date.now()) : 0)
  useEffect(() => { if (!expiry) return; const update = () => setRemaining(Math.max(0, expiry - Date.now())); update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer) }, [expiry])
  useEffect(() => { if (configured && expiry && remaining <= 0) window.location.replace(`/acesso/${token}`) }, [configured, expiry, remaining, token])
  const [apiKey, setApiKey] = useState('')
  const [groups, setGroups] = useState(['Grupo 1'])
  const [botToken, setBotToken] = useState('')

  const resetSimulation = () => { setRemaining(0); setConfigured(false); window.sessionStorage.removeItem(storageKey); window.sessionStorage.removeItem(`${storageKey}:groups`); window.setTimeout(() => { window.location.href = `/acesso/${token}` }, 250) }

  if (configured) { const totalSeconds = Math.floor(remaining / 1000); const days = Math.floor(totalSeconds / 86400); const hours = Math.floor((totalSeconds % 86400) / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; return <div><div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">Modo demonstração ativo · Tudo aqui é simulado e nenhuma oferta será enviada de verdade.<div className="mt-2 font-mono font-bold">Plano {plan} · {duration ? `${days}d ${hours}h ${minutes}m ${seconds}s restantes` : 'Vitalício · sem expiração'}</div><button onClick={resetSimulation} className="mt-3 rounded-xl border border-amber-300/50 px-4 py-2 text-xs font-bold text-amber-100 hover:bg-amber-300/10">Zerar contador e voltar aos planos</button></div><AdminDashboard simulation groupCount={selectedGroupCount} showPremiumLink={false} simulationNotice="Notificação simulada: as ofertas abaixo são fictícias e os envios apenas demonstram o funcionamento." /></div> }

  const canContinue = apiKey.trim() && groups.length > 0 && botToken.trim()

  return <main className="min-h-screen bg-background px-4 py-10 text-foreground"><div className="mx-auto max-w-2xl"><p className="text-xs uppercase tracking-[0.3em] text-primary">Achadinhos Premium · Demonstração</p><h1 className="mt-3 text-4xl font-black">Configure seu painel</h1><p className="mt-3 text-muted-foreground">Antes de acessar as ofertas, conclua estas configurações. Este é um ambiente simulado e nenhum dado real será enviado.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{steps.map((step, index) => <div key={step} className="rounded-2xl border border-primary/30 bg-primary/5 p-4"><span className="text-xs text-primary">0{index + 1}</span><p className="mt-2 text-sm font-semibold">{step}</p></div>)}</div><section className="mt-6 space-y-5 rounded-3xl border border-border bg-card p-6 shadow-xl"><label className="block text-sm font-semibold">API key da Shopee<input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Cole uma chave simulada" className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-normal outline-none focus:border-primary" /></label><div><p className="text-sm font-semibold">Grupos de destino</p><div className="mt-3 flex flex-wrap gap-2">{[1, 2, 3].map((count) => <button key={count} onClick={() => setGroups(Array.from({ length: count }, (_, index) => `Grupo ${index + 1}`))} className={`rounded-xl border px-4 py-2 text-sm ${groups.length === count ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>{count} grupo{count > 1 ? 's' : ''}</button>)}</div></div><label className="block text-sm font-semibold">Token do bot<input value={botToken} onChange={(event) => setBotToken(event.target.value)} placeholder="Cole um token simulado" className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-normal outline-none focus:border-primary" /></label><button disabled={!canContinue} onClick={() => { window.sessionStorage.setItem(storageKey, 'true'); window.sessionStorage.setItem(`${storageKey}:groups`, String(groups.length)); setSelectedGroupCount(groups.length); setConfigured(true) }} className="w-full rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Concluir configuração e abrir painel</button></section></div></main>
}
