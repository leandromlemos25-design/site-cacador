async function carregarOfertasMercadoLivre() {
    try {
        const response = await fetch('/api/mercadolivre');
        if (!response.ok) throw new Error('Falha ao obter ofertas do Mercado Livre.');
        const ofertas = await response.json();
        if (ofertas && ofertas.length > 0) {
            const maxId = todasOfertas.length > 0 ? Math.max(...todasOfertas.map(o => o.id)) : 0;
            const novas = ofertas.map((oferta, index) => ({
                id: maxId + index + 1,
                loja: "mercadolivre",
                titulo: oferta.offerName || "Oferta Mercado Livre",
                precoAntigo: oferta.price || 0,
                precoNovo: oferta.discountPrice || 0,
                desconto: oferta.discountRate || 0,
                link: oferta.offerLink || "#",
                img: oferta.imageUrl || "🛒",
                categoria: "Mercado Livre",
                selo: "🔥 EXCLUSIVO",
                ativo: true,
                timestamp: Date.now()
            }));
            todasOfertas = [...todasOfertas, ...novas];
            renderizarTudo();
        }
    } catch (err) {
        console.warn("Aviso ML API Frontend:", err.message);
        if (typeof Sentry !== 'undefined') Sentry.captureException(err, { tags: { api: 'mercadolivre' } });
    }
}

async function carregarOfertasShopee() {
    try {
        const response = await fetch('/api/shopee');
        if (!response.ok) throw new Error('Falha ao obter ofertas da Shopee pelo servidor.');
        
        const ofertasShopee = await response.json();
        
        if (ofertasShopee && ofertasShopee.length > 0) {
            const maxId = todasOfertas.length > 0 ? Math.max(...todasOfertas.map(o => o.id)) : 0;
            
            const novasFormatadas = ofertasShopee.map((oferta, index) => ({
                id: maxId + index + 1,
                loja: "shopee",
                titulo: oferta.offerName || "Oferta Shopee",
                precoAntigo: oferta.price || 0, 
                precoNovo: oferta.discountPrice || 0,
                desconto: oferta.discountRate || 0,
                link: oferta.offerLink || "#",
                img: oferta.imageUrl || "🧡",
                categoria: "Shopee",
                selo: "🔥 EXCLUSIVO",
                ativo: true,
                timestamp: Date.now()
            }));

            todasOfertas = [...todasOfertas, ...novasFormatadas];
            renderizarTudo();
        }
    } catch (err) {
        console.warn("Aviso Shopee API Frontend:", err.message);
        if (typeof Sentry !== 'undefined') Sentry.captureException(err, { tags: { api: 'shopee' } });
    }
}

