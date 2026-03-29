// ══ BANNER CAROUSEL ══
let _carIdx = 0, _carTimer = null, _carTotal = 0, _carStartX = 0;

function renderBannerCarousel() {
    const track = document.getElementById('carouselTrack');
    const dotsEl = document.getElementById('carouselDots');
    if (!track || !dotsEl) return;

    // Uma oferta por loja (variedade) — evita repetir o mesmo produto dos destaques
    const byStore = {};
    todasOfertas
        .filter(o => o.desconto >= 15 && o.precoNovo > 0 && o.img && o.img.startsWith('http'))
        .sort((a, b) => b.desconto - a.desconto)
        .forEach(o => { if (!byStore[o.loja]) byStore[o.loja] = o; });
    const slides = Object.values(byStore).slice(0, 6);

    if (!slides.length) { document.getElementById('bannerCarousel').style.display = 'none'; return; }
    document.getElementById('bannerCarousel').style.display = 'block';
    _carTotal = slides.length;
    _carIdx = 0;

    const formatR = v => 'R$ ' + v.toFixed(2).replace('.', ',');

    track.innerHTML = slides.map(o => {
        const loja = LOJAS[o.loja] || LOJAS.outras;
        const bg = `linear-gradient(120deg, ${loja.cor}dd 0%, ${loja.cor}88 60%, ${loja.cor}44 100%)`;
        return `
        <a class="carousel-slide" href="${esc(o.link)}" target="_blank" rel="noopener"
           style="background:${bg}"
           onclick="window.trackClick(${o.id},'${esc(o.titulo)}','${o.loja}',${o.precoNovo})">
          <div class="carousel-slide-left">
            <div class="carousel-slide-badge">${loja.emoji} ${loja.nome} &nbsp;•&nbsp; -${o.desconto}% OFF</div>
            <div class="carousel-slide-title">${esc(o.titulo)}</div>
            <div class="carousel-slide-prices">
              ${o.precoAntigo > 0 ? `<span class="carousel-slide-old">${formatR(o.precoAntigo)}</span>` : ''}
              <span class="carousel-slide-new">${formatR(o.precoNovo)}</span>
            </div>
            <span class="carousel-slide-btn">Ver Oferta →</span>
          </div>
          <div class="carousel-slide-right">
            <img src="${esc(o.img)}" alt="${esc(o.titulo)}" loading="lazy"
                 onerror="this.parentElement.style.display='none'">
          </div>
        </a>`;
    }).join('');

    dotsEl.innerHTML = slides.map((_, i) =>
        `<button class="carousel-dot ${i===0?'ativo':''}" onclick="window.carouselGo(${i})" aria-label="Slide ${i+1}"></button>`
    ).join('');

    _iniciarCarouselAuto();
    _carouselSwipe();
}

function _moverCarousel() {
    const track = document.getElementById('carouselTrack');
    if (track) track.style.transform = `translateX(-${_carIdx * 100}%)`;
    document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('ativo', i === _carIdx));
}

window.carouselGo = function(idx) {
    _carIdx = idx;
    _moverCarousel();
    _reiniciarCarouselTimer();
};

window.carouselMove = function(dir) {
    _carIdx = (_carIdx + dir + _carTotal) % _carTotal;
    _moverCarousel();
    _reiniciarCarouselTimer();
};

function _iniciarCarouselAuto() {
    if (_carTimer) clearInterval(_carTimer);
    _carTimer = setInterval(() => {
        _carIdx = (_carIdx + 1) % _carTotal;
        _moverCarousel();
    }, 4500);
}

function _reiniciarCarouselTimer() {
    if (_carTimer) clearInterval(_carTimer);
    _iniciarCarouselAuto();
}

function _carouselSwipe() {
    const el = document.getElementById('bannerCarousel');
    if (!el) return;
    el.addEventListener('touchstart', e => { _carStartX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
        const diff = _carStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) window.carouselMove(diff > 0 ? 1 : -1);
    }, { passive: true });
}

function atualizarHeroMobileCard() {
    const card = document.getElementById('heroMobileCard');
    if (!card || window.innerWidth > 768) return;
    const top = todasOfertas.filter(o => o.desconto >= 10 && o.precoNovo > 0)
        .sort((a, b) => b.desconto - a.desconto)[0];
    if (!top) return;
    document.getElementById('heroMobileCardNome').textContent = top.titulo.slice(0, 60) + (top.titulo.length > 60 ? '…' : '');
    document.getElementById('heroMobileCardPreco').textContent = `R$ ${top.precoNovo.toFixed(2).replace('.', ',')}`;
    const oldEl = document.getElementById('heroMobileCardOld');
    if (top.precoAntigo > 0) oldEl.textContent = `De R$ ${top.precoAntigo.toFixed(2).replace('.', ',')}`;
    document.getElementById('heroMobileCardBtn').href = top.link;
}

