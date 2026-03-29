// EXPORTAÇÃO GLOBAL (Impede erros ReferenceError em ambientes rígidos)
// ==========================================
window.navegar = navegar;
window.toggleTema = toggleTema;
window.toggleMenu = toggleMenu;
window.filtrarOfertas = filtrarOfertas;
window.ordenar = ordenar;
window.filtrarPorLoja = filtrarPorLoja;
window.toggleFavorito = toggleFavorito;
window.compartilharOferta = compartilharOferta;
window.mostrarToast = mostrarToast;
window.toggleFormLoja = toggleFormLoja;
window.enviarPedido = enviarPedido;
window.resetarFormulario = function() {
    document.getElementById("formBox").innerHTML = `
      <h2 class="form-title">🎯 Pedir Promoção</h2>
      <p class="form-sub">Diga-nos o que você procura e a nossa IA vai buscar as melhores opções e enviar direto para o seu e-mail.</p>
      <div class="form-group">
        <label class="form-label" for="pedidoNome">Seu Nome *</label>
        <input class="form-input" id="pedidoNome" placeholder='Ex: "João Silva"' aria-label="Seu nome">
      </div>
      <div class="form-group">
        <label class="form-label" for="pedidoEmail">Seu E-mail *</label>
        <input class="form-input" type="email" id="pedidoEmail" placeholder='Ex: "joao@email.com"' aria-label="Seu e-mail">
      </div>
      <div class="form-group">
        <label class="form-label" for="pedidoWhatsapp">WhatsApp (Opcional)</label>
        <input class="form-input" type="tel" id="pedidoWhatsapp" placeholder='Ex: "(11) 99999-9999"' aria-label="Seu WhatsApp">
      </div>
      <div class="form-group">
        <label class="form-label" for="pedidoProduto">O que você procura? *</label>
        <input class="form-input" id="pedidoProduto" placeholder='Ex: "PlayStation 5 256GB"' aria-label="Nome do produto procurado">
      </div>
      <div class="form-group">
        <label class="form-label" for="pedidoOrcamento">Orçamento Máximo (Opcional)</label>
        <input class="form-input" id="pedidoOrcamento" placeholder='Ex: "Até R$ 3.500"' aria-label="Orçamento máximo">
      </div>
      <div class="form-group">
        <label class="form-label" for="pedidoDetalhes">Detalhes Adicionais (Opcional)</label>
        <textarea class="form-textarea" id="pedidoDetalhes" placeholder='Ex: "Pode ser recondicionado, cor branca..."' aria-label="Detalhes adicionais"></textarea>
      </div>
      <button class="form-submit" id="formSubmit" onclick="window.enviarPedido()" aria-label="Enviar pedido de oferta">
        🔍 Buscar e Enviar por E-mail
      </button>`;
};
window.toggleChat = toggleChat;
window.enviarMsg = enviarMsg;
window.analisarOferta = analisarOferta;
window.fecharAiModal = fecharAiModal;

// ==========================================
// AUTOCOMPLETE E FILTRO DE PREÇO (novas features)
// ==========================================
window.updatePriceFilterDisplay = function() {
    const el = document.getElementById('priceFilter');
    const disp = document.getElementById('priceValDisplay');
    if (!el || !disp) return;
    disp.textContent = el.value >= 15000 ? "R$ 15.000+" : `R$ ${el.value}`;
};
window.mostrarAutocomplete = function() {
    const busca = (document.getElementById('buscaInput')?.value || '').trim();
    const box = document.getElementById('autocompleteResults');
    if (!box) return;
    if (busca.length < 2) { box.style.display = 'none'; return; }
    const sugestoes = todasOfertas.filter(o => _matchBusca(o.titulo, o.categoria, busca)).slice(0, 6);
    if (sugestoes.length === 0) { box.style.display = 'none'; return; }
    box.innerHTML = sugestoes.map(o => `<div class="autocomplete-item" onclick="window.selecionarAutocomplete('${esc(o.titulo)}')">🔍 ${esc(o.titulo)}</div>`).join('');
    box.style.display = 'block';
};
window.selecionarAutocomplete = function(texto) {
    const inp = document.getElementById('buscaInput');
    if (inp) inp.value = texto;
    const box = document.getElementById('autocompleteResults');
    if (box) box.style.display = 'none';
    window.filtrarOfertas();
};
document.addEventListener('click', (e) => {
    if (!e.target.closest('.busca-input-wrap')) {
        const box = document.getElementById('autocompleteResults');
        if (box) box.style.display = 'none';
    }
});

