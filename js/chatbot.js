// FUNÇÕES DE INTELIGÊNCIA ARTIFICIAL (Botão e Chatbot)
// ==========================================

async function analisarOferta(idOferta) {
    const oferta = todasOfertas.find(o => o.id === idOferta);
    if (!oferta) return;
    
    const modal = document.getElementById('aiModal');
    const modalBody = document.getElementById('aiModalBody');
    
    modal.classList.add('open');
    modalBody.innerHTML = '<div class="loader-spinner" style="margin: 20px auto;"></div><p style="text-align:center; margin-top:10px;">O Teteco está a analisar o mercado e os padrões de preço... ✨</p>';

    const promptText = `
        Analise a seguinte oferta:
        - Produto: ${oferta.titulo}
        - Loja: ${oferta.loja}
        - Preço Atual: R$ ${oferta.precoNovo}
        - Preço Antigo: R$ ${oferta.precoAntigo}
        - Desconto reportado: ${oferta.desconto}%
    `;

    const dataAnalise = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemInstruction = `Você é um especialista em compras e inteligência de mercado brasileiro. Data de hoje: ${dataAnalise}.
Seu objetivo é analisar a oferta e dizer se "Vale a pena?" de forma direta, simpática e profissional.
Sempre justifique se o desconto parece real ou se é "metade do dobro" baseado no seu conhecimento geral sobre a categoria do produto.
Use a data de hoje para avaliar se o produto é atual ou de geração anterior (o que pode justificar um preço mais baixo).
Use emojis para tornar o texto mais leve.
Forneça sua resposta em, no máximo, 2 ou 3 parágrafos curtos.
Finalize sempre atribuindo uma "Nota do Teteco" de 1 a 10.`;

    const resposta = await chamarGemini(promptText, systemInstruction);
    modalBody.innerHTML = _formatarRespostaIA(resposta);
}

function fecharAiModal() {
    document.getElementById('aiModal').classList.remove('open');
}

function toggleChat() {
    chatOpen = !chatOpen;
    document.getElementById("chatWindow").classList.toggle("open", chatOpen);
    const fab = document.getElementById("chatFab");
    const fabIcon = document.getElementById("chatFabIcon");
    const fabClose = document.getElementById("chatFabClose");
    
    if(chatOpen) {
        fab.classList.add("active"); 
        fabIcon.style.display = "none";
        fabClose.style.display = "flex";
        document.getElementById("chatBadge").style.display="none";
        if(chatHistorico.length===0){
            setTimeout(()=> document.getElementById("chatSuggestions").style.display="flex", 1500);
        }
    } else {
        fab.classList.remove("active"); 
        fabIcon.style.display = "flex";
        fabClose.style.display = "none";
    }
}

