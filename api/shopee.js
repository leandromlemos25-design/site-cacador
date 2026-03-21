export default async function handler(req, res) {
  const appId = '18349310952';
  const appSecret = 'OVT5GSP5CARZR74TXZ2L3J4RRQACTAG2'; 

  try {
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // A API de Afiliados da Shopee exige o padrão GraphQL
    const graphqlPayload = JSON.stringify({
      query: `
        {
          productOfferV2(page: 1, limit: 12) {
            nodes {
              offerName
              price
              discountPrice
              discountRate
              offerLink
              imageUrl
            }
          }
        }
      `
    });

    // Criptografia exigida para Afiliados (AppId + Timestamp + Payload + Secret)
    const baseString = appId + timestamp + graphqlPayload + appSecret;
    const signature = crypto.createHash('sha256').update(baseString).digest('hex');

    // Endpoint oficial de Afiliados
    const shopeeApiUrl = 'https://openapi.shopee.com.br/api/v2/affiliate/graphql';

    const shopeeResponse = await fetch(shopeeApiUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
        },
        body: graphqlPayload
    });

    const data = await shopeeResponse.json();

    // Se a Shopee recusar, agora vamos ver o motivo exato!
    if (!shopeeResponse.ok || data.errors) {
        console.error("Erro da Shopee:", data);
        return res.status(400).json({ 
            erro_identificado: 'A Shopee recusou o acesso.', 
            detalhes_oficiais_da_shopee: data.errors || data 
        });
    }
    
    // Sucesso!
    const produtos = data.data?.productOfferV2?.nodes || [];
    return res.status(200).json(produtos);

  } catch (error) {
    // Se a Vercel falhar por algum motivo de código
    console.error("Erro na Vercel:", error.message);
    return res.status(500).json({ 
        erro_identificado: 'Falha interna na Vercel', 
        detalhes: error.message 
    });
  }
}
