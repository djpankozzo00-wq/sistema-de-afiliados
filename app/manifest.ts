import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Achadinhos da Shopee',
    short_name: 'Achadinhos',
    description: 'Painel de ofertas e achadinhos da Shopee.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020603',
    theme_color: '#07140d',
    icons: [
      { src: '/images/app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }
}
