# CLAUDE.md — O Caçador de Ofertas

Guia completo para assistentes de IA trabalharem neste repositório.

---

## Visão Geral do Projeto

**O Caçador de Ofertas** é um agregador de ofertas em português (PT-BR) implementado como uma **Single Page Application (SPA) em HTML/CSS/JS puro**. Agrega ofertas do Google Sheets e da API Shopee Afiliados, com um assistente de IA (Teteco) baseado no Gemini.

- **Stack:** HTML + CSS inline + JavaScript vanilla
- **Hospedagem:** Vercel (API handlers em Node.js)
- **Dados:** Google Sheets (manual) + Shopee Affiliate API (automático)
- **IA:** Google Gemini via proxy Vercel

---

## Estrutura de Arquivos

```
site-cacador/
├── index.html        # Aplicação principal (2.332 linhas, ~107 KB)
├── admin.html        # Painel administrativo de publicação de ofertas
├── api/
│   ├── gemini.js     # Proxy Vercel → Google Gemini API
│   └── shopee.js     # Proxy Vercel → Shopee Affiliate API
├── logo.png          # Logo oficial da marca (6.2 MB — PNG com fundo transparente)
├── banner.png        # Banner promocional (6.3 MB)
├── teteco.png        # Mascote Teteco (1.4 MB)
└── CLAUDE.md         # Este arquivo
```

**Não existem:** `package.json`, `.gitignore`, `README.md`, arquivos CSS externos, frameworks JS.

---

## Arquitetura do `index.html`

O arquivo único contém três grandes blocos:

### 1. `<head>` — Meta, Fontes, CSS e Schema.org
- SEO configurado com Schema.org (WebSite + Organization)
- Fontes via Google Fonts CDN: **Syne** (títulos) + **DM Sans** (corpo)
- Todo o CSS está **inline** dentro de uma tag `<style>` (~900 linhas de CSS)
- Sem folhas de estilo externas

### 2. `<body>` — HTML da Interface

| Componente | ID/Classe | Descrição |
|---|---|---|
| Navbar | `#navbar` | Fixa, blur backdrop, logo SVG customizado em código |
| Menu mobile | `#mobileMenu` | Dropdown ocultado por padrão |
| Página Home | `#page-home` | Hero + social cards + newsletter |
| Página Ofertas | `#page-ofertas` | Filtros + grid de cards |
| Página Favoritos | `#page-favoritos` | Grid de ofertas salvas |
| Página Pedir | `#page-pedir` | Formulário de pedido de oferta |
| Modal IA | `#aiModal` | Análise de oferta pelo Teteco |
| Chat | `#chatWindow` | Interface de chat com Teteco AI |

**Sistema de páginas:** Visibilidade controlada pela classe `.active` nas divs `.page`. Sem roteamento externo.

### 3. `<script>` — JavaScript Inline (~1.000 linhas)

Todo o JS da aplicação está em um único bloco `<script>` no final do `<body>`.

---

## Sistema de Design (CSS)

### Temas
- **Dark** (padrão): `data-theme="dark"` no `<html>`
- **Light**: `data-theme="light"` — preferência salva no `localStorage`

### Variáveis CSS (tokens)

```css
/* Backgrounds */
--bg: #09101a          /* dark navy */
--surface: #131d2c     /* cards */
--surface2: #1a2639    /* hover */

/* Marca */
--accent: #ff7a00      /* laranja principal */
--accent2: #ffa040     /* laranja claro */
--accent-glow: rgba(255,122,0,0.35)
--brand-blue: #1e60b3  /* azul da logo */

/* Texto */
--text: #f0f4f8        /* primário */
--text2: #a2b3c7       /* secundário */
--text3: #758ca6       /* terciário/muted */
```

### Tipografia
- **Syne** (800): títulos, logo, preços, stats
- **DM Sans** (400–700): corpo, botões, labels
- Escala fluida com `clamp()` nos títulos principais

### Convenções de estilo
- Border-radius predominante: `18px` em cards, `12px` em botões
- Transições: `all 0.2s` ou `all 0.3s ease`
- Hover em cards: `translateY(-4px)` + sombra
- **Nunca usar glow laranja genérico em todos os elementos** — reservar para o botão CTA principal e o FAB do Telegram

---

## Lógica JavaScript

### Estado Global

```javascript
let todasOfertas = [];       // Todas as ofertas carregadas
let lojaAtual = "todas";     // Filtro de loja ativo
let ordemAtual = "recente";  // Ordenação ativa
let paginaAtual = 1;         // Página de paginação
let chatHistorico = [];      // Histórico de mensagens do chat
let chatOpen = false;        // Estado do chat
let formLojaSelecionada = ""; // Loja selecionada no form de pedido
```

### Configuração (`CONFIG`)

```javascript
const CONFIG = {
  SHEET_ID: "1Ug9wQKO9Hf...",  // Google Sheets ID
  SHEET_TAB: "Página1",
  TELEGRAM: "https://t.me/ocacadordeoferta",
  REFRESH_INTERVAL: 2 * 60 * 60 * 1000,  // 2 horas
  HORAS_NOVO: 24,              // Badge "NEW" por 24h
  DIAS_EXPIRACAO: 7,           // Ocultar após 7 dias
  ITEMS_PER_PAGE: 12
};
```

