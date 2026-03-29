// ==========================================
// GAMIFICAÇÃO — PONTOS, NÍVEIS E CONQUISTAS
// ==========================================

const NIVEIS = [
    { nome: "Iniciante",  emoji: "🥉", min: 0    },
    { nome: "Caçador",    emoji: "🥈", min: 100  },
    { nome: "Expert",     emoji: "🥇", min: 500  },
    { nome: "Mestre",     emoji: "💎", min: 1500 },
];

const CONQUISTAS = [
    { id: "first_fav",    emoji: "❤️",  nome: "Primeira Caçada",   desc: "Salvou sua 1ª oferta nos favoritos",   check: (s) => s.favs >= 1    },
    { id: "collector",    emoji: "📦",  nome: "Colecionador",       desc: "10 ofertas salvas nos favoritos",      check: (s) => s.favs >= 10   },
    { id: "sharer",       emoji: "📢",  nome: "Influencer",         desc: "Compartilhou 5 ofertas",               check: (s) => s.shares >= 5  },
    { id: "clicker",      emoji: "🎯",  nome: "Caçador Ativo",      desc: "Clicou em 20 ofertas",                 check: (s) => s.clicks >= 20 },
    { id: "streak3",      emoji: "🔥",  nome: "Dedicado",           desc: "3 dias seguidos visitando o site",     check: (s) => s.streak >= 3  },
    { id: "streak7",      emoji: "⚡",  nome: "Veterano",           desc: "7 dias seguidos visitando o site",     check: (s) => s.streak >= 7  },
    { id: "bigSaver",     emoji: "💰",  nome: "Poupador",           desc: "Encontrou oferta com 70%+ de desconto", check: (s) => s.maxDesc >= 70 },
];

function _loadGami() {
    try { return JSON.parse(localStorage.getItem("cdf_gami") || "{}"); } catch { return {}; }
}
function _saveGami(d) {
    try { localStorage.setItem("cdf_gami", JSON.stringify(d)); } catch {}
}

function _getStats() {
    const d = _loadGami();
    return {
        pts:     d.pts     || 0,
        favs:    d.favs    || 0,
        shares:  d.shares  || 0,
        clicks:  d.clicks  || 0,
        streak:  d.streak  || 0,
        maxDesc: d.maxDesc || 0,
        badges:  d.badges  || [],
        lastDay: d.lastDay || null,
    };
}

function _getNivel(pts) {
    let nivel = NIVEIS[0];
    for (const n of NIVEIS) { if (pts >= n.min) nivel = n; }
    return nivel;
}

function _updateStreak(stats) {
    const hoje = new Date().toDateString();
    if (stats.lastDay === hoje) return stats.streak;
    const ontem = new Date(Date.now() - 86400000).toDateString();
    const novoStreak = stats.lastDay === ontem ? stats.streak + 1 : 1;
    return novoStreak;
}

function _checkNovaConquista(statsAntes, statsDepois) {
    for (const c of CONQUISTAS) {
        if (statsAntes.badges.includes(c.id)) continue;
        if (c.check(statsDepois)) {
            statsDepois.badges.push(c.id);
            setTimeout(() => _mostrarConquista(c), 600);
        }
    }
}

function _mostrarConquista(c) {
    mostrarToast(c.emoji, `Conquista: ${c.nome}!`);
    if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 50]);
}

// ---- API PÚBLICA ----

window.gamiAddFav = function(desconto) {
    const antes = _getStats();
    const d = _loadGami();
    d.pts    = (d.pts || 0) + 10;
    d.favs   = (d.favs || 0) + 1;
    d.maxDesc = Math.max(d.maxDesc || 0, desconto || 0);
    _saveGami(d);
    const depois = _getStats();
    _checkNovaConquista(antes, depois);
    _atualizarHUDNivel(antes.pts, d.pts);
};

window.gamiRemoveFav = function() {
    const d = _loadGami();
    d.favs = Math.max((d.favs || 1) - 1, 0);
    _saveGami(d);
};

window.gamiAddShare = function() {
    const antes = _getStats();
    const d = _loadGami();
    d.pts    = (d.pts || 0) + 15;
    d.shares = (d.shares || 0) + 1;
    _saveGami(d);
    const depois = _getStats();
    _checkNovaConquista(antes, depois);
    _atualizarHUDNivel(antes.pts, d.pts);
};

