const https = require('https');

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = !origin || origin.includes('ocacadordeofertas.com') || origin.includes('vercel.app') || origin.includes('localhost');
  if (!allowed) return res.status(403).json({ error: 'Acesso negado.' });

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const afiliadoId = 'FF182A-079E';
  const searchQuery = req.query?.q || 'smartphone celular notebook';
  const path = `/sites/MLB/search?q=${encodeURIComponent(searchQuery)}&limit=50&sort=relevance`;

  try {
    const searchData = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mercadolibre.com',
        port: 443,
        path,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      };
      const reqML = https.request(options, (resML) => {
        let body = '';
        resML.on('data', chunk => body += chunk);
        resML.on('end', () => {
          try { resolve(JSON.parse(body)); } catch(e) { reject(new Error('Resposta inválida do ML')); }
        });
      });
      reqML.on('error', reject);
      reqML.end();
    });

    const produtos = (searchData.results || [])
      .map(p => {
        const precoOriginal = p.original_price || null;
        const precoAtual = p.price || 0;
        const desconto = precoOriginal && precoOriginal > precoAtual
          ? Math.round(((precoOriginal - precoAtual) / precoOriginal) * 100)
          : 0;
        return {
          offerName:     p.title,
          price:         precoOriginal || precoAtual,
          discountPrice: precoAtual,
          discountRate:  desconto,
          offerLink:     `${p.permalink}?tracking_id=${afiliadoId}`,
          imageUrl:      (p.thumbnail || '').replace('http://', 'https://').replace('-I.jpg', '-O.jpg'),
          loja:          'mercadolivre'
        };
      })
      .filter(p => p.discountRate >= 5)
      .slice(0, 12);

    return res.status(200).json(produtos);

  } catch (error) {
    return res.status(500).json({ error: 'Falha interna.', detalhe: error.message });
  }
}