### Funções Principais

#### Dados
| Função | Descrição |
|---|---|
| `carregarOfertas(silencioso)` | Busca Google Sheets via gviz API, aplica cache 2h |
| `carregarOfertasShopee()` | Busca `/api/shopee`, mescla com ofertas manuais |
| `lerCache()` / `salvarCache()` | Gerencia `localStorage` com TTL |
| `iniciarAutoRefresh()` | Refresh automático a cada 2 horas |

#### Renderização
| Função | Descrição |
|---|---|
| `renderizarTudo()` | Renderiza tudo de uma vez |
| `renderOfertas(resetPage)` | Grid de ofertas com paginação |
| `renderDestaques()` | 4 cards em destaque no topo |
| `renderFavoritos()` | Grid da página de favoritos |
| `criarCardHTML(oferta, delay)` | Gera HTML de um card individual |

#### Filtros e Busca
| Função | Descrição |
|---|---|
| `filtrarPorLoja(loja, btn)` | Ativa filtro de loja |
| `ordenar(tipo, btn)` | Muda ordenação |
| `getFilteredOfertas()` | Retorna lista filtrada + ordenada |
| `filtrarOfertas()` | Handler do input de busca (debounce 300ms) |

#### Favoritos
| Função | Descrição |
|---|---|
| `getFavoritos()` | Lê IDs do localStorage |
| `salvarFavoritos(ids)` | Persiste array de IDs |
| `toggleFavorito(id)` | Adiciona ou remove |
| `isFavorito(id)` | Verifica se está favoritado |

#### Navegação SPA
```javascript
navegar(pagina)  // "home" | "ofertas" | "favoritos" | "pedir"
```
Altera `.active` nas `.page` divs e atualiza o hash da URL.

#### Utilitários
| Função | Descrição |
|---|---|
| `parsePreco(val)` | Converte "R$ 1.299,90" → 1299.90 |
| `parseDataCustom(str)` | "DD/MM/YYYY HH:MM" → Date |
| `normalizarLoja(raw)` | Normaliza nome de loja (sem acentos, lowercase) |
| `formatarMoeda(v)` | 1299.9 → "R$ 1.299,90" |
| `esc(s)` | Escapa HTML para prevenir XSS |
| `mostrarToast(icon, msg)` | Exibe notificação temporária |

---

## Integrações Externas

### Google Sheets (fonte de dados principal)
- **Endpoint:** `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq`
- **Colunas esperadas na planilha:** `loja`, `titulo`, `preco_antigo`, `preco_novo`, `link`, `data`, `emoji`, `categoria`, `selo`, `ativo`, `imagem`
- O parser aceita múltiplas variações de nome de coluna
- Cache de 2 horas no `localStorage`

### Gemini AI (`/api/gemini.js`)
- **Método:** POST com JSON `{ prompt, systemInstruction, history }`
- **Fallback de modelos:** `gemini-1.5-flash` → `gemini-2.0-flash` → `gemini-2.5-flash`
- **API Key:** variável de ambiente Vercel `GEMINI_API_KEY`
- **Usos:** análise de oferta (`analisarOferta`) + chat do Teteco (`enviarMsg`)

### Shopee Affiliate API (`/api/shopee.js`)
- **Autenticação:** HMAC-SHA256 com `appId` e `appSecret` (hardcoded no arquivo)
- **Endpoint:** `open-api.affiliate.shopee.com.br`
- **Retorna:** produtos com nome, preço, desconto, link afiliado, imagem

### Telegram
- Grupo público: `https://t.me/ocacadordeoferta`
- Formulário de pedido de oferta redireciona para o grupo

---

## Teteco AI (Chatbot)

O chatbot usa uma estratégia de **busca em cascata de 3 níveis** na Shopee:

```
Nível 1: Termo específico — "Samsung Galaxy S25 256GB Original"
Nível 2: Termo médio     — "Samsung Galaxy S25"
Nível 3: Termo simples   — "Galaxy S25"
```

**Filtro anti-acessórios** (`filtrarAntiAcessorios`): remove capinhas, películas e acessórios por preço mínimo por categoria:

| Categoria | Preço mínimo |
|---|---|
| Smartphone | R$ 350 |
| Notebook | R$ 700 |
| Smart TV | R$ 600 |
| Console | R$ 250 |
| Eletrodoméstico | R$ 500 |
| Tablet | R$ 400 |
| Smartwatch | R$ 150 |

O system prompt inclui a data atual para que o Gemini saiba sobre modelos de produtos lançados recentemente.

---

## Painel Admin (`admin.html`)

- **Acesso:** direto via URL (sem autenticação)
- **Função:** publicar ofertas via Google Apps Script webhook
- **Status:** o campo `COLE_O_SEU_LINK_DO_APPS_SCRIPT_AQUI` na linha 262 precisa ser preenchido com a URL do Apps Script implantado
- **Preview:** atualização em tempo real à medida que o admin preenche o formulário

