'use client'

import { useState } from 'react'
import { AdminDashboard } from '@/components/admin-dashboard'

const steps = ['API da Shopee', 'Grupos de destino', 'Bot de ofertas']

export function TestAccessPanel({ token }: { token: string }) {
  const [configured, setConfigured] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [groups, setGroups] = useState(['Grupo 1'])
  const [botToken, setBotToken] = useState('')

  if (configured) return <div><div className="border-b border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm text-primary">Modo demonstração ativo · Link {token.slice(0, 12)}...</div><AdminDashboard /></div>

  const canContinue = apiKey.trim() && groups.length > 0 && botToken.trim()

  return <main className="min-h-screen bg-background px-4 py-10 text-foreground"><div className="mx-auto max-w-2xl"><p className="text-xs uppercase tracking-[0.3em] text-primary">Achadinhos Premium · Demonstração</p><h1 className="mt-3 text-4xl font-black">Configure seu painel</h1><p className="mt-3 text-muted-foreground">Antes de acessar as ofertas, conclua estas configurações. Este é um ambiente simulado e nenhum dado real será enviado.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{steps.map((step, index) => <div key={step} className="rounded-2xl border border-primary/30 bg-primary/5 p-4"><span className="text-xs text-primary">0{index + 1}</span><p className="mt-2 text-sm font-semibold">{step}</p></div>)}</div><section className="mt-6 space-y-5 rounded-3xl border border-border bg-card p-6 shadow-xl"><label className="block text-sm font-semibold">API key da Shopee<input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Cole uma chave simulada" className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-normal outline-none focus:border-primary" /></label><div><p className="text-sm font-semibold">Grupos de destino</p><div className="mt-3 flex flex-wrap gap-2">{[1, 2, 3].map((count) => <button key={count} onClick={() => setGroups(Array.from({ length: count }, (_, index) => `Grupo ${index + 1}`))} className={`rounded-xl border px-4 py-2 text-sm ${groups.length === count ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>{count} grupo{count > 1 ? 's' : ''}</button>)}</div></div><label className="block text-sm font-semibold">Token do bot<input value={botToken} onChange={(event) => setBotToken(event.target.value)} placeholder="Cole um token simulado" className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-normal outline-none focus:border-primary" /></label><button disabled={!canContinue} onClick={() => setConfigured(true)} className="w-full rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Concluir configuração e abrir painel</button></section></div></main>
}
