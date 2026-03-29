// FUNÇÕES GLOBAIS DA APLICAÇÃO
// ==========================================

function initTema() {
    const theme = localStorage.getItem("cdf_theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("themeColor").setAttribute("content", theme === "dark" ? "#09101a" : "#f4f7fb");
}
function toggleTema() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cdf_theme", next);
    document.getElementById("themeColor").setAttribute("content", next === "dark" ? "#09101a" : "#f4f7fb");
}

const esc = (s) => String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const formatarMoeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function parsePreco(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const s = String(val).trim();
    if (s.includes(',')) {
        return parseFloat(s.replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;
    }
    return parseFloat(s.replace(/[R$\s]/g, '')) || 0;
}

function parseDataCustom(str) {
    if (!str) return NaN;
    const parts = str.split(/[\s/:]+/);
    if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const hr = parts[3] ? parseInt(parts[3], 10) : 0;
        const min = parts[4] ? parseInt(parts[4], 10) : 0;
        return new Date(y, m, d, hr, min).getTime();
    }
    return Date.parse(str);
}

function normalizarLoja(raw) {
    const v = raw.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const mapa = {
        amazon: ["amazon"], shopee: ["shopee"], magalu: ["magalu","magazineluiza","magazine","luiza"],
        mercadolivre: ["mercadolivre","meli","ml","mercado"], aliexpress: ["aliexpress","ali"],
        americanas: ["americanas"], casasbahia: ["casasbahia","casas","bahia"],
        submarino: ["submarino"], netshoes: ["netshoes"]
    };
    for (const [k, a] of Object.entries(mapa)) if (a.some(x => v.includes(x))) return k;
    return "outras";
}

const CACHE_KEY = "cdf_v2_cache";
function salvarCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {} }
function lerCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > CONFIG.REFRESH_INTERVAL) return null;
        return data;
    } catch { return null; }
}

function getFavoritos() { try { return JSON.parse(localStorage.getItem("cdf_favs") || "[]"); } catch { return []; } }
function salvarFavoritos(ids) { try { localStorage.setItem("cdf_favs", JSON.stringify(ids)); } catch {} }
function isFavorito(id) { return getFavoritos().includes(id); }

function toggleFavorito(id) {
    const favs = getFavoritos();
    const idx = favs.indexOf(id);
    if (idx === -1) {
        favs.push(id);
        mostrarToast("❤️", `Salvo nos favoritos!`);
        const oferta = todasOfertas.find(o => o.id === id);
        if (window.gamiAddFav) window.gamiAddFav(oferta?.desconto || 0);
    } else {
        favs.splice(idx, 1);
        mostrarToast("💔", `Removido!`);
        if (window.gamiRemoveFav) window.gamiRemoveFav();
    }
    salvarFavoritos(favs);
    if (navigator.vibrate) navigator.vibrate(idx === -1 ? [30, 20, 60] : [40]);
    document.querySelectorAll(`.btn-favorito[data-id="${id}"]`).forEach(btn => {
        btn.innerHTML = isFavorito(id) ? "❤️" : "🤍";
        btn.classList.toggle("ativo", isFavorito(id));
        btn.setAttribute("aria-label", isFavorito(id) ? "Remover dos favoritos" : "Adicionar aos favoritos");
    });
    if (document.getElementById("page-favoritos").classList.contains("active")) renderFavoritos();
}

function compartilharOferta(titulo, link) {
    if (navigator.share) {
        navigator.share({ title: 'O Caçador de Ofertas', text: `🔥 Olha essa promoção: ${titulo}`, url: link }).catch(console.error);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(`${titulo}\n${link}`)
            .then(() => { mostrarToast("🔗", "Link copiado!"); if (navigator.vibrate) navigator.vibrate(30); if (window.gamiAddShare) window.gamiAddShare(); })
            .catch(() => mostrarToast("⚠️", "Não foi possível copiar o link."));
    } else {
        const el = document.createElement('textarea');
        el.value = `${titulo}\n${link}`;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        try { document.execCommand('copy'); mostrarToast("🔗", "Link copiado!"); }
        catch { mostrarToast("⚠️", "Não foi possível copiar."); }
        document.body.removeChild(el);
    }
}

function mostrarToast(icon, msg) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${esc(msg)}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add("saindo"); setTimeout(() => toast.remove(), 350); }, 3000);
}

function initLazyLoading() {
    if (observerIntersection) observerIntersection.disconnect();
    observerIntersection = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.onload = () => img.style.opacity = 1;
                    img.removeAttribute('data-src');
                    obs.unobserve(img);
                }
            }
        });
    });
    document.querySelectorAll('.lazy-img').forEach(img => observerIntersection.observe(img));
}

function getSkeletonsHTML(qtd = 6) {
    return Array(qtd).fill().map(() => `
        <div class="oferta-card" style="border:none;box-shadow:none">
            <div class="skeleton" style="height:180px;width:100%;border-radius:18px 18px 0 0"></div>
            <div class="oferta-body" style="gap:10px">
                <div class="skeleton" style="height:12px;width:40%"></div>
                <div class="skeleton" style="height:36px;width:100%"></div>
                <div class="skeleton" style="height:24px;width:60%;margin-top:4px"></div>
                <div class="skeleton" style="height:40px;width:100%;border-radius:10px;margin-top:auto"></div>
            </div>
        </div>`).join("");
}

