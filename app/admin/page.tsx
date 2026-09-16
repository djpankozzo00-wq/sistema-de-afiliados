'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [link, setLink] = useState('')
  const [message, setMessage] = useState('')
  const generate = async (test = false) => { const response = await fetch('/api/premium/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, test }) }); const data = await response.json(); if (!response.ok) return setMessage(data.error || 'Acesso negado'); setLink(`${window.location.origin}${data.url}`); setMessage(test ? 'Link de teste criado. Nenhum pagamento real será cobrado.' : 'Link único criado.') }
  return <main className="min-h-screen bg-background px-4 py-12 text-foreground"><div className="mx-auto max-w-lg rounded-3xl border border-border bg-card/70 p-7"><p className="text-xs uppercase tracking-[0.3em] text-primary">Área reservada</p><h1 className="mt-2 text-3xl font-black">Painel administrativo</h1><label className="mt-8 block text-sm">Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3" /></label><p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">O cliente escolherá o plano e a quantidade de grupos pelo link único.</p><button onClick={() => generate(false)} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">Gerar link único</button><button onClick={() => generate(true)} className="mt-3 w-full rounded-xl border border-primary/50 px-4 py-3 font-bold text-primary">Gerar link de teste</button>{message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}{link && <input readOnly value={link} className="mt-4 w-full rounded-xl border border-primary/40 bg-background px-4 py-3 text-sm" />}</div></main>
}
