const https = require('https');
const http = require('http');
const zlib = require('zlib');
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout: 12000,
        };

        const req = lib.request(options, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                const next = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : `${parsed.protocol}//${parsed.hostname}${res.headers.location}`;
                res.resume();
                return resolve(fetchUrl(next, redirects + 1));
            }
            const encoding = (res.headers['content-encoding'] || '').toLowerCase();
            let stream = res;
            if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
            else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
            else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());

            const chunks = [];
            stream.on('data', chunk => { if (chunks.reduce((a, c) => a + c.length, 0) < 500000) chunks.push(chunk); });
            stream.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8'), finalUrl: urlStr }));
            stream.on('error', reject);
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

function parsearAmazon(body) {
    const regexTag = (id, tag = 'span') => {
        const m = body.match(new RegExp(`<${tag}[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
    };

    const titulo = regexTag('productTitle') || regexTag('title', 'h1');

    // Preço: whole + fraction
    const whole = body.match(/<span[^>]+class=["'][^"']*a-price-whole[^"']*["'][^>]*>([\d.]+)/i);
    const frac  = body.match(/<span[^>]+class=["'][^"']*a-price-fraction[^"']*["'][^>]*>(\d+)/i);
    const precoNovo = whole ? parseFloat(`${whole[1].replace(/\./g,'')}.${frac ? frac[1] : '00'}`) : 0;

    // Preço antigo (taxado)
    const antigoM = body.match(/<span[^>]+class=["'][^"']*a-price\s+a-text-price[^"']*["'][^>]*>[\s\S]*?<span[^>]*>([\d.,R$\s]+)<\/span>/i);
    const precoAntigo = antigoM ? extrairPreco(antigoM[1]) : 0;

    // Imagem principal
    const imgM = body.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i)
               || body.match(/id=["']imgBlkFront["'][^>]+src=["']([^"']+)["']/i);
    const imagem = imgM ? imgM[1] : '';

    return { titulo: titulo || '', precoNovo, precoAntigo, imagem };
}

function parsearProduto(body, finalUrl) {
    const isAmazon = finalUrl.includes('amazon.com');
    const jsonLd = extrairJsonLd(body);
    let titulo = '', precoNovo = 0, precoAntigo = 0, imagem = '';

    // Amazon: usar parser específico primeiro
    if (isAmazon) {
        const az = parsearAmazon(body);
        titulo = az.titulo;
        precoNovo = az.precoNovo;
        precoAntigo = az.precoAntigo;
        imagem = az.imagem;
    }

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

        // Retorna mesmo com dados parciais — admin pode completar manualmente
        if (!produto.titulo && !produto.imagem && !produto.precoNovo) {
            return res.status(422).json({ erro: 'Site bloqueou o acesso automático. Preencha manualmente.' });
        }

        return res.status(200).json(produto);
    } catch (err) {
        return res.status(500).json({ erro: err.message });
    }
}