window.gamiAddClick = function(desconto) {
    const antes = _getStats();
    const d = _loadGami();
    d.pts    = (d.pts || 0) + 5;
    d.clicks = (d.clicks || 0) + 1;
    d.maxDesc = Math.max(d.maxDesc || 0, desconto || 0);
    _saveGami(d);
    const depois = _getStats();
    _checkNovaConquista(antes, depois);
};

window.gamiDailyVisit = function() {
    const antes = _getStats();
    const hoje = new Date().toDateString();
    if (antes.lastDay === hoje) return;
    const d = _loadGami();
    d.streak  = _updateStreak(antes);
    d.lastDay = hoje;
    d.pts     = (d.pts || 0) + 20;
    _saveGami(d);
    const depois = _getStats();
    _checkNovaConquista(antes, depois);
};

window.gamiGetStats = _getStats;
window.gamiGetNivel = () => _getNivel(_getStats().pts);

// ---- HUD DE NÍVEL (badge no header) ----

function _atualizarHUDNivel(ptsAntes, ptsDepois) {
    const nivelAntes  = _getNivel(ptsAntes);
    const nivelDepois = _getNivel(ptsDepois);
    if (nivelAntes.min !== nivelDepois.min) {
        mostrarToast("🎉", `Subiu para ${nivelDepois.emoji} ${nivelDepois.nome}!`);
        if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
    }
    _renderHUD();
}

function _renderHUD() {
    const el = document.getElementById("gamiHUD");
    if (!el) return;
    const s = _getStats();
    const n = _getNivel(s.pts);
    const prox = NIVEIS.find(lv => lv.min > s.pts);
    const pct = prox ? Math.min(100, Math.round(((s.pts - n.min) / (prox.min - n.min)) * 100)) : 100;
    el.innerHTML = `
        <span class="gami-nivel-emoji" title="${n.nome} — ${s.pts} pts">${n.emoji}</span>
        <div class="gami-bar-wrap" title="${s.pts} pts${prox ? ` / ${prox.min} para ${prox.nome}` : ' — Nível máximo'}">
            <div class="gami-bar" style="width:${pct}%"></div>
        </div>`;
}

window.gamiRenderPerfil = function() {
    const el = document.getElementById("gamiPerfil");
    if (!el) return;
    const s = _getStats();
    const n = _getNivel(s.pts);
    const prox = NIVEIS.find(lv => lv.min > s.pts);
    const conquistadas = CONQUISTAS.filter(c => s.badges.includes(c.id));
    const bloqueadas   = CONQUISTAS.filter(c => !s.badges.includes(c.id));
    el.innerHTML = `
        <div class="gami-perfil-topo">
            <div class="gami-nivel-grande">${n.emoji}</div>
            <div>
                <div class="gami-nivel-nome">${n.nome}</div>
                <div class="gami-pts">${s.pts} pontos${prox ? ` · faltam ${prox.min - s.pts} para ${prox.emoji} ${prox.nome}` : " · Nível máximo!"}</div>
                <div class="gami-streak">${s.streak >= 2 ? `🔥 ${s.streak} dias seguidos` : ""}</div>
            </div>
        </div>
        <div class="gami-stats-row">
            <div class="gami-stat"><strong>${s.favs}</strong><span>favoritos</span></div>
            <div class="gami-stat"><strong>${s.shares}</strong><span>compartilhados</span></div>
            <div class="gami-stat"><strong>${s.clicks}</strong><span>cliques</span></div>
        </div>
        ${conquistadas.length ? `
        <div class="gami-section-title">Conquistas desbloqueadas</div>
        <div class="gami-badges">${conquistadas.map(c => `
            <div class="gami-badge desbloqueado" title="${c.desc}">
                <span>${c.emoji}</span><small>${c.nome}</small>
            </div>`).join("")}
        </div>` : ""}
        ${bloqueadas.length ? `
        <div class="gami-section-title">Conquistas bloqueadas</div>
        <div class="gami-badges">${bloqueadas.map(c => `
            <div class="gami-badge bloqueado" title="${c.desc}">
                <span>🔒</span><small>${c.nome}</small>
            </div>`).join("")}
        </div>` : ""}`;
};

// Inicializa HUD e streak diário
document.addEventListener("DOMContentLoaded", () => {
    window.gamiDailyVisit();
    _renderHUD();
});