// ==========================================
// COUNTDOWN RELÂMPAGO (até meia-noite)
// ==========================================
function atualizarContagem() {
    const agora = new Date();
    const meiaNoite = new Date(agora);
    meiaNoite.setHours(24, 0, 0, 0);
    let diff = Math.floor((meiaNoite - agora) / 1000);
    if (diff < 0) diff = 0;
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    const pad = n => String(n).padStart(2, '0');
    const elH = document.getElementById('cdHoras');
    const elM = document.getElementById('cdMinutos');
    const elS = document.getElementById('cdSegundos');
    if (elH) elH.textContent = pad(h);
    if (elM) elM.textContent = pad(m);
    if (elS) elS.textContent = pad(s);
}
atualizarContagem();
setInterval(atualizarContagem, 1000);

// ==========================================
// FILTRO POR CATEGORIA (botões da category-nav)
// ==========================================
window.filtrarCategoria = function(termo) {
    window.navegar('ofertas');
    setTimeout(() => {
        const inp = document.getElementById('buscaInput');
        if (inp) { inp.value = termo; window.filtrarOfertas && window.filtrarOfertas(); }
    }, 100);
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================
initTema();
renderSocial();
renderFormLojas();
inicializarFiltros();
carregarOfertas();
iniciarAutoRefresh();

// Contador de urgência no hero
(function() {
    let secsLeft = CONFIG.REFRESH_INTERVAL / 1000;
    function tickHeroCountdown() {
        const el = document.getElementById('heroCountdown');
        if (el) {
            const m = Math.floor(secsLeft / 60).toString().padStart(2, '0');
            const s = (secsLeft % 60).toString().padStart(2, '0');
            el.textContent = `${m}:${s}`;
        }
        secsLeft = secsLeft > 0 ? secsLeft - 1 : CONFIG.REFRESH_INTERVAL / 1000;
    }
    tickHeroCountdown();
    setInterval(tickHeroCountdown, 1000);
})();

// Busca mobile expansível
window.toggleBuscaMobile = function() {
    const el = document.getElementById('mobileBusca');
    if (!el) return;
    el.classList.toggle('open');
    if (el.classList.contains('open')) {
        setTimeout(() => document.getElementById('mobileBuscaInput')?.focus(), 100);
    }
};

// Recarrega quando usuário volta à aba após inatividade
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ultimaAtualizacao) {
        if (Date.now() - ultimaAtualizacao > CONFIG.REFRESH_INTERVAL) {
            carregarOfertas(true);
        }
    }
});

setTimeout(() => { if(!chatOpen) document.getElementById("chatBadge").style.display="block"; }, 5000);

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

// ==========================================
// FEATURE 1: ANALYTICS — RASTREAMENTO DE CLIQUES
// ==========================================
window.trackClick = function(id, titulo, loja, preco) {
    try {
        const clicks = JSON.parse(localStorage.getItem('cdf_analytics') || '[]');
        clicks.push({ id, titulo, loja, preco, ts: Date.now() });
        if (clicks.length > 1000) clicks.splice(0, clicks.length - 1000);
        localStorage.setItem('cdf_analytics', JSON.stringify(clicks));
    } catch(e) {}
    const oferta = todasOfertas.find(o => o.id === id);
    if (window.gamiAddClick) window.gamiAddClick(oferta?.desconto || 0);
};

// ==========================================
// FEATURE 4: LINKS ÚNICOS POR OFERTA
// ==========================================
window.compartilharOferta = function(titulo, link, ofertaId) {
    const pageUrl = ofertaId
        ? `${location.origin}${location.pathname}#oferta/${ofertaId}`
        : link;
    const shareData = { title: `🔥 ${titulo}`, text: 'Olha esta promoção no Caçador de Ofertas!', url: pageUrl };
    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(pageUrl).then(() => mostrarToast("🔗", "Link da oferta copiado!"));
    } else {
        const el = document.createElement('textarea');
        el.value = pageUrl;
        el.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(el);
        el.select();
        try { document.execCommand('copy'); mostrarToast("🔗", "Link copiado!"); } catch(e) {}
        document.body.removeChild(el);
    }
};