function atualizarSchemaItemList() {
    const top = todasOfertas.slice(0, 20);
    if (!top.length) return;
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Melhores Ofertas do Dia",
        "url": "https://ocacadordeofertas.vercel.app/",
        "numberOfItems": top.length,
        "itemListElement": top.map((o, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "item": {
                "@type": "Product",
                "name": o.titulo,
                "offers": {
                    "@type": "Offer",
                    "price": o.precoNovo.toFixed(2),
                    "priceCurrency": "BRL",
                    "availability": "https://schema.org/InStock",
                    "url": o.link
                }
            }
        }))
    };
    let el = document.getElementById("schema-itemlist");
    if (!el) {
        el = document.createElement("script");
        el.type = "application/ld+json";
        el.id = "schema-itemlist";
        document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
}

function navegar(pagina) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById("page-" + pagina)?.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(`.nav-btn[data-page="${pagina}"]`).forEach(b => b.classList.add("active"));
    document.getElementById("mobileMenu").classList.remove("open");
    window.scrollTo(0, 0);
    history.pushState({ pagina }, "", `#${pagina}`);
    if (pagina === "ofertas") { if(!document.getElementById("lojasFilter").innerHTML) inicializarFiltros(); renderOfertas(); }
    else if (pagina === "favoritos") { renderFavoritos(); if (window.gamiRenderPerfil) window.gamiRenderPerfil(); }
}

window.addEventListener("popstate", (e) => {
    const pg = (e.state && e.state.pagina) || location.hash.replace("#", "") || "home";
    navegar(pg);
});

window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 20);
    document.getElementById("btnScrollTop").style.display = window.scrollY > 500 ? "flex" : "none";
    const fab = document.getElementById("fabBusca");
    if(window.scrollY > 300 && !document.getElementById("page-ofertas").classList.contains("active")) {
        fab.style.opacity = 1; fab.style.pointerEvents = "all";
    } else {
        fab.style.opacity = 0; fab.style.pointerEvents = "none";
    }
});

function toggleMenu() { document.getElementById("mobileMenu").classList.toggle("open"); }

function toggleFormLoja(btn, loja, cor) {
    if (formLojaSelecionada === loja) {
        formLojaSelecionada = "";
        btn.style.borderColor = "var(--border2)"; btn.style.background = "var(--surface2)"; btn.style.color = "var(--text3)";
    } else {
        document.querySelectorAll(".form-loja-btn").forEach(b => { b.style.borderColor = "var(--border2)"; b.style.background = "var(--surface2)"; b.style.color = "var(--text3)"; });
        formLojaSelecionada = loja;
        btn.style.borderColor = cor; btn.style.background = cor + "15"; btn.style.color = cor;
    }
}

