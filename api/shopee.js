const crypto = require('crypto');
const https = require('https');

export default async function handler(req, res) {
  const appId = '18349310952';
  const appSecret = 'OVT5GSP5CARZR74TXZ2L3J4RRQACTAG2'; 

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Payload GraphQL da API de Afiliados
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

    // Assinatura (Regra da API de Afiliados da Shopee)
    const baseString = appId + timestamp + graphqlPayload + appSecret;
    const signature = crypto.createHash('sha256').update(baseString).digest('hex');

    // MUDANÇA AQUI: O domínio e caminho exclusivos para AFILIADOS no Brasil
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

    // Faz a requisição HTTPS
    const data = await new Promise((resolve, reject) => {
      const reqShopee = https.request(options, (resShopee) => {
        let responseBody = '';
        resShopee.on('data', (chunk) => responseBody += chunk);
        resShopee.on('end', () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            reject(new Error("A Shopee não retornou um JSON válido"));
          }
        });
      });

      reqShopee.on('error', (e) => reject(e));
      reqShopee.write(graphqlPayload);
      reqShopee.end();
    });

    // Se a Shopee recusar a credencial (Veremos o motivo exato)
    if (data.errors || data.error) {
        return res.status(400).json({ 
            erro_identificado: 'A Shopee recusou o seu AppID ou Assinatura de Afiliado.', 
            detalhes_oficiais_da_shopee: data.errors || data
        });
    }
    
    // Sucesso! Extrai as ofertas
    const produtos = data.data?.productOfferV2?.nodes || [];
    return res.status(200).json(produtos);

  } catch (error) {
    console.error("Erro na Vercel:", error.message);
    return res.status(500).json({ 
        erro_identificado: 'Falha na comunicação de rede com a Shopee', 
        detalhes: error.message 
    });
  }
}
