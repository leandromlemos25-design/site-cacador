const crypto = require('crypto');
const https = require('https');

async function fetchShopee(appId, appSecret, page, limit, keyword) {
    const keywordFilter = keyword ? `, keyword: "${keyword}"` : "";
    const graphqlPayload = JSON.stringify({
        query: `{ productOfferV2(page: ${page}, limit: ${limit}${keywordFilter}) { nodes { productName price priceDiscountRate offerLink imageUrl } } }`
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto.createHash('sha256').update(appId + timestamp + graphqlPayload + appSecret).digest('hex');
    const options = {
        hostname: 'open-api.affiliate.shopee.com.br',
        port: 443,
        path: '/graphql',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
            'Content-Length': Buffer.byteLength(graphqlPayload)
        }
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (r) => {
            let body = '';
            r.on('data', c => body += c);
            r.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.write(graphqlPayload);
        req.end();
    });
}

function formatarProdutos(nodes) {
    return (nodes || [])
        .filter(n => n.imageUrl && n.imageUrl.startsWith('http'))
        .map(n => {
            const precoAtual = parseFloat(n.price) || 0;
            const desconto = parseFloat(n.priceDiscountRate) || 0;
            const precoAntigo = desconto > 0 && desconto < 100 ? precoAtual / (1 - desconto / 100) : precoAtual;
            return { offerName: n.productName || "Oferta Shopee", price: precoAntigo, discountPrice: precoAtual, discountRate: desconto, offerLink: n.offerLink, imageUrl: n.imageUrl };
        });
}

export default async function handler(req, res) {
    const origin = req.headers.origin;
    const allowed = !origin || origin.includes('ocacadordeofertas.com') || origin.includes('vercel.app') || origin.includes('localhost');
    if (!allowed) return res.status(403).json({ erro_identificado: 'Acesso negado.' });

    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const appId = process.env.SHOPEE_APP_ID;
    const appSecret = process.env.SHOPEE_APP_SECRET;
    if (!appId || !appSecret) return res.status(500).json({ erro_identificado: 'Credenciais da Shopee não configuradas.' });

    try {
        const searchQuery = req.query?.q || "";

        if (searchQuery) {
            // Busca por palavra-chave: 1 página de 20
            const data = await fetchShopee(appId, appSecret, 1, 20, searchQuery);
            const nodes = data?.data?.productOfferV2?.nodes || [];
            return res.status(200).json(formatarProdutos(nodes));
        }

        // Home: busca 5 páginas × 20 = 100 ofertas em paralelo
        const paginas = await Promise.all([1,2,3,4,5].map(p => fetchShopee(appId, appSecret, p, 20, "")));
        const todos = paginas.flatMap(d => d?.data?.productOfferV2?.nodes || []);
        return res.status(200).json(formatarProdutos(todos));

    } catch (error) {
        return res.status(500).json({ erro_identificado: 'Falha interna', detalhes: error.message });
    }
}
