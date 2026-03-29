// ==========================================
// CONFIGURAÇÕES GERAIS DA API & DADOS
// ==========================================
const GEMINI_PROXY_URL = "/api/gemini";

const CONFIG = {
    SHEET_ID: "1Ug9wQKO9HfCRrTsjZz8gDe7dCVDxXH2ehMC3nGkb6Xw",
    SHEET_TAB: "Página1",
    TELEGRAM: "https://t.me/ocacadordeoferta",
    INSTAGRAM: "https://www.instagram.com/ocacadorde_ofertas",
    TIKTOK: "https://www.tiktok.com/@o.cacador.de.oferta",
    FACEBOOK: "https://www.facebook.com/share/18X4uDszrG/",
    TWITTER: "https://x.com/ocacadordeoferta",
    REFRESH_INTERVAL: 30 * 60 * 1000, // Atualiza a cada 30 minutos
    HORAS_NOVO: 24,
    DIAS_EXPIRACAO: 7, // Deleta ofertas do site após 1 semana
    ITEMS_PER_PAGE: 20,
    EMAILJS_TEMPLATE_RESPOSTA: "template_ihnjh4j"
};

const LOJAS = {
    todas:         { nome: "Todas",           emoji: "🔥", cor: "#ff4d00" },
    amazon:        { nome: "Amazon",          emoji: "📦", cor: "#FF9900" },
    shopee:        { nome: "Shopee",          emoji: "🧡", cor: "#EE4D2D" },
    magalu:        { nome: "Magalu",          emoji: "💙", cor: "#0086FF" },
    mercadolivre:  { nome: "Mercado Livre",   emoji: "🟡", cor: "#FFE600" },
    aliexpress:    { nome: "AliExpress",      emoji: "🌏", cor: "#E43225" },
    americanas:    { nome: "Americanas",      emoji: "🔴", cor: "#E4002B" },
    casasbahia:    { nome: "Casas Bahia",     emoji: "🛋️", cor: "#0057A8" },
    submarino:     { nome: "Submarino",       emoji: "🚢", cor: "#0033A0" },
    netshoes:      { nome: "Netshoes",        emoji: "👟", cor: "#007A4C" },
    outras:        { nome: "Outras",          emoji: "🏷️", cor: "#8B5CF6" }
};

const REDES = [
    { nome: "Telegram", url: CONFIG.TELEGRAM,
      bg: "#0088CC",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>` },
    { nome: "Instagram", url: CONFIG.INSTAGRAM,
      bg: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>` },
    { nome: "TikTok", url: CONFIG.TIKTOK,
      bg: "#010101",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.16-3.44-3.37-3.46-5.7-.02-1.43.34-2.84 1.05-4.04 1.63-2.64 4.88-3.9 7.82-2.92v4.06c-1.12-.4-2.42-.31-3.43.3-1.05.62-1.68 1.78-1.62 3.02.04 1.15.68 2.21 1.7 2.76 1.06.56 2.4.61 3.49.12 1.15-.52 1.88-1.68 1.91-2.96.06-4.57.01-9.15.03-13.73z"/></svg>` },
    { nome: "Facebook", url: CONFIG.FACEBOOK,
      bg: "#1877F2",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>` }
];

let todasOfertas = [];
let lojaAtual = "todas";
let ordemAtual = "recente";
let debounceTimer = null;
let refreshTimer = null;
let ultimaAtualizacao = null;
let paginaAtual = 1;
let observerIntersection = null;
let formLojaSelecionada = "";
let chatOpen = false;
let chatHistorico = [];

// ==========================================
