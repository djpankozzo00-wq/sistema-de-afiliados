'use client'

import { useState } from 'react'
import {
  BarChart3,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardPaste,
  ExternalLink,
  KeyRound,
  Link2,
  Menu,
  PackageSearch,
  Plus,
  Settings2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'

const initialPosts = [
  { id: 1, title: 'Mini aspirador portátil sem fio', store: 'Shopee', date: 'Hoje, 18:30', status: 'Agendado', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=160&q=80' },
  { id: 2, title: 'Organizador de cabos e fios', store: 'Shopee', date: 'Amanhã, 09:00', status: 'Agendado', image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=160&q=80' },
  { id: 3, title: 'Luminária LED para escritório', store: 'Shopee', date: 'Amanhã, 12:45', status: 'Rascunho', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=160&q=80' },
]

const navItems = [
  { label: 'Visão geral', icon: BarChart3 },
  { label: 'Novo achadinho', icon: Link2 },
  { label: 'Agendamentos', icon: CalendarClock, count: 8 },
  { label: 'Configurações', icon: Settings2 },
]

export function AdminDashboard() {
  const [active, setActive] = useState('Visão geral')
  const [posts, setPosts] = useState(initialPosts)
  const [url, setUrl] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  function addLink() {
    if (!url.trim()) return
    setPosts((current) => [{ id: Date.now(), title: 'Novo produto da Shopee', store: 'Shopee', date: 'A definir', status: 'Rascunho', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=160&q=80' }, ...current])
    setUrl('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar p-5 transition-transform lg:translate-x-0`}>
        <div className="flex items-center justify-between px-2 pb-9 pt-2">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={19} /></span><div><p className="font-semibold tracking-tight">Achadinhos</p><p className="text-xs text-muted-foreground">Painel administrativo</p></div></div>
          <button aria-label="Fechar menu" className="text-muted-foreground lg:hidden" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação principal">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          {navItems.map((item) => { const Icon = item.icon; return <button key={item.label} onClick={() => { setActive(item.label); setMobileOpen(false) }} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition-colors ${active === item.label ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}><span className="flex items-center gap-3"><Icon size={18} />{item.label}</span>{item.count && <span className={`rounded-full px-2 py-0.5 text-xs ${active === item.label ? 'bg-primary-foreground/15' : 'bg-muted'}`}>{item.count}</span>}</button> })}
        </nav>
        <div className="rounded-2xl bg-sidebar-accent p-4"><div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><TrendingUp size={17} /></div><p className="text-sm font-semibold">Seu alcance cresceu</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Você teve 24% mais cliques esta semana.</p><button className="mt-3 text-xs font-semibold text-primary">Ver relatório <span aria-hidden="true">→</span></button></div>
      </aside>
      {mobileOpen && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <main className="lg:pl-72">
        <header className="flex h-20 items-center justify-between border-b border-border px-5 sm:px-8"><div className="flex items-center gap-3"><button aria-label="Abrir menu" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={21} /></button><div><p className="text-sm text-muted-foreground">Quarta-feira, 26 de agosto de 2026</p><h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{active}</h1></div></div><div className="flex items-center gap-3"><button aria-label="Pesquisar" className="hidden rounded-lg border border-border p-2 text-muted-foreground sm:block"><PackageSearch size={18} /></button><div className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">AM</div></div></header>
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={Link2} label="Links publicados" value="128" change="+12,5%" /><Stat icon={CalendarClock} label="Posts agendados" value="08" change="+3 hoje" /><Stat icon={Users} label="Cliques no mês" value="24,8k" change="+18,2%" /><Stat icon={ShoppingBag} label="Comissões geradas" value="R$ 3.420" change="+9,4%" /></section>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-6 flex items-start justify-between"><div><p className="text-lg font-semibold">Adicionar achadinho</p><p className="mt-1 text-sm text-muted-foreground">Cole um link da Shopee para começar.</p></div><div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><ClipboardPaste size={19} /></div></div><label htmlFor="affiliate-url" className="mb-2 block text-sm font-medium">Link do produto</label><div className="flex flex-col gap-3 sm:flex-row"><input id="affiliate-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://shopee.com.br/..." className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20" /><button onClick={addLink} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"><Plus size={17} /> Adicionar</button></div>{saved && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600"><Check size={16} /> Link adicionado aos rascunhos.</p>}<div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-3"><Mini label="Conversão média" value="4,8%" /><Mini label="Melhor categoria" value="Casa" /><Mini label="Último post" value="Há 2h" /></div></section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-lg font-semibold">Próximas postagens</p><p className="mt-1 text-sm text-muted-foreground">Sua fila de conteúdo</p></div><button onClick={() => setActive('Agendamentos')} className="text-sm font-semibold text-primary">Ver fila</button></div><div className="flex flex-col gap-4">{posts.slice(0, 3).map((post) => <article key={post.id} className="flex items-center gap-3"><img src={post.image} alt="" className="size-12 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{post.title}</p><p className="mt-1 text-xs text-muted-foreground">{post.date} · {post.store}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${post.status === 'Agendado' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{post.status}</span></article>)}</div></section>
          </div>
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-lg font-semibold">Desempenho dos achadinhos</p><p className="mt-1 text-sm text-muted-foreground">Cliques e conversões nos últimos 7 dias</p></div><button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">Últimos 7 dias <ChevronDown size={15} /></button></div><div className="flex h-48 items-end gap-2 sm:gap-5">{[42, 58, 48, 72, 64, 87, 76].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="w-full max-w-14 rounded-t-lg bg-primary/80 transition hover:bg-primary" style={{ height: `${height}%` }} /><span className="text-xs text-muted-foreground">{['Qui', 'Sex', 'Sáb', 'Dom', 'Seg', 'Ter', 'Hoje'][index]}</span></div>)}</div></section>
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><KeyRound size={18} /></div><div><p className="font-semibold">Integrações rápidas</p><p className="text-sm text-muted-foreground">Conecte suas contas para automatizar publicações.</p></div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center justify-between rounded-xl border border-border p-3"><span className="flex items-center gap-3 text-sm font-medium"><span className="flex size-8 items-center justify-center rounded-lg bg-[#ee4d2d] text-xs font-bold text-primary-foreground">S</span>Shopee API</span><span className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="size-1.5 rounded-full bg-emerald-500" />Conectada</span></div><button onClick={() => setActive('Configurações')} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted"><Settings2 size={16} /> Gerenciar integrações</button></div></section>
        </div>
      </main>
    </div>
  )
}

function Stat({ icon: Icon, label, value, change }: { icon: typeof Link2; label: string; value: string; change: string }) { return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon size={17} className="text-primary" /></div><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs font-medium text-emerald-600">{change} <span className="font-normal text-muted-foreground">vs. mês anterior</span></p></div> }
function Mini({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div> }