function _addMsgChat(html, tipo) {
    const msgs = document.getElementById("chatMessages");
    const div = document.createElement("div");
    div.className = `chat-msg ${tipo}`;
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

async function enviarMsg(sugestao = null) {
    const input = document.getElementById("chatInput");
    const texto = sugestao || input.value.trim();
    if(!texto) return;
    
    input.value = "";
    document.getElementById("chatSuggestions").style.display = "none";
    
    // Adiciona a mensagem do utilizador à interface e ao histórico
    _addMsgChat(esc(texto), "user");
    chatHistorico.push({role: "user", content: texto});

    // Inicia a animação de "A escrever..."
    const idMsg = "typing-" + Date.now();
    _addMsgChat(`<div class="typing-dots" id="${idMsg}"><span></span><span></span><span></span></div>`, "bot");
    
    // Pega o elemento exato da animação para remover com segurança depois
    const typingMsg = document.getElementById(idMsg).parentNode;

    // Constrói o contexto atualizado das ofertas (top 20)
    const contextoOfertas = todasOfertas.slice(0, 20).map(o => `- ${o.titulo} (Loja: ${o.loja}) por R$ ${o.precoNovo}`).join('\n');
    
    // 🧠 CÉREBRO DE ELITE — BUSCA EM CASCATA COM 3 TERMOS
    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemPrompt = `Você é o Teteco, um assistente de compras de ELITE do site "O Caçador de Ofertas".
Sua missão é NUNCA deixar um cliente sem resultado. A Shopee tem um algoritmo ruim: termos muito genéricos retornam acessórios, termos muito específicos retornam zero resultados. Por isso você DEVE gerar 3 termos de busca em níveis diferentes.

📅 DATA DE HOJE: ${dataAtual}
Modelos REAIS disponíveis para venda agora (use isso para nunca errar. Hj é ${dataAtual}):
• iPhone: 17, 17 Plus, 17 Pro, 17 Pro Max são os ATUAIS (lançados set/2025). iPhone 16 ainda à venda como linha anterior. NUNCA diga que iPhone 17 não existe — ele é o mais recente!
• Samsung Galaxy S: S25, S25+, S25 Ultra, S25 Edge são os mais recentes (lançados jan/2025). S26 ainda não confirmado. Se pedirem S26, redirecione ao S25 Ultra.
• Samsung Galaxy A: A56, A36, A16 são os atuais de 2025/2026.
• Xiaomi: Redmi Note 14, Poco X7, Poco F7 estão disponíveis.
• Motorola: Moto G85, Moto G55, Edge 50 Pro estão disponíveis.
• Notebook: Dell Inspiron, Samsung Galaxy Book, Lenovo IdeaPad, Acer Aspire, ASUS VivoBook.
• Console: PS5 (PlayStation 5), Xbox Series X/S, Nintendo Switch 2 estão à venda.
• Smart TV: LG OLED, Samsung QLED, TCL QLED são os mais vendidos.
• Fones: AirPods Pro 2, Samsung Galaxy Buds 3 Pro, JBL Tune 770NC.
• Relógios: Apple Watch Series 11, Samsung Galaxy Watch 8, Xiaomi Smart Band 9.

🚨 REGRA SUPREMA — SISTEMA DE 3 TAGS OBRIGATÓRIAS 🚨
Para QUALQUER pedido de produto, você DEVE gerar EXATAMENTE 3 tags no final da resposta:

[BUSCAR: termo_especifico]      ← Nível 1: máxima especificidade (marca + modelo exato + memória/tamanho + Original)
[BUSCAR_ALT: termo_medio]       ← Nível 2: especificidade média (marca + modelo, sem extras)
[BUSCAR_SIMPLES: termo_curto]   ← Nível 3: termo simples de 2-3 palavras (fallback final)

📌 EXEMPLOS OBRIGATÓRIOS POR CATEGORIA:

SMARTPHONES:
Pedido "iphone 17" →
[BUSCAR: Smartphone Apple iPhone 17 128GB Original]
[BUSCAR_ALT: iPhone 17 Original Lacrado]
[BUSCAR_SIMPLES: iPhone 17]

Pedido "iphone 16" →
[BUSCAR: Smartphone Apple iPhone 16 128GB Original]
[BUSCAR_ALT: iPhone 16 Original Lacrado]
[BUSCAR_SIMPLES: iPhone 16]

Pedido "galaxy s25" →
[BUSCAR: Smartphone Samsung Galaxy S25 256GB Original]
[BUSCAR_ALT: Samsung Galaxy S25 Original]
[BUSCAR_SIMPLES: Galaxy S25]

Pedido "moto g" →
[BUSCAR: Smartphone Motorola Moto G85 256GB Original]
[BUSCAR_ALT: Motorola Moto G85 Original]
[BUSCAR_SIMPLES: Moto G85]

Pedido "redmi" →
[BUSCAR: Smartphone Xiaomi Redmi Note 14 256GB Original]
[BUSCAR_ALT: Xiaomi Redmi Note 14 Original]
[BUSCAR_SIMPLES: Redmi Note 14]

NOTEBOOKS:
Pedido "notebook dell" →
[BUSCAR: Notebook Dell Inspiron 15 Core i5 8GB SSD]
[BUSCAR_ALT: Notebook Dell Inspiron i5]
[BUSCAR_SIMPLES: Notebook Dell]

Pedido "notebook samsung" →
[BUSCAR: Notebook Samsung Galaxy Book Core i5 8GB SSD]
[BUSCAR_ALT: Notebook Samsung Galaxy Book]
[BUSCAR_SIMPLES: Notebook Samsung]

SMART TVs:
Pedido "tv lg" →
[BUSCAR: Smart TV LG 55 4K UHD]
[BUSCAR_ALT: Smart TV LG 4K 55]
[BUSCAR_SIMPLES: Smart TV LG]

CONSOLES:
Pedido "ps5" →
[BUSCAR: Console PlayStation 5 Original Sony]
[BUSCAR_ALT: PlayStation 5 Console Original]
[BUSCAR_SIMPLES: PS5 Console]

Pedido "xbox" →
[BUSCAR: Console Xbox Series S Original Microsoft]
[BUSCAR_ALT: Xbox Series S Original]
[BUSCAR_SIMPLES: Xbox Series S]

FONES DE OUVIDO:
Pedido "airpods" →
[BUSCAR: Fone de Ouvido Apple AirPods Pro 2 Original]
[BUSCAR_ALT: AirPods Pro 2 Original Apple]
[BUSCAR_SIMPLES: AirPods Pro]

RELÓGIOS / SMARTWATCH:
Pedido "apple watch" →
[BUSCAR: Smartwatch Apple Watch Series 10 Original GPS]
[BUSCAR_ALT: Apple Watch Series 10 Original]
[BUSCAR_SIMPLES: Apple Watch]

PERFUMES:
Pedido "212 vip" →
[BUSCAR: Perfume Carolina Herrera 212 VIP Original 100ml EDP]
[BUSCAR_ALT: Perfume 212 VIP Original 100ml]
[BUSCAR_SIMPLES: 212 VIP perfume]

ELETRODOMÉSTICOS:
Pedido "geladeira brastemp" →
[BUSCAR: Geladeira Brastemp Frost Free 375 Litros Inox]
[BUSCAR_ALT: Geladeira Brastemp Frost Free]
[BUSCAR_SIMPLES: Geladeira Brastemp]

REGRAS ADICIONAIS:
- NUNCA diga que um produto não existe se ele já está no mercado. Use a data de hoje.
- iPhone 17 e iPhone 16 SÃO produtos reais e atuais. NUNCA use frases como "buscando o futuro", "lançamento futuro" ou similares para eles. Eles existem e estão à venda!
- Converse de forma animada e simpática, depois coloque as 3 tags.
- As tags devem ser na última linha da resposta, uma por linha.

Ofertas no catálogo agora:
${contextoOfertas}
(Se o cliente pedir algo diferente do catálogo, use as 3 tags para buscar mesmo assim)`;

    const historicoRecente = chatHistorico.slice(-10);
    // Converte para formato Gemini e mescla entradas consecutivas do mesmo role
    // (Gemini exige alternância estrita user → model → user → model)
    const historicoGemini = [];
    for (const h of historicoRecente.slice(0, -1)) {
        const role = h.role === "assistant" ? "model" : "user";
        const last = historicoGemini[historicoGemini.length - 1];
        if (last && last.role === role) {
            last.parts[0].text += "\n" + h.content;
        } else {
            historicoGemini.push({ role, parts: [{ text: h.content }] });
        }
    }
    let resposta = await chamarGemini(texto, systemPrompt, historicoGemini);

    if (!resposta) resposta = "Desculpe, ocorreu uma falha na minha ligação. 😔";

    typingMsg.remove();

    // ═══ PARSER DAS 3 TAGS ═══
    const regexP  = /\[BUSCAR:\s*(.+?)\]/i;
    const regexAlt = /\[BUSCAR_ALT:\s*(.+?)\]/i;
    const regexSim = /\[BUSCAR_SIMPLES:\s*(.+?)\]/i;
    const mP  = resposta.match(regexP);
    const mA  = resposta.match(regexAlt);
    const mS  = resposta.match(regexSim);

    // Remove todas as tags do texto visível
    let textoVisivel = _formatarRespostaIA(
        resposta.replace(regexP,'').replace(regexAlt,'').replace(regexSim,'').trim()
    );
    _addMsgChat(textoVisivel, "bot");

    // Monta fila de termos: específico → médio → simples
    const terminosFila = [mP, mA, mS].filter(Boolean).map(m => m[1].trim());

    if (terminosFila.length > 0) {
        chatHistorico.push({role:"assistant", content: textoVisivel + ` (Busca iniciada: ${terminosFila[0]})`});

        const typingId2 = "typing-busca-" + Date.now();
        _addMsgChat(`<div class="typing-dots" id="${typingId2}"><span></span><span></span><span></span></div>`, "bot");
        const typingBusca = document.getElementById(typingId2).parentNode;

        // ═══ FILTRO INTELIGENTE POR CATEGORIA ═══
        function filtrarAntiAcessorios(ofertas, termo) {
            const t = termo.toLowerCase();
            // Preço mínimo por categoria — evita capinhas e películas
            const categorias = [
                { kws: ['iphone','samsung','xiaomi','motorola','smartphone','celular','redmi','poco','moto g','galaxy s','galaxy a'], min: 350 },
                { kws: ['notebook','laptop','macbook','chromebook'], min: 700 },
                { kws: ['smart tv','television'], min: 600 },
                { kws: ['playstation','ps4','ps5','xbox','nintendo','switch','console'], min: 250 },
                { kws: ['geladeira','lavadora','máquina de lavar','ar condicionado','fogão'], min: 500 },
                { kws: ['ipad','tablet'], min: 400 },
                { kws: ['smartwatch','apple watch','galaxy watch'], min: 150 },
            ];
            let precoMin = 0;
            for (const cat of categorias) {
                if (cat.kws.some(kw => t.includes(kw))) { precoMin = cat.min; break; }
            }
            if (precoMin === 0) return ofertas; // sem filtro de preço para outros produtos
            return ofertas.filter(o => (o.discountPrice || o.price) >= precoMin);
        }

        // ═══ BUSCA EM CASCATA ═══
        async function buscarComCascata(fila) {
            for (let i = 0; i < fila.length; i++) {
                const termo = fila[i];
                try {
                    const [resShopee, resML] = await Promise.allSettled([
                        fetch('/api/shopee?q=' + encodeURIComponent(termo)),
                        fetch('/api/mercadolivre?q=' + encodeURIComponent(termo))
                    ]);
                    let combinado = [];
                    if (resShopee.status === 'fulfilled' && resShopee.value.ok) {
                        const raw = await resShopee.value.json();
                        if (Array.isArray(raw)) combinado.push(...raw);
                    }
                    if (resML.status === 'fulfilled' && resML.value.ok) {
                        const raw = await resML.value.json();
                        if (Array.isArray(raw)) combinado.push(...raw);
                    }
                    const filtrado = filtrarAntiAcessorios(combinado, termo);
                    if (filtrado.length > 0) return { ofertas: filtrado, termoUsado: termo, tentativa: i + 1 };
                } catch(_) { /* tenta próximo */ }
            }
            return null;
        }

        try {
            const resultado = await buscarComCascata(terminosFila);
            typingBusca.remove();

            if (resultado) {
                const { ofertas, termoUsado } = resultado;
                let htmlOfertas = `<p style="margin-bottom:10px;font-size:13px;">Encontrei estas opções para "<b>${esc(termoUsado)}</b>":</p><div style="display:flex;flex-direction:column;gap:8px;">`;
                ofertas.slice(0, 3).forEach(o => {
                    htmlOfertas += `
                    <a href="${esc(o.offerLink)}" target="_blank" style="display:flex;gap:10px;background:var(--bg2);padding:10px;border-radius:12px;border:1px solid var(--border);text-decoration:none;color:var(--text);align-items:center;transition:all 0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                        <img src="${esc(o.imageUrl)}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:1px solid var(--border2);flex-shrink:0;">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:11px;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(o.offerName)}</div>
                            <div style="color:var(--accent);font-weight:800;font-size:14px;margin-top:4px;">${formatarMoeda(o.discountPrice || o.price)}</div>
                        </div>
                    </a>`;
                });
                htmlOfertas += `</div>`;
                _addMsgChat(htmlOfertas, "bot");
                chatHistorico.push({role:"assistant", content:`Mostrei ${ofertas.length} resultado(s) da Shopee para "${termoUsado}".`});
            } else {
                _addMsgChat(`Esgotei todas as buscas e não encontrei nada disponível para "<b>${esc(terminosFila[0])}</b>" agora. 😔 Manda no nosso <a href="https://t.me/ocacadordeoferta" target="_blank" style="color:var(--accent);font-weight:700;">grupo do Telegram</a> que a equipe vai garimpar pra você!`, "bot");
                chatHistorico.push({role:"assistant", content:`Sem resultados para ${terminosFila[0]} após 3 tentativas.`});
            }
        } catch (error) {
            typingBusca.remove();
            _addMsgChat(`Tive uma falha de conexão ao buscar "<b>${esc(terminosFila[0])}</b>". Tente novamente em instantes. 🔌`, "bot");
        }
    } else {
        chatHistorico.push({role:"assistant", content: resposta});
    }
}

// ==========================================