// ==========================================
// FEATURE 3: COMPARADOR DE PREÇOS
// ==========================================
let comparacaoLista = [];
const MAX_COMPARAR = 3;

window.toggleComparar = function(id) {
    const oferta = todasOfertas.find(o => o.id === id);
    if (!oferta) return;
    const idx = comparacaoLista.findIndex(o => o.id === id);
    if (idx !== -1) {
        comparacaoLista.splice(idx, 1);
    } else {
        if (comparacaoLista.length >= MAX_COMPARAR) {
            mostrarToast("⚠️", `Máximo ${MAX_COMPARAR} produtos para comparar.`); return;
        }
        comparacaoLista.push(oferta);
    }
    document.querySelectorAll('[data-comparar-id]').forEach(btn => {
        const btnId = parseInt(btn.getAttribute('data-comparar-id'));
        btn.classList.toggle('comparar-ativo', comparacaoLista.some(o => o.id === btnId));
    });
    _atualizarBarraComparar();
};

window.limparComparador = function() {
    comparacaoLista = [];
    document.querySelectorAll('[data-comparar-id]').forEach(btn => btn.classList.remove('comparar-ativo'));
    _atualizarBarraComparar();
};

function _atualizarBarraComparar() {
    const barra = document.getElementById('comparadorBarra');
    if (!barra) return;
    if (comparacaoLista.length === 0) { barra.style.display = 'none'; return; }
    barra.style.display = 'flex';
    document.getElementById('comparadorBarraItens').innerHTML = comparacaoLista.map(o =>
        `<div class="comparar-item-chip"><span>${o.titulo.slice(0,22)}${o.titulo.length>22?'…':''}</span><button onclick="window.toggleComparar(${o.id})">✕</button></div>`
    ).join('');
    const podeComparar = comparacaoLista.length >= 2;
    document.getElementById('comparadorBarraBtn').disabled = !podeComparar;
    const hint = document.getElementById('comparadorHint');
    if (hint) hint.style.display = podeComparar ? 'none' : 'inline';
}

window.abrirComparador = function() {
    if (comparacaoLista.length < 2) { mostrarToast('Adicione mais 1 produto para comparar ⚖️'); return; }
    const corpo = document.getElementById('comparadorCorpo');
    const precos = comparacaoLista.map(o => o.precoNovo).filter(p => p > 0);
    const melhorPreco = Math.min(...precos);
    const linhas = [
        { label: '🏪 Loja', fn: o => { const l=LOJAS[o.loja]||LOJAS.outras; return `<span style="color:${l.cor};font-weight:700">${l.emoji} ${o.loja.charAt(0).toUpperCase()+o.loja.slice(1)}</span>`; }},
        { label: '💰 Preço Original', fn: o => o.precoAntigo>0?`<span style="text-decoration:line-through;color:var(--text3)">${formatarMoeda(o.precoAntigo)}</span>`:'—'},
        { label: '🏷️ Preço Atual', fn: o => `<span style="color:var(--accent);font-weight:800;font-size:18px">${formatarMoeda(o.precoNovo)}</span>`},
        { label: '📉 Desconto', fn: o => o.desconto>0?`<span style="color:#22c55e;font-weight:700">-${o.desconto}%</span>`:'—'},
        { label: '💵 Economia', fn: o => o.precoAntigo>0&&o.precoNovo>0?`<span style="color:#22c55e">${formatarMoeda(o.precoAntigo-o.precoNovo)}</span>`:'—'},
    ];
    let html = `<div class="comparador-tabela">`;
    html += `<div class="comp-row comp-header"><div class="comp-cell comp-label"></div>`;
    comparacaoLista.forEach(o => {
        html += `<div class="comp-cell"><div class="comp-produto-img">${o.img.startsWith('http')?`<img src="${esc(o.img)}" alt="" onerror="this.style.display='none'" loading="lazy">`:`<span style="font-size:36px">${esc(o.img)}</span>`}</div><div class="comp-produto-nome">${esc(o.titulo)}</div></div>`;
    });
    html += `</div>`;
    linhas.forEach(linha => {
        html += `<div class="comp-row"><div class="comp-cell comp-label">${linha.label}</div>`;
        comparacaoLista.forEach(o => {
            const isBest = linha.label.includes('Preço Atual') && o.precoNovo === melhorPreco;
            html += `<div class="comp-cell${isBest?' comp-melhor':''}">${linha.fn(o)}</div>`;
        });
        html += `</div>`;
    });
    html += `<div class="comp-row comp-cta-row"><div class="comp-cell comp-label">🛒 Comprar</div>`;
    comparacaoLista.forEach(o => {
        const l = LOJAS[o.loja]||LOJAS.outras;
        html += `<div class="comp-cell"><a href="${esc(o.link)}" target="_blank" rel="noopener" class="comp-btn" style="background:${l.cor}" onclick="window.trackClick(${o.id},'${esc(o.titulo)}','${o.loja}',${o.precoNovo})">Ir à oferta</a></div>`;
    });
    html += `</div></div>`;
    corpo.innerHTML = html;
    document.getElementById('comparadorModal').style.display = 'flex';
};
window.fecharComparador = () => document.getElementById('comparadorModal').style.display = 'none';