---

## Convenções de Desenvolvimento

### Ao editar `index.html`

1. **CSS fica inline** na tag `<style>` — não criar arquivos `.css` separados
2. **JS fica inline** na tag `<script>` no final do `<body>` — não criar arquivos `.js` separados (exceto em `/api/`)
3. **Funções chamadas via `onclick` no HTML** devem estar exportadas no `window`:
   ```javascript
   window.nomeDaFuncao = nomeDaFuncao;
   ```
4. **XSS:** usar sempre `esc(str)` ao inserir strings do usuário ou de API no HTML
5. **Preços:** usar `parsePreco()` para ler e `formatarMoeda()` para exibir
6. **Não usar `innerHTML` com dados externos sem escapar**

### Ao adicionar novas lojas

Adicionar entrada ao objeto `LOJAS`:
```javascript
const LOJAS = {
  novaLoja: { emoji: "🛍️", nome: "Nome da Loja", cor: "#hexcolor" },
  ...
};
```

### Ao modificar o CSS

- Usar variáveis CSS (`var(--accent)`, etc.) — não hardcodar cores
- Manter consistência de border-radius (cards: 18px, botões: 12px)
- Transições sempre com `ease` ou `ease-in-out`, duration máx. 0.3s
- Media queries existentes: `@media (max-width: 1024px)`, `(max-width: 768px)`, `(max-width: 480px)`

### Logo e Imagens

- **`logo.png`** é o logo oficial — usar `<img src="logo.png">` onde necessário
- O logo SVG no navbar é uma recriação em código (legada) — pode ser substituído por `<img src="logo.png">`
- Imagens grandes (`logo.png` 6.2 MB, `banner.png` 6.3 MB) — considerar otimização antes de deploy
- Cards de oferta usam lazy loading via `data-src` + `IntersectionObserver`

---

## Fluxo de Dados

```
Page Load
    ├── initTema()           — carrega tema do localStorage
    ├── renderSocial()       — gera cards de redes sociais
    ├── renderFormLojas()    — gera botões do form de pedido
    ├── inicializarFiltros() — gera botões de filtro de loja
    ├── carregarOfertas()    — Google Sheets → todasOfertas[]
    │       ├── lerCache()   — usa cache se < 2h
    │       └── carregarOfertasShopee() — mescla Shopee
    └── iniciarAutoRefresh() — repete a cada 2h

User Action: filtrar loja
    └── filtrarPorLoja() → getFilteredOfertas() → renderOfertas()

User Action: mensagem no chat
    └── enviarMsg()
            ├── chamarGemini() — gera [BUSCAR:] tags
            └── buscarComCascata() — 3 chamadas à /api/shopee
                    └── filtrarAntiAcessorios() → exibe cards
```

---

## Git e Deploy

- **Branch de desenvolvimento:** `claude/analyze-github-site-j0Xn3`
- **Branch principal:** `main` (remoto), `master` (local legacy)
- **Remote:** `http://local_proxy@127.0.0.1:39573/git/leandromlemos25-design/site-cacador`
- **Deploy:** Vercel (automático a partir do `main`)
- **API handlers:** `/api/*.js` — Vercel Serverless Functions (Node.js)

### Push

```bash
git push -u origin claude/analyze-github-site-j0Xn3
```

> Branches fora do padrão `claude/` retornam HTTP 403.

---

## Segurança

| Item | Status |
|---|---|
| XSS | ✅ `esc()` em toda interpolação de strings externas |
| CORS | ✅ Habilitado nos handlers `/api/` |
| HTTPS | ✅ URLs HTTP convertidas automaticamente |
| Admin auth | ❌ `admin.html` sem login — proteger por obscuridade de URL |
| Credenciais Shopee | ⚠️ `appId` e `appSecret` hardcoded em `api/shopee.js` — considerar mover para env vars Vercel |
| Google Sheets ID | ⚠️ Público no código — restringir permissões na planilha |

---

## Checklist para Mudanças Comuns

### Adicionar uma nova seção de página
- [ ] Adicionar div `.page` com novo `id="page-nova"` no HTML
- [ ] Adicionar botão no `#navbar` e `#mobileMenu`
- [ ] Atualizar `navegar()` para incluir a nova página

### Adicionar campo no card de oferta
- [ ] Atualizar `criarCardHTML()` com o novo campo
- [ ] Garantir que `esc()` seja usado se o valor vier de dados externos
- [ ] Adicionar CSS correspondente

### Adicionar nova integração de API
- [ ] Criar `/api/novaapi.js` como Vercel Serverless Function
- [ ] Chamar do frontend com `fetch('/api/novaapi')`
- [ ] Adicionar credenciais como variáveis de ambiente no Vercel

### Modificar o Teteco AI
- [ ] System prompt está dentro de `enviarMsg()` — editar a string `systemPrompt`
- [ ] Filtros de preço por categoria estão em `filtrarAntiAcessorios()`
- [ ] Lógica de cascata está em `buscarComCascata(fila)`