async function carregarOfertas(silencioso = false) {
    if (!CONFIG.SHEET_ID || CONFIG.SHEET_ID.includes("COLE")) return;
    
    if (!silencioso) {
        const dest = document.getElementById("destaqueGrid");
        const oft = document.getElementById("ofertasGrid");
        if(dest) dest.innerHTML = getSkeletonsHTML(4);
        if(oft) oft.innerHTML = getSkeletonsHTML(8);
        const cached = lerCache();
        if (cached) { todasOfertas = cached; renderizarTudo(); }
    }

    const refreshBar = document.getElementById("refreshBar");
    if (refreshBar) refreshBar.classList.add("atualizando");

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_TAB)}`;
        
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const text = await resp.text();
        
        if (text.includes("Sign in") || text.trim().startsWith("<")) throw new Error("Privada");
        
        const json = JSON.parse(text.substring(text.indexOf("(") + 1, text.lastIndexOf(")")));
        const cols = json.table.cols.map(c => (c.label || "").toLowerCase().trim());
        
        const COL_MAP = {
            loja:         { nomes: ["loja", "store"],          idx: 0 },
            titulo:       { nomes: ["titulo", "título", "title", "nome", "produto"], idx: 1 },
            preco_antigo: { nomes: ["preco_antigo", "preço_antigo", "old_price", "preco antigo"], idx: 2 },
            preco_novo:   { nomes: ["preco_novo", "preço_novo", "new_price", "preco novo", "preco", "preço"], idx: 3 },
            link:         { nomes: ["link", "url"],            idx: 4 },
            data:         { nomes: ["data", "date"],           idx: 5 },
            emoji:        { nomes: ["emoji", "icone"],         idx: 6 },
            categoria:    { nomes: ["categoria", "category"],  idx: 7 },
            selo:         { nomes: ["selo", "badge", "tag"],   idx: 8 },
            ativo:        { nomes: ["ativo", "active"],        idx: 9 },
            imagem:       { nomes: ["imagem", "image", "img"], idx: 10 },
            banner:       { nomes: ["banner"],                 idx: 11 },
        };

        const colIdx = {};
        for (const [campo, config] of Object.entries(COL_MAP)) {
            let encontrado = -1;
            for (const nome of config.nomes) {
                const idx = cols.indexOf(nome);
                if (idx >= 0) { encontrado = idx; break; }
            }
            colIdx[campo] = encontrado >= 0 ? encontrado : config.idx;
        }

        const getCel = (row, campo) => {
            const idx = colIdx[campo];
            if (idx >= 0 && idx < row.c.length && row.c[idx]) {
                return row.c[idx].v || "";
            }
            return "";
        };
        
        const novas = json.table.rows.map((row, i) => {
            const pA = parsePreco(getCel(row, "preco_antigo"));
            const pN = parsePreco(getCel(row, "preco_novo"));
            
            let ts = getCel(row, "data") ? parseDataCustom(String(getCel(row, "data"))) : (Date.now() - i * 60000);
            if (isNaN(ts)) ts = Date.now() - i * 60000;

            const ativoStr = String(getCel(row, "ativo")).toLowerCase().trim();
            const ativo = !["nao", "não", "false", "0"].includes(ativoStr);
            
            const isUrl = (s) => s && (String(s).startsWith("http") || String(s).startsWith("//"));
            const colEmoji = String(getCel(row, "emoji") || "");
            const colImagem = String(getCel(row, "imagem") || "");
            
            const imgRaw = isUrl(colImagem) ? colImagem : (isUrl(colEmoji) ? colEmoji : "");
            const emojiF = !isUrl(colEmoji) && colEmoji ? colEmoji : "🛒";

            return {
                id: i + 1,
                loja: normalizarLoja(String(getCel(row, "loja") || "")),
                titulo: getCel(row, "titulo") || "Produto Oferta",
                precoAntigo: pA, precoNovo: pN,
                desconto: pA > 0 && pA > pN ? Math.round((1 - pN / pA) * 100) : 0,
                link: getCel(row, "link") || "#",
                img: imgRaw || emojiF,
                categoria: getCel(row, "categoria") || "Geral",
                selo: getCel(row, "selo") || "",
                banner: String(getCel(row, "banner") || "").toUpperCase() === "TRUE",
                ativo, timestamp: ts
            };
        }).filter(o => {
            // Filtro de expiração: Apaga as ofertas velhas para manter o site limpo
            const maxIdadeMs = CONFIG.DIAS_EXPIRACAO * 24 * 60 * 60 * 1000;
            const isRecente = (Date.now() - o.timestamp) <= maxIdadeMs;
            return o.ativo && o.precoNovo > 0 && isRecente;
        });

        if (silencioso && todasOfertas.length > 0) {
            const qtdNovos = novas.length - todasOfertas.length;
            if (qtdNovos > 0) mostrarToast("🔥", `${qtdNovos} novas ofertas!`);
        }

        todasOfertas = novas;
        ultimaAtualizacao = Date.now();
        salvarCache(todasOfertas);

    } catch (err) {
        console.warn("API Sheets erro:", err.message);
        if (typeof Sentry !== 'undefined') Sentry.captureException(err, { tags: { api: 'sheets' } });
        // Fallback: usar cache mesmo expirado se Sheets falhar
        const cached = lerCache();
        if (cached && todasOfertas.length === 0) {
            todasOfertas = cached;
            mostrarToast('📦', 'Exibindo ofertas salvas (sem conexão com servidor)');
        }
    }

    // Shopee e ML carregam independente do resultado do Sheets
    await Promise.all([carregarOfertasShopee(), carregarOfertasMercadoLivre()]);

    if (refreshBar) refreshBar.classList.remove("atualizando");
    document.getElementById("refreshStatus").textContent = "Atualizado agora";
    renderizarTudo();
}

function iniciarAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => carregarOfertas(true), CONFIG.REFRESH_INTERVAL);
    setInterval(() => {
        if(ultimaAtualizacao) document.getElementById("refreshStatus").textContent = `Atualizado há ${Math.round((Date.now()-ultimaAtualizacao)/60000)}m`;
    }, 60000);
}

function aplicarOrdem(lista) {
    const c = [...lista];
    switch (ordemAtual) {
        case "desconto": return c.sort((a, b) => b.desconto - a.desconto);
        case "menor":    return c.sort((a, b) => a.precoNovo - b.precoNovo);
        case "maior":    return c.sort((a, b) => b.precoNovo - a.precoNovo);
        case "recente":  return c.sort((a, b) => b.timestamp - a.timestamp);
        default:         return c;
    }
}

function criarCardHTML(o, delayIdx) {
    const loja = LOJAS[o.loja] || LOJAS.outras;
    const bgGrad = o.desconto >= 50 ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "linear-gradient(135deg, var(--accent2), #ff9e00)";
    const fav = isFavorito(o.id);
    const novo = ((Date.now() - o.timestamp) / 3600000) <= CONFIG.HORAS_NOVO;
    
    const isImgUrl = o.img && (o.img.startsWith("http") || o.img.startsWith("//"));
    const imgContent = isImgUrl
        ? `<img data-src="${esc(o.img)}" class="lazy-img" alt="${esc(o.titulo)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="img-placeholder" style="display:none;background:linear-gradient(135deg,${loja.cor}22,${loja.cor}44)">
             <span style="font-size:36px">${loja.emoji}</span>
             <span style="font-size:11px;font-weight:600;color:${loja.cor};margin-top:6px;text-align:center;padding:0 8px;line-height:1.3">${esc(o.titulo.slice(0,40))}${o.titulo.length>40?'…':''}</span>
           </div>`
        : `<div class="img-placeholder" style="background:linear-gradient(135deg,${loja.cor}22,${loja.cor}44)"><span style="font-size:36px">${esc(o.img)}</span></div>`;

    const parcelaHtml = o.precoNovo >= 50
        ? `<span style="color:var(--text3);font-style:italic">Parcela na loja →</span>`
        : `<strong style="color:var(--green)">Preço acessível</strong>`;

    return `
    <div class="oferta-card fade-up" data-oferta-id="${o.id}" style="animation-delay:${(delayIdx%10)*0.05}s">
        <div class="badges-top-left">
            ${o.desconto > 0 ? `<div class="oferta-desconto" style="background:${bgGrad}">-${o.desconto}%</div>` : ''}
            ${o.selo ? `<div class="oferta-selo" style="background:${loja.cor};color:#fff">${esc(o.selo)}</div>` : ''}
        </div>
        ${novo ? `<div class="badge-novo">NOVO</div>` : ''}
        
        <button class="btn-favorito ${fav ? 'ativo' : ''}" data-id="${o.id}" onclick="window.toggleFavorito(${o.id})" aria-label="${fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            ${fav ? '❤️' : '🤍'}
        </button>
        
        <div class="oferta-img">
            ${imgContent}
            <div class="oferta-loja-badge" style="background:${loja.cor}22;color:${loja.cor}">${esc(loja.nome)}</div>
        </div>
        <div class="oferta-body">
            <div class="oferta-cat">${esc(o.categoria)}</div>
            <div class="oferta-titulo" title="${esc(o.titulo)}">${esc(o.titulo)}</div>
            <div>
                ${o.precoAntigo > o.precoNovo ? `<div class="oferta-preco-antigo">${formatarMoeda(o.precoAntigo)}</div>` : ''}
                <div class="oferta-preco-novo">${formatarMoeda(o.precoNovo)}</div>
                <div class="oferta-parcelamento">${parcelaHtml}</div>
                ${o.desconto > 0 ? `<div class="oferta-economia">Poupa ${formatarMoeda(o.precoAntigo - o.precoNovo)}</div>` : ''}
            </div>
            <div class="botoes-acao">
                <button class="ai-btn" onclick="window.analisarOferta(${o.id})" aria-label="Analisar oferta com Inteligência Artificial" title="A IA analisa se vale a pena!">✨</button>
                <button class="btn-comparar" data-comparar-id="${o.id}" onclick="window.toggleComparar(${o.id})" title="Adicionar à comparação">⚖️</button>
                <a href="${esc(o.link)}" target="_blank" rel="noopener" class="oferta-btn" style="background:${loja.cor}15;color:${loja.cor};border:1px solid ${loja.cor}40" onmouseover="this.style.background='${loja.cor}';this.style.color='#fff'" onmouseout="this.style.background='${loja.cor}15';this.style.color='${loja.cor}'" onclick="window.trackClick(${o.id},'${esc(o.titulo)}','${o.loja}',${o.precoNovo})">
                    Pegar Oferta 🛒
                </a>
                <button class="btn-alerta" onclick="window.abrirAlertaPreco(${o.id})" title="Alerta de preço">🔔</button>
                <button class="btn-partilhar" onclick="window.compartilharOferta('${esc(o.titulo)}', '${esc(o.link)}', ${o.id})" aria-label="Partilhar oferta ${esc(o.titulo)}" title="Partilhar">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
            </div>
        </div>
    </div>`;
}

function renderDestaques() {
    const grid = document.getElementById("destaqueGrid");
    if (!grid || todasOfertas.length === 0) return;
    
    // Filtra quem tem a palavra DESTAQUE ou um super desconto
    let destCandidatos = todasOfertas.filter(o => (o.selo && o.selo.includes("DESTAQUE")) || o.desconto >= 10);
    
    // Força os itens manuais marcados como "DESTAQUE" a ficarem no topo absoluto da vitrine VIP
    destCandidatos.sort((a, b) => {
        const aDest = (a.selo && a.selo.includes("DESTAQUE")) ? 1 : 0;
        const bDest = (b.selo && b.selo.includes("DESTAQUE")) ? 1 : 0;
        if (aDest !== bDest) return bDest - aDest;
        return b.timestamp - a.timestamp;
    });

    const dest = destCandidatos.slice(0, 20);
    grid.innerHTML = dest.length ? dest.map((o, i) => criarCardHTML(o, i)).join("") : `<div class="empty-state">Sem destaques no momento.</div>`;
    initLazyLoading();
}

const SINONIMOS = {
    "mae": ["presente", "perfume", "kit", "cozinha", "flor", "mimo"],
    "pai": ["ferramenta", "eletronico", "churrasco", "futebol", "carro"],
    "bebe": ["infantil", "crianca", "berco", "fralda", "brinquedo"],
    "celular": ["smartphone", "iphone", "android", "telefone", "mobile"],
    "fone": ["headphone", "earphone", "auricular", "bluetooth", "headset", "audio"],
    "tv": ["televisao", "televisor", "smart tv", "monitor"],
    "notebook": ["laptop", "computador", "pc", "ultrabook"],
    "roupa": ["camiseta", "calca", "vestido", "camisa", "blusa", "moletom"],
    "tenis": ["sapato", "calcado", "sandalia", "sapatilha", "sneaker"],
    "presente": ["kit", "conjunto", "gift", "mimo"],
    "cozinha": ["panela", "frigideira", "utensilio", "eletrodomestico", "airfryer"],
    "geladeira": ["refrigerador", "freezer"],
    "perfume": ["fragrancia", "colonia", "desodorante"],
    "jogo": ["game", "console", "playstation", "xbox", "nintendo"],
    "relogio": ["smartwatch", "watch", "pulso"],
    "bolsa": ["mochila", "carteira", "necessaire", "bag"],
    "brinquedo": ["boneca", "carrinho", "lego", "jogo", "infantil"],
    "academia": ["fitness", "treino", "musculacao", "haltere", "esteira"],
    "casa": ["decoracao", "organizador", "limpeza", "cama", "banho"],
};

function _normStr(s) {
    return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function _matchBusca(titulo, categoria, query) {
    if (!query) return true;
    const texto = _normStr(titulo + " " + categoria);
    const palavras = _normStr(query).split(/\s+/).filter(Boolean);
    return palavras.every(p => {
        if (texto.includes(p)) return true;
        const sins = SINONIMOS[p];
        return sins ? sins.some(s => texto.includes(s)) : false;
    });
}

function getFilteredOfertas() {
    const busca = (document.getElementById("buscaInput")?.value || "").trim();
    return aplicarOrdem(todasOfertas.filter(o => {
        return (lojaAtual === "todas" || o.loja === lojaAtual) &&
               _matchBusca(o.titulo, o.categoria, busca);
    }));
}

function renderOfertas(resetPage = true) {
    const grid = document.getElementById("ofertasGrid");
    const contagem = document.getElementById("contagem");
    if (!grid) return;
    if (resetPage) paginaAtual = 1;

    const filt = getFilteredOfertas();
    if (contagem) contagem.innerHTML = `<strong>${filt.length}</strong> ofertas ativas`;

    const ofertasPagina = filt.slice(0, paginaAtual * CONFIG.ITEMS_PER_PAGE);
    
    if (filt.length === 0) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>Poxa, não achamos nada!</h3><p>Tente buscar com outras palavras ou peça essa oferta para a nossa equipa.</p></div>`;
        document.getElementById("loadMoreTrigger").style.display = "none";
    } else {
        grid.innerHTML = ofertasPagina.map((o, i) => criarCardHTML(o, i)).join("");
        document.getElementById("loadMoreTrigger").style.display = (filt.length > ofertasPagina.length) ? "flex" : "none";
    }
    initLazyLoading();
}

const loadMoreObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && document.getElementById("page-ofertas").classList.contains("active")) {
        const filt = getFilteredOfertas();
        if (filt.length > paginaAtual * CONFIG.ITEMS_PER_PAGE) {
            paginaAtual++;
            renderOfertas(false);
        }
    }
});
document.addEventListener("DOMContentLoaded", () => {
    const trigger = document.getElementById("loadMoreTrigger");
    if(trigger) loadMoreObserver.observe(trigger);
});

function renderFavoritos() {
    const grid = document.getElementById("favoritosGrid");
    if (!grid) return;
    const favIds = getFavoritos();
    const favs = aplicarOrdem(todasOfertas.filter(o => favIds.includes(o.id)));
    grid.innerHTML = favs.length ? favs.map((o, i) => criarCardHTML(o, i)).join("") : `<div class="fav-empty"><div class="emoji">💔</div><h3>Sua lista está vazia</h3><p>Navegue pelas ofertas e clique no coração para salvar os melhores descontos aqui.</p></div>`;
    initLazyLoading();
}

function renderSocial() {
    document.getElementById("socialGrid").innerHTML = REDES.map(r => `<a class="social-card" href="${r.url}" target="_blank" aria-label="Siga-nos no ${r.nome}"><div class="social-icon" style="background:${r.bg};border-radius:12px;width:52px;height:52px;position:relative;display:block">${r.svg.replace('width="28"','').replace('height="28"','').replace('<svg ','<svg style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px" ')}</div><span>${r.nome}</span></a>`).join("");
    document.getElementById("footerSocials").innerHTML = REDES.map(r => `<a class="footer-social" href="${r.url}" target="_blank" aria-label="Siga-nos no ${r.nome}" style="background:${r.bg}">${r.svg}</a>`).join("");
}

