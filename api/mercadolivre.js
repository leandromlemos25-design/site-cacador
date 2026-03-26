export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = !origin || origin.includes('ocacadordeofertas.com') || origin.includes('vercel.app') || origin.includes('localhost');
  if (!allowed) return res.status(403).json({ error: 'Acesso negado.' });

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const afiliadoId = 'FF182A-079E';

  try {
    // API pública do ML — não precisa de autenticação para busca
    const searchQuery = req.query?.q || 'oferta desconto';
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searchQuery)}&limit=20&sort=relevance`;

    const searchRes = await fetch(url);
    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(500).json({ error: 'Erro na busca do Mercado Livre.', detalhe: searchData });
    }

    const produtos = (searchData.results || [])
      .filter(p => p.original_price && p.original_price > p.price)
      .slice(0, 12)
      .map(p => {
        const desconto = Math.round(((p.original_price - p.price) / p.original_price) * 100);
        return {
          offerName:     p.title,
          price:         p.original_price,
          discountPrice: p.price,
          discountRate:  desconto,
          offerLink:     `${p.permalink}?tracking_id=${afiliadoId}`,
          imageUrl:      p.thumbnail?.replace('http://', 'https://').replace('-I.jpg', '-O.jpg') || '',
          loja:          'mercadolivre'
        };
      });

    return res.status(200).json(produtos);

  } catch (error) {
    return res.status(500).json({ error: 'Falha interna.', detalhe: error.message });
  }
}
