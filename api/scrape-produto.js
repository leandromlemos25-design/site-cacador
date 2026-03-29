const https = require('https');
const http = require('http');
const { URL } = require('url');

const LOJAS_MAP = {
    'magalu.com': 'Magalu', 'magazineluiza.com': 'Magalu',
    'shopee.com.br': 'Shopee',
    'amazon.com.br': 'Amazon', 'amzn.to': 'Amazon',
    'mercadolivre.com.br': 'Mercado Livre', 'mercadolivre.com': 'Mercado Livre',
    'americanas.com.br': 'Americanas',
    'kabum.com.br': 'KaBuM',
    'casasbahia.com.br': 'Casas Bahia',
    'extra.com.br': 'Extra',
    'submarino.com.br': 'Submarino',
    'aliexpress.com': 'AliExpress',
};

function detectarLoja(url) {
    try {
        const host = new URL(url).hostname.replace('www.', '');
        for (const [domain, nome] of Object.entries(LOJAS_MAP)) {
            if (host.includes(domain)) return nome;
        }
    } catch {}
    return 'Outros';
}

function fetchUrl(urlStr, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 8) return reject(new Error('Muitos redirecionamentos'));
        let parsed;
        try { parsed = new URL(urlStr); } catch { return reject(new Error('URL inválida')); }

        const lib = parsed.protocol === 'https:' ? https : http;
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            },
            timeout: 10000,
        };

        const req = lib.request(options, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                const next = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : `${parsed.protocol}//${parsed.hostname}${res.headers.location}`;
                res.resume();
                return resolve(fetchUrl(next, redirects + 1));
            }
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { if (body.length < 500000) body += chunk; });
            res.on('end', () => resolve({ body, finalUrl: urlStr }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

function extrairMeta(html, prop) {
    const patterns = [
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, 'i'),
    ];
    for (const re of patterns) {
        const m = html.match(re);
        if (m) return m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
    }
    return null;
}

function extrairJsonLd(html) {
    const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of matches) {
        try {
            const data = JSON.parse(m[1]);
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
                const type = (item['@type'] || '').toLowerCase();
                if (type === 'product' || type.includes('product')) return item;
                if (item['@graph']) {
                    const prod = item['@graph'].find(i => (i['@type'] || '').toLowerCase().includes('product'));
                    if (prod) return prod;
                }
            }
        } catch {}
    }
    return null;
}

function extrairPreco(str) {
    if (!str) return 0;
    const s = String(str).replace(/[^\d.,]/g, '');
    if (s.includes(',') && s.includes('.')) {
        return parseFloat(s.replace('.', '').replace(',', '.')) || 0;
    }
    if (s.includes(',')) return parseFloat(s.replace(',', '.')) || 0;
    return parseFloat(s) || 0;
}

function parsearProduto(body, finalUrl) {
    const jsonLd = extrairJsonLd(body);
    let titulo = '', precoNovo = 0, precoAntigo = 0, imagem = '';

    if (jsonLd) {
        titulo = jsonLd.name || '';
        imagem = Array.isArray(jsonLd.image) ? jsonLd.image[0] : (jsonLd.image?.url || jsonLd.image || '');
        const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
        if (offer) {
            precoNovo = extrairPreco(offer.price);
            precoAntigo = extrairPreco(offer.highPrice || offer.priceValidUntil || 0);
        }
    }

    // Fallback OG tags
    if (!titulo) titulo = extrairMeta(body, 'og:title') || extrairMeta(body, 'twitter:title') || '';
    if (!imagem) imagem = extrairMeta(body, 'og:image') || extrairMeta(body, 'twitter:image') || '';

    // Título: limpar sufixos de loja
    titulo = titulo.replace(/\s*[|\-–—]\s*(Magalu|Magazine Luiza|Shopee|Amazon|Mercado Livre|Americanas|KaBuM|Casas Bahia).*$/i, '').trim();

    // Calcular desconto
    let desconto = 0;
    if (precoAntigo > precoNovo && precoNovo > 0) {
        desconto = Math.round(((precoAntigo - precoNovo) / precoAntigo) * 100);
    }

    return {
        titulo,
        precoNovo,
        precoAntigo,
        desconto,
        imagem,
        loja: detectarLoja(finalUrl),
    };
}

export default async function handler(req, res) {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url } = req.query;
    if (!url) return res.status(400).json({ erro: 'Parâmetro url obrigatório' });

    try {
        const { body, finalUrl } = await fetchUrl(url);
        const produto = parsearProduto(body, finalUrl);

        if (!produto.titulo) return res.status(422).json({ erro: 'Não foi possível extrair dados do produto' });

        return res.status(200).json(produto);
    } catch (err) {
        return res.status(500).json({ erro: err.message });
    }
}
