import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

type Credentials = { appId?: string; secretKey?: string; affiliateId?: string }

function sign(appId: string, secretKey: string, payload: string, timestamp: number) {
  return createHash('sha256').update(`${appId}${timestamp}${payload}${secretKey}`).digest('hex')
}

function struck(value: string) {
  return value.split('').map((character) => `${character}\u0336`).join('')
}

function caption(title: string, price: number, original: number, url: string) {
  const formattedPrice = price.toFixed(2).replace('.', ',')
  const productEmoji = /fone|áudio|headset|caixa de som/i.test(title) ? '🎧' : /tênis|sapato|sandália|chinelo/i.test(title) ? '👟' : /cozinha|panela|organizador|casa/i.test(title) ? '🏠' : /beleza|maquiagem|perfume|skincare/i.test(title) ? '✨' : /celular|eletrônico|smart|cabo|carregador/i.test(title) ? '📱' : '🛍️'
  const category = /fone|headset|áudio|caixa de som/i.test(title) ? 'áudio' : /celular|smartphone|smartwatch|eletrônico|carregador/i.test(title) ? 'tecnologia' : /cozinha|panela|organizador|casa|decoração/i.test(title) ? 'casa' : /beleza|maquiagem|perfume|skincare|cabelo/i.test(title) ? 'beleza' : /tênis|sapato|sandália|chinelo|bolsa|vestido|roupa/i.test(title) ? 'moda' : 'achadinho'
  const phraseParts: Record<string, [string[], string[], string[]]> = {
    áudio: [['O som de', 'A experiência com', 'Sua playlist pede', 'Para curtir melhor', 'Mais emoção com'], ['vai elevar', 'combina com', 'transforma', 'deixa ainda melhor', 'faz diferença em'], ['cada momento', 'seu dia', 'suas músicas', 'sua rotina', 'seu tempo livre']],
    tecnologia: [['A praticidade de', 'O upgrade de', 'Sua rotina ganha com', 'Mais facilidade usando', 'A inovação de'], ['vai transformar', 'combina com', 'simplifica', 'moderniza', 'melhora'], ['seu dia', 'sua rotina', 'seus momentos', 'seu trabalho', 'sua experiência']],
    casa: [['O charme de', 'A praticidade de', 'Sua casa merece', 'Para deixar tudo melhor com', 'Um toque especial de'], ['transforma', 'organiza', 'valoriza', 'renova', 'facilita'], ['seu espaço', 'sua rotina', 'seu cantinho', 'seu dia', 'sua casa']],
    beleza: [['Seu momento combina com', 'O cuidado com', 'Para realçar', 'Um mimo para', 'A beleza de'], ['valoriza', 'renova', 'completa', 'realça', 'transforma'], ['seu ritual', 'seu estilo', 'sua rotina', 'seu autocuidado', 'seu visual']],
    moda: [['Seu estilo pede', 'O conforto de', 'Para completar', 'Um toque de charme com', 'A versatilidade de'], ['valoriza', 'transforma', 'completa', 'renova', 'destaca'], ['seu look', 'seu visual', 'seu estilo', 'qualquer ocasião', 'sua rotina']],
    achadinho: [['Olha só', 'Vale conhecer', 'Um detalhe que muda', 'Para facilitar', 'Você vai gostar de'], ['combina com', 'melhora', 'transforma', 'completa', 'deixa melhor'], ['seu dia', 'sua rotina', 'seu espaço', 'seus momentos', 'sua experiência']],
  }
  const [starts, verbs, ends] = phraseParts[category]
  const phraseSeed = [...`${title}|${url}`].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7)
  const shortTitle = title.split(/,|\s+(?:com|para|de uso|ideal para| portátil|portátil)|\s+-\s+/i)[0].trim().replace(/\s+/g, ' ').split(' ').slice(0, 4).join(' ')
  const modifiers = ['de um jeito especial', 'sem complicação', 'com muito charme', 'para aproveitar mais', 'com aquele toque extra', 'do jeito que você gosta', 'em qualquer ocasião', 'com praticidade', 'para deixar tudo melhor', 'com estilo e personalidade']
  const shortPhrase = `${starts[phraseSeed % starts.length]} ${shortTitle.toLowerCase()} ${verbs[Math.floor(phraseSeed / starts.length) % verbs.length]} ${ends[Math.floor(phraseSeed / (starts.length * verbs.length)) % ends.length]} ${modifiers[Math.floor(phraseSeed / (starts.length * verbs.length * ends.length)) % modifiers.length]}!`
  const discount = original > price ? Math.round((1 - price / original) * 100) : 0
  const formattedOriginal = original.toFixed(2).replace('.', ',')
  return `${shortPhrase}

${productEmoji} ${title}

💰 Por apenas R$ ${formattedPrice}!
${discount > 0 ? `🏷️ De ${struck(`R$ ${formattedOriginal}`)} por R$ ${formattedPrice} — ${discount}% OFF
` : ''}🛒 ${url}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { credentials?: Credentials; refreshKey?: number; mode?: string; keyword?: string; limit?: number }
    const credentials = body.credentials || {}
    const refreshKey = Number.isFinite(body.refreshKey) ? Math.max(0, Number(body.refreshKey)) : 0
    const mode = body.mode || 'all'
    const keyword = typeof body.keyword === 'string' ? body.keyword.trim().slice(0, 100) : ''
    const requestedLimit = Math.max(5, Number(body.limit) || 50)
    const page = refreshKey + 1
    const sortType = mode === 'commission-high' ? 4 : mode === 'commission-low' ? 5 : mode === 'best-selling' ? 2 : mode === 'week' || mode === 'month' ? 2 : 1
    const listType = mode === 'week' || mode === 'month' ? 1 : 2
    const secretKey = !credentials.secretKey || credentials.secretKey === 'process.env.API_KEY' ? process.env.API_KEY || '' : credentials.secretKey
    const appId = credentials.appId || '18336041241'
    const affiliateId = credentials.affiliateId || '18336041241'
    if (!appId || !secretKey || !affiliateId) {
      return NextResponse.json({ products: [], error: 'Configure App ID, Secret Key e Affiliate ID para ativar a busca ao vivo.' }, { status: 200 })
    }

    const endpoint = process.env.SHOPEE_AFFILIATE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql'
    const escapedKeyword = keyword.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const query = `query { productOfferV2(keyword: "${escapedKeyword}", listType: ${listType}, sortType: ${sortType}, page: ${page}, limit: ${requestedLimit}) { nodes { itemId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate sales ratingStar commissionRate } } }`
    const payload = JSON.stringify({ query })
    const timestamp = Math.floor(Date.now() / 1000)
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${sign(appId, secretKey, payload, timestamp)}` }, body: payload, cache: 'no-store' })
    const data = await response.json() as { data?: { productOfferV2?: { nodes?: Array<{ itemId?: string | number; productName?: string; imageUrl?: string; priceMin?: number; priceMax?: number; priceDiscountRate?: number; ratingStar?: number; sales?: number; offerLink?: string; productLink?: string }> } }; errors?: Array<{ message?: string }> }
    if (!response.ok || data.errors) return NextResponse.json({ products: [], error: data.errors?.[0]?.message || 'A Shopee recusou a consulta. Verifique App ID, Secret Key e o endpoint da sua conta.' }, { status: 502 })
    const nodes = data.data?.productOfferV2?.nodes || []
    const products = nodes.map((item, index) => {
      const dealPrice = Number(item.priceMin || 0)
      const discountRate = Number(item.priceDiscountRate || 0)
      const originalPrice = discountRate > 0 && discountRate < 100 ? dealPrice / (1 - discountRate / 100) : Number(item.priceMax || dealPrice || 0)
      const affiliateUrl = item.offerLink || item.productLink || `https://shope.ee/${affiliateId}/${item.itemId || index}`
      return { id: String(item.itemId || `offer-${index}`), title: item.productName || 'Oferta Shopee', imageUrl: item.imageUrl || '', originalPrice, dealPrice, rating: Number(item.ratingStar || 0), commissionRate: Number(item.commissionRate || 0), stock: Number(item.sales || 0), affiliateUrl, caption: caption(item.productName || 'Oferta Shopee', dealPrice, originalPrice, affiliateUrl) }
    }).filter((item) => item.dealPrice > 0)
    return NextResponse.json({ products, refreshedAt: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ products: [], error: error instanceof Error ? error.message : 'Falha inesperada ao consultar a Shopee.' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true, service: 'shopee-live-deals' }) }