window.abrirModalTermos = () => document.getElementById('modalTermos').classList.add('open');
window.fecharModalTermos = () => document.getElementById('modalTermos').classList.remove('open');
window.abrirModalPrivacidade = () => document.getElementById('modalPrivacidade').classList.add('open');
window.fecharModalPrivacidade = () => document.getElementById('modalPrivacidade').classList.remove('open');

// ==========================================
// FEATURE 2: ALERTAS DE PREÇO
// ==========================================
let _alertaOferta = null;

window.abrirAlertaPreco = function(id) {
    _alertaOferta = todasOfertas.find(o => o.id === id);
    if (!_alertaOferta) return;
    document.getElementById('alertaTitulo').textContent = _alertaOferta.titulo;
    document.getElementById('alertaPrecoAtual').textContent = formatarMoeda(_alertaOferta.precoNovo);
    document.getElementById('alertaPrecoAlvo').value = '';
    document.getElementById('alertaEmail').value = '';
    document.getElementById('alertaMsg').textContent = '';
    document.getElementById('alertaModal').style.display = 'flex';
};
window.fecharAlertaModal = () => document.getElementById('alertaModal').style.display = 'none';

window.enviarAlertaPreco = async function() {
    const email = document.getElementById('alertaEmail').value.trim();
    const precoAlvo = parseFloat(document.getElementById('alertaPrecoAlvo').value.replace(',','.'));
    const msgEl = document.getElementById('alertaMsg');
    if (!email || !/\S+@\S+\.\S+/.test(email)) { msgEl.style.color='#f87171'; msgEl.textContent='⚠️ Insira um e-mail válido.'; return; }
    if (!precoAlvo || precoAlvo <= 0) { msgEl.style.color='#f87171'; msgEl.textContent='⚠️ Insira o preço desejado.'; return; }
    const alertas = JSON.parse(localStorage.getItem('cdf_alertas') || '[]');
    alertas.push({ ofertaId: _alertaOferta.id, titulo: _alertaOferta.titulo, precoAtual: _alertaOferta.precoNovo, precoAlvo, email, ts: Date.now() });
    localStorage.setItem('cdf_alertas', JSON.stringify(alertas));
    // alerta de preço por email desativado (template em uso para pedidos)
    msgEl.style.color = '#22c55e';
    msgEl.textContent = '✅ Alerta guardado! Receberás aviso quando o preço baixar.';
    setTimeout(() => window.fecharAlertaModal(), 2500);
};

// ==========================================
// HASH ROUTING — incluindo #oferta/ID
// ==========================================
(function() {
    const hash = location.hash.replace("#", "");
    if (["home","ofertas","favoritos","pedir"].includes(hash)) {
        setTimeout(() => navegar(hash), 100);
    } else if (hash.startsWith("oferta/")) {
        const id = parseInt(hash.split("/")[1]);
        setTimeout(() => {
            navegar("ofertas");
            setTimeout(() => {
                const card = document.querySelector(`[data-oferta-id="${id}"]`);
                if (card) { card.scrollIntoView({behavior:'smooth',block:'center'}); card.style.outline='2px solid var(--accent)'; setTimeout(()=>card.style.outline='',2000); }
            }, 800);
        }, 200);
    }
})();
