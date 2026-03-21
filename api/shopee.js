// Arquivo: api/shopee.js (Backend da Vercel)
const crypto = require('crypto');

export default async function handler(req, res) {
  // Configurações fornecidas por você (NUNCA mostre isso no Front-End)
  const appId = '18349310952';
  
  // DICA: O ideal é colocar essa Senha lá nas "Environment Variables" do painel da Vercel
  // Mas para facilitar agora, estou colocando direto no código do backend.
  const appSecret = 'OVT5GSP5CARZR74TXZ2L3J4RRQACTAG2'; 

  try {
    // 1. A Shopee exige um timestamp do momento exato do pedido
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 2. Criação da Assinatura Criptográfica (HMAC-SHA256)
    const payload = appId + timestamp;
    const signature = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

    // 3. Montagem da URL da Shopee (Exemplo buscando ofertas gerais de Afiliados)
    // A API Open Platform da Shopee exige esses 3 parâmetros base em toda URL
    const shopeeApiUrl = `https://openapi.shopee.com.br/api/v2/affiliate/offer/list?app_id=${appId}&timestamp=${timestamp}&sign=${signature}`;

    // Faz a chamada verdadeira para a Shopee, que agora aceitará porque a assinatura está correta
    const shopeeResponse = await fetch(shopeeApiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!shopeeResponse.ok) {
        throw new Error('Falha na comunicação com a Shopee.');
    }

    const data = await shopeeResponse.json();
    
    // 4. Devolve os dados para o seu site (que os receberá na função carregarOfertasShopee() no frontend)
    // O retorno depende muito da estrutura exata da Shopee, ajustamos para a sua necessidade
    return res.status(200).json(data?.data?.list || []);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao processar integração com a Shopee' });
  }
}