function renderFormLojas() {
    const el = document.getElementById("formLojas");
    if (!el) return;
    el.innerHTML = Object.keys(LOJAS).filter(k => k !== "todas").map(k => `<button class="form-loja-btn" onclick="window.toggleFormLoja(this,'${k}','${LOJAS[k].cor}')" aria-label="Selecionar loja ${LOJAS[k].nome}">${LOJAS[k].emoji} ${LOJAS[k].nome}</button>`).join("");
}

function atualizarStats() {
    const total = todasOfertas.length;
    const media = total ? Math.round(todasOfertas.reduce((s, o) => s + o.desconto, 0) / total) : 0;
    
    const elTotal = document.getElementById("stat-total");
    if (elTotal) elTotal.textContent = total;
    
    const elTotal2 = document.getElementById("stat-total-2");
    if (elTotal2) elTotal2.textContent = total;
    
    const elDesc = document.getElementById("stat-desconto");
    if (elDesc) elDesc.textContent = media + "%";
    
    const elDesc2 = document.getElementById("stat-desconto-2");
    if (elDesc2) elDesc2.textContent = media + "%";

    const elDescHero = document.getElementById("stat-desconto-hero");
    if (elDescHero) elDescHero.textContent = media + "%";
}

function inicializarFiltros() {
    document.getElementById("lojasFilter").innerHTML = Object.entries(LOJAS).map(([id, l]) => `<button class="loja-btn ${id==='todas'?'active':''}" onclick="window.filtrarPorLoja('${id}',this)" style="${id==='todas'?`border-color:${l.cor};background:${l.cor}12;color:${l.cor}`:''}" aria-label="Filtrar por ${l.nome}">${l.emoji} ${l.nome}</button>`).join("");
}

function filtrarPorLoja(loja, btn) {
    lojaAtual = loja;
    document.querySelectorAll(".loja-btn").forEach(b => { b.classList.remove("active"); b.style.borderColor = "var(--border2)"; b.style.background = "var(--surface2)"; b.style.color = "var(--text2)"; });
    btn.classList.add("active");
    btn.style.borderColor = LOJAS[loja].cor; btn.style.background = LOJAS[loja].cor + "15"; btn.style.color = LOJAS[loja].cor;
    renderOfertas();
}

function ordenar(tipo, btn) {
    ordemAtual = tipo;
    document.querySelectorAll(".ord-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderOfertas();
}
function filtrarOfertas() { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => renderOfertas(), 300); }

function renderizarTudo() {
    renderDestaques();
    if(document.getElementById("page-ofertas").classList.contains("active")) renderOfertas();
    if(document.getElementById("page-favoritos").classList.contains("active")) renderFavoritos();
    atualizarStats();
    atualizarSchemaItemList();
    atualizarHeroMobileCard();
    renderBannerCarousel();
}

