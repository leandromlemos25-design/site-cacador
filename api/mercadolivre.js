export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = !origin || origin.includes('ocacadordeofertas.com') || origin.includes('vercel.app') || origin.includes('localhost');
  if (!allowed) return res.status(403).json({ error: 'Acesso negado.' });

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const appId     = process.env.ML_APP_ID;
  const appSecret = process.env.ML_APP_SECRET;
  const afiliadoId = 'FF182A-079E';

  if (!appId || !appSecret) {
    return res.status(500).json({ error: 'Credenciais do Mercado Livre não configuradas.' });
  }

  try {
    // 1. Obter access token via client_credentials
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: `grant_type=client_credentials&client_id=${appId}&client_secret=${appSecret}`
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(500).json({ error: 'Falha ao autenticar no Mercado Livre.', detalhe: tokenData });
    }
    const token = tokenData.access_token;

    // 2. Buscar produtos com desconto no Brasil
    const searchQuery = req.query?.q || '';
    const endpoint = searchQuery
      ? `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searchQuery)}&limit=20&sort=relevance`
      : `https://api.mercadolibre.com/sites/MLB/search?q=oferta+do+dia&limit=20&sort=price_desc`;

    const searchRes = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(500).json({ error: 'Erro na busca do Mercado Livre.', detalhe: searchData });
    }

    const produtos = (searchData.results || [])
      .filter(p => p.original_price && p.original_price > p.price)
      .slice(0, 12)
      .map(p => {
        const desconto = Math.round(((p.original_price - p.price) / p.original_price) * 100);
        // Embute o ID de afiliado no link do produto
        const linkAfiliado = `${p.permalink}?tracking_id=${afiliadoId}`;
        return {
          offerName:    p.title,
          price:        p.original_price,
          discountPrice: p.price,
          discountRate: desconto,
          offerLink:    linkAfiliado,
          imageUrl:     p.thumbnail?.replace('http://', 'https://').replace('-I.jpg', '-O.jpg') || '',
          loja:         'mercadolivre'
        };
      });

    return res.status(200).json(produtos);

  } catch (error) {
    return res.status(500).json({ error: 'Falha interna.', detalhe: error.message });
  }
}