async function enviarPedido() {
    const nome    = document.getElementById("pedidoNome").value.trim();
    const email   = document.getElementById("pedidoEmail").value.trim();
    const produto = document.getElementById("pedidoProduto").value.trim();
    if (!nome)    { mostrarToast("⚠️", "Informe o seu nome."); return; }
    if (!email || !/\S+@\S+\.\S+/.test(email)) { mostrarToast("⚠️", "Informe um e-mail válido."); return; }
    if (!produto) { mostrarToast("⚠️", "Escreva o nome do produto."); return; }

    const orcamento = document.getElementById("pedidoOrcamento").value || "";
    const whatsapp  = document.getElementById("pedidoWhatsapp").value || "";
    const detalhes  = document.getElementById("pedidoDetalhes").value || "";

    const btn = document.getElementById("formSubmit");
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span class="loader-spinner" style="width:16px;height:16px;border-width:2px"></span> A IA está buscando a melhor oferta...</span>';

    try {
        // 1. Busca Shopee: retorna {filtrados, melhorLink}
        // melhorLink = offerLink do produto mais caro (maior preço = produto principal, não acessório)
        // O offerLink da API já tem rastreio de afiliado embutido (gerado pelo SHOPEE_APP_ID)
        async function buscarShopeeForm(termo) {
            try {
                const res = await fetch('/api/shopee?q=' + encodeURIComponent(termo));
                if (!res.ok) return { filtrados: [], melhorLink: null };
                const raw = await res.json();
                if (!Array.isArray(raw) || !raw.length) return { filtrados: [], melhorLink: null };
                // Melhor link = produto mais caro dos resultados brutos (afiliado garantido)
                const ordenado = [...raw].sort((a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0));
                const melhorLink = ordenado[0].offerLink || null;
                return { filtrados: filtrarAntiAcessorios(raw, termo), melhorLink };
            } catch(_) { return { filtrados: [], melhorLink: null }; }
        }

        // Cascata: termo completo → primeiras 2 palavras
        let busca = await buscarShopeeForm(produto);
        if (!busca.filtrados.length) {
            const termoCurto = produto.split(' ').slice(0, 2).join(' ');
            if (termoCurto !== produto) {
                const busca2 = await buscarShopeeForm(termoCurto);
                if (busca2.filtrados.length || busca2.melhorLink) busca = busca2;
            }
        }

        let dadosEmail;
        if (busca.filtrados.length) {
            // Produto real encontrado na Shopee com filtro
            const melhor = busca.filtrados[0];
            dadosEmail = {
                produto_nome: melhor.offerName || produto,
                preco_antigo: melhor.price ? formatarMoeda(melhor.price) : "—",
                preco_novo:   melhor.discountPrice ? formatarMoeda(melhor.discountPrice) : (melhor.price ? formatarMoeda(melhor.price) : "—"),
                link_produto: melhor.offerLink
            };
        } else {
            // Sem produto no filtro: Gemini formata nome+preço, link usa offerLink afiliado (se houver)
            try {
                const promptFallback = `Você é especialista em compras no Brasil. Formate o nome do produto e estime o preço atual no mercado brasileiro.

Produto digitado pelo cliente: "${produto}"${orcamento ? `\nOrçamento: ${orcamento}` : ''}

Responda APENAS com JSON válido, sem texto extra:
{"produto_nome":"nome oficial completo com modelo","preco_antigo":"R$ X.XXX,XX","preco_novo":"R$ X.XXX,XX"}

Regras:
- produto_nome: nome oficial com marca, modelo e especificação principal (ex: "Samsung Galaxy S23 128GB")
- preco_antigo: preço de lançamento ou tabela no Brasil
- preco_novo: melhor preço atual estimado no mercado brasileiro`;
                const rawGemini = await chamarGemini(promptFallback, "Responda APENAS com JSON válido.");
                const match = rawGemini.match(/\{[\s\S]*?\}/);
                const dados = match ? JSON.parse(match[0]) : {};
                dadosEmail = {
                    produto_nome: dados.produto_nome || produto,
                    preco_antigo: dados.preco_antigo || "—",
                    preco_novo:   dados.preco_novo   || "—",
                    // Prioridade: offerLink afiliado da API > search URL sem rastreio
                    link_produto: busca.melhorLink || `https://shopee.com.br/search?keyword=${encodeURIComponent(dados.produto_nome || produto)}`
                };
            } catch(_) {
                dadosEmail = {
                    produto_nome: produto,
                    preco_antigo: "—",
                    preco_novo:   "—",
                    link_produto: busca.melhorLink || `https://shopee.com.br/search?keyword=${encodeURIComponent(produto)}`
                };
            }
        }

        // 2. Notifica o admin
        await emailjs.send("service_v94cf8p", "template_6l0zsew", {
            produto,
            orcamento: orcamento || "Não informado",
            loja: whatsapp ? `WhatsApp: ${whatsapp}` : "Não informado",
            detalhes: `Email: ${email}\n${detalhes || "Sem detalhes adicionais"}`
        });

        // 3. Envia email com oferta real da Shopee (link com comissão de afiliado)
        await emailjs.send("service_v94cf8p", CONFIG.EMAILJS_TEMPLATE_RESPOSTA, {
            to_email: email,
            produto_nome: dadosEmail.produto_nome,
            preco_antigo: dadosEmail.preco_antigo,
            preco_novo:   dadosEmail.preco_novo,
            link_produto: dadosEmail.link_produto
        });

        // 4. Tela de agradecimento
        document.getElementById("formBox").innerHTML = `
        <div class="form-success fade-up">
          <div class="form-success-icon">✓</div>
          <h3 style="font-family:'Plus Jakarta Sans','DM Sans',sans-serif;font-size:24px;font-weight:800;color:var(--text);margin-bottom:8px">Pronto, ${nome.split(' ')[0]}!</h3>
          <p style="color:var(--text2);margin-bottom:8px">Buscamos na Shopee e enviamos a melhor oferta de <strong>${produto}</strong> para <strong>${email}</strong>. Verifique a sua caixa de entrada (e a pasta spam).</p>
          <p style="color:var(--text2);margin-bottom:24px">Entre no nosso grupo e fique por dentro de todas as promoções em tempo real — todos os dias!</p>
          <a href="${CONFIG.TELEGRAM}" target="_blank" class="btn-primary" style="text-decoration:none;display:inline-block;margin-bottom:12px">🔥 Entrar no Grupo de Ofertas</a>
          <br>
          <button onclick="window.resetarFormulario()" style="background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer;margin-top:8px">Fazer outro pedido</button>
        </div>`;
    } catch(e) {
        btn.disabled = false;
        btn.textContent = "🔍 Buscar e Enviar por E-mail";
        mostrarToast("❌", "Erro ao processar. Tente novamente.");
    }
}

// ==========================================
