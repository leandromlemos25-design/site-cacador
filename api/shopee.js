// Arquivo: api/shopee.js
const crypto = require('crypto');
const https = require('https');

export default async function handler(req, res) {
  const appId = '18349310952';
  const appSecret = 'OVT5GSP5CARZR74TXZ2L3J4RRQACTAG2'; 

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Payload exato como exigido pela Shopee Open Platform GraphQL
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

    // Construção rigorosa da assinatura
    const baseString = appId + timestamp + graphqlPayload + appSecret;
    const signature = crypto.createHash('sha256').update(baseString).digest('hex');

    // MUDANÇA AQUI: Apontando para o servidor GLOBAL oficial da Shopee
    const options = {
      hostname: 'partner.shopeemobile.com', 
      port: 443,
      path: '/api/v2/affiliate/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
        'Content-Length': Buffer.byteLength(graphqlPayload)
      }
    };

    // Retorna uma Promise para lidar com a requisição HTTPS
    const data = await new Promise((resolve, reject) => {
      const reqShopee = https.request(options, (resShopee) => {
        let responseBody = '';
        resShopee.on('data', (chunk) => responseBody += chunk);
        resShopee.on('end', () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            reject(new Error("Resposta da Shopee não é um JSON válido"));
          }
        });
      });

      reqShopee.on('error', (e) => reject(e));
      reqShopee.write(graphqlPayload);
      reqShopee.end();
    });

    // Se a Shopee recusar a assinatura ou os parâmetros (Aqui veremos o que a Shopee responde!)
    if (data.errors || data.error) {
        return res.status(400).json({ 
            erro_identificado: 'A Shopee recusou a requisição.', 
            detalhes_oficiais_da_shopee: data.errors || data
        });
    }
    
    // Sucesso Absoluto!
    const produtos = data.data?.productOfferV2?.nodes || [];
    return res.status(200).json(produtos);

  } catch (error) {
    // Se a rede falhar
    console.error("Erro Crítico na Vercel:", error.message);
    return res.status(500).json({ 
        erro_identificado: 'Falha na comunicação de rede com a Shopee', 
        detalhes: error.message 
    });
  }
}
