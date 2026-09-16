import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Achadinhos — Painel administrativo',
  description: 'Gerencie links afiliados, agendamentos e integrações da Shopee.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/images/app-icon.png',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/images/app-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  userScalable: false,
  themeColor: '#07140d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className="dark antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
