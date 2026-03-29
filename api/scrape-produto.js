const https = require('https');
const http = require('http');
const zlib = require('zlib');
const { URL } = require('url');
const { load } = require('cheerio');

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
            stream.on('data', chunk => { if (chunks.reduce((a, c) => a + c.length, 0) < 600000) chunks.push(chunk); });
            stream.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8'), finalUrl: urlStr }));
            stream.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

function extrairPreco(str) {
    if (!str) return 0;
    const s = String(str).replace(/[^\d.,]/g, '');
    if (s.includes(',') && s.includes('.')) return parseFloat(s.replace('.', '').replace(',', '.')) || 0;
    if (s.includes(',')) return parseFloat(s.replace(',', '.')) || 0;
    return parseFloat(s) || 0;
}

function extrairJsonLd($) {
    let produto = null;
    $('script[type="application/ld+json"]').each((_, el) => {
        if (produto) return;
        try {
            const data = JSON.parse($(el).html());
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
                const type = (item['@type'] || '').toLowerCase();
                if (type === 'product' || type.includes('product')) { produto = item; return; }
                if (item['@graph']) {
                    const p = item['@graph'].find(i => (i['@type'] || '').toLowerCase().includes('product'));
                    if (p) { produto = p; return; }
                }
            }
        } catch {}
    });
    return produto;
}

function parsearAmazon($, body) {
    const titulo = $('#productTitle').text().trim()
               || $('h1.a-size-large').first().text().trim();

    // Preço: tentar vários seletores
    let precoNovo = 0;
    const whole = $('.a-price-whole').first().text().replace(/\./g, '').trim();
    const frac   = $('.a-price-fraction').first().text().trim();
    if (whole) precoNovo = parseFloat(`${whole}.${frac || '00'}`);

    if (!precoNovo) {
        const jsonM = body.match(/"priceAmount"\s*:\s*([\d.]+)/);
        if (jsonM) precoNovo = parseFloat(jsonM[1]);
    }

    // Preço antigo
    const antigoTxt = $('.a-text-price .a-offscreen').first().text()
                   || $('[data-a-strike="true"]').first().text();
    const precoAntigo = extrairPreco(antigoTxt);

    // Imagem
    let imagem = $('#landingImage').attr('src')
              || $('#imgBlkFront').attr('src')
              || '';
    if (!imagem) {
        const hiRes = body.match(/"hiRes"\s*:\s*"(https:[^"]+)"/)
                   || body.match(/"large"\s*:\s*"(https:[^"]+\.jpg[^"]*)"/);
        if (hiRes) imagem = hiRes[1];
    }

    return { titulo, precoNovo, precoAntigo, imagem };
}

function parsearMagalu($) {
    const titulo = $('h1[class*="product-title"], h1[class*="Title"], h1.sc-dcJsrY').first().text().trim();
    const precoNovo = extrairPreco($('[class*="price-value"], [class*="Price"] [class*="value"], [data-testid="price-value"]').first().text());
    const precoAntigo = extrairPreco($('[class*="original-price"], [class*="OldPrice"], [data-testid="original-price"]').first().text());
    const imagem = $('img[class*="product-image"], img[class*="ProductImage"]').first().attr('src') || '';
    return { titulo, precoNovo, precoAntigo, imagem };
}

function parsearMercadoLivre($) {
    const titulo = $('h1.ui-pdp-title').first().text().trim();
    const precoNovo = extrairPreco($('.andes-money-amount__fraction').first().text());
    const precoAntigo = extrairPreco($('.ui-pdp-price__original-value .andes-money-amount__fraction').first().text());
    const imagem = $('img.ui-pdp-image').first().attr('data-zoom')
               || $('img.ui-pdp-image').first().attr('src') || '';
    return { titulo, precoNovo, precoAntigo, imagem };
}

function parsearProduto(body, finalUrl) {
    const $ = load(body);
    const loja = detectarLoja(finalUrl);
    let titulo = '', precoNovo = 0, precoAntigo = 0, imagem = '';

    // Parsers específicos por loja
    if (loja === 'Amazon') {
        const az = parsearAmazon($, body);
        titulo = az.titulo; precoNovo = az.precoNovo;
        precoAntigo = az.precoAntigo; imagem = az.imagem;
    } else if (loja === 'Magalu') {
        const mg = parsearMagalu($);
        titulo = mg.titulo; precoNovo = mg.precoNovo;
        precoAntigo = mg.precoAntigo; imagem = mg.imagem;
    } else if (loja === 'Mercado Livre') {
        const ml = parsearMercadoLivre($);
        titulo = ml.titulo; precoNovo = ml.precoNovo;
        precoAntigo = ml.precoAntigo; imagem = ml.imagem;
    }

    // Fallback universal: JSON-LD
    if (!titulo || !precoNovo) {
        const jsonLd = extrairJsonLd($);
        if (jsonLd) {
            if (!titulo) titulo = jsonLd.name || '';
            const img = jsonLd.image;
            if (!imagem) imagem = Array.isArray(img) ? img[0] : (img?.url || img || '');
            const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
            if (offer && !precoNovo) {
                precoNovo = extrairPreco(offer.price);
                precoAntigo = extrairPreco(offer.highPrice || 0);
            }
        }
    }

    // Fallback final: OG tags via Cheerio
    if (!titulo) titulo = $('meta[property="og:title"]').attr('content')
                       || $('meta[name="twitter:title"]').attr('content') || '';
    if (!imagem) imagem = $('meta[property="og:image"]').attr('content')
                       || $('meta[name="twitter:image"]').attr('content') || '';

    // Limpar sufixo de loja do título
    titulo = titulo.replace(/\s*[|\-–—]\s*(Magalu|Magazine Luiza|Shopee|Amazon|Mercado Livre|Americanas|KaBuM|Casas Bahia).*$/i, '').trim();

    const desconto = precoAntigo > precoNovo && precoNovo > 0
        ? Math.round(((precoAntigo - precoNovo) / precoAntigo) * 100) : 0;

    return { titulo, precoNovo, precoAntigo, desconto, imagem, loja };
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

        if (!produto.titulo && !produto.imagem && !produto.precoNovo) {
            return res.status(422).json({ erro: 'Site bloqueou o acesso automático. Preencha manualmente.' });
        }

        return res.status(200).json(produto);
    } catch (err) {
        return res.status(500).json({ erro: err.message });
    }
}
