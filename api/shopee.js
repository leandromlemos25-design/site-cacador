const crypto = require('crypto');
const https = require('https');

export default async function handler(req, res) {
  const appId = process.env.SHOPEE_APP_ID;
  const appSecret = process.env.SHOPEE_APP_SECRET; 

  if (!appId || !appSecret) {
      return res.status(500).json({ erro_identificado: 'Credenciais da Shopee não configuradas nas variáveis de ambiente da Vercel.' });
  }

  // MUDANÇA: Aumentamos o limite para 20. Assim o filtro do site (index.html) terá munição de sobra para jogar as capinhas fora e exibir os celulares.
  const searchQuery = req.query?.q || "";
  const limit = searchQuery ? 20 : 12; 
  const keywordFilter = searchQuery ? `, keyword: "${searchQuery}"` : "";

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Injetamos a palavra-chave (keyword) na requisição se ela existir
    const graphqlPayload = JSON.stringify({
      query: `
        {
          productOfferV2(page: 1, limit: ${limit}${keywordFilter}) {
            nodes {
              productName
              price
              priceDiscountRate
              offerLink
              imageUrl
            }
          }
        }
      `
    });

    const baseString = appId + timestamp + graphqlPayload + appSecret;
    const signature = crypto.createHash('sha256').update(baseString).digest('hex');

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

    if (data.errors || data.error) {
        return res.status(400).json({ 
            erro_identificado: 'A Shopee recusou os campos.', 
            detalhes_oficiais_da_shopee: data.errors || data
        });
    }
    
    const nodes = data.data?.productOfferV2?.nodes || [];
    
    const produtosFormatados = nodes.map(n => {
        const precoAtual = parseFloat(n.price) || 0;
        const porcentagemDesconto = parseFloat(n.priceDiscountRate) || 0;
        let precoAntigo = precoAtual;
        
        if (porcentagemDesconto > 0 && porcentagemDesconto < 100) {
            precoAntigo = precoAtual / (1 - (porcentagemDesconto / 100));
        }

        return {
            offerName: n.productName || "Oferta Shopee",
            price: precoAntigo,            
            discountPrice: precoAtual,     
            discountRate: porcentagemDesconto,
            offerLink: n.offerLink,
            imageUrl: n.imageUrl
        };
    });

    return res.status(200).json(produtosFormatados);

  } catch (error) {
    return res.status(500).json({ 
        erro_identificado: 'Falha interna', 
        detalhes: error.message 
    });
  }
}
