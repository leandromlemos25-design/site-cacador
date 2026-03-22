# Relatório de Sessão — O Caçador de Ofertas
**Data:** 22 de março de 2026
**Branch de trabalho:** `claude/analyze-github-site-j0Xn3`
**Repositório:** `leandromlemos25-design/site-cacador`

---

## 1. Visão Geral do Projeto

**O Caçador de Ofertas** é um agregador de ofertas em português (PT-BR) implementado como uma Single Page Application (SPA) em HTML/CSS/JS puro. Agrega ofertas do Google Sheets e da API Shopee Afiliados, com um assistente de IA chamado **Teteco** baseado no Google Gemini.

| Item | Detalhe |
|---|---|
| Stack | HTML + CSS inline + JavaScript vanilla |
| Hospedagem | Vercel (API handlers em Node.js) |
| Dados | Google Sheets (manual) + Shopee Affiliate API (automático) |
| IA | Google Gemini via proxy Vercel |

---

## 2. Parecer Técnico Inicial

### 2.1 Pontos Positivos

- **Design profissional:** Tema dark/light com paleta coerente, tipografia Syne + DM Sans, animações suaves
- **SEO bem implementado:** Meta tags OpenGraph, Twitter Card, Schema.org (WebSite + Organization)
- **Presença multi-plataforma:** Links para Telegram, Instagram, TikTok, Facebook e Twitter
- **Performance:** Lazy loading de imagens, skeleton screens, cache em localStorage, auto-refresh
- **Multi-loja:** Amazon, Shopee, Magalu, Mercado Livre, AliExpress, Americanas, Casas Bahia, Netshoes
- **Proteção XSS:** Uso da função `esc()` para escapar dados antes de inserir no DOM
- **Integração com IA:** Chatbot via Gemini com fallback entre modelos (`gemini-1.5-flash` → `gemini-2.0-flash` → `gemini-2.5-flash`)
- **Responsivo:** Media queries para mobile, menu hamburguer

### 2.2 Problemas Críticos de Segurança

#### ⛔ 1. Credenciais Expostas no Código (`api/shopee.js`)
```javascript
const appId = '18349310952';
const appSecret = 'OVT5GSP5CARZR74TXZ2L3J4RRQACTAG2';
```
**Gravidade: ALTA.** O `appSecret` da Shopee Affiliate está hardcoded no arquivo versionado. Qualquer pessoa com acesso ao repositório pode usar essas credenciais para fazer requisições na conta. Deve ser movido para variáveis de ambiente da Vercel.

#### ⛔ 2. Painel Admin sem Autenticação (`admin.html`)
O painel de publicação de ofertas não tem nenhum login, senha ou controle de acesso. Quem souber a URL pode publicar ofertas no site. Necessário adicionar autenticação (senha simples, magic link ou OAuth).

#### ⚠️ 3. CORS Aberto (`api/gemini.js`)
```javascript
res.setHeader("Access-Control-Allow-Origin", "*");
```
Permite que qualquer domínio use o proxy da Gemini, expondo a chave de API a abusos. Deve ser restrito ao domínio oficial.

### 2.3 Problemas de UX/Funcionalidade

#### Bug confirmado: Teteco AI com contexto de datas errado
O Teteco afirmava que o **iPhone 16 "não tinha sido lançado"** (foi lançado em setembro/2024) e redirecionava para o iPhone 15. O `systemPrompt` não tinha nenhuma informação sobre data atual — o Gemini usava o corte do seu treinamento e respondia como se produtos recentes não existissem.

#### Bug confirmado: FAB sobreposto ao campo de texto no mobile
No mobile, a janela do chat abre encostada no rodapé (`bottom:0`). O botão FAB ficava em `bottom:16px; right:16px` — exatamente em cima do campo de texto, impedindo o usuário de digitar.

#### Problema de arquitetura: busca com 1 único termo
A busca anterior:
- Gerava 1 único termo → se falhasse, desistia
- Filtro de preço genérico (`>= R$400`) → eliminava produtos válidos de outras categorias
- Sem retry, sem fallback, sem verificação por categoria

---

## 3. Implementações Realizadas Nesta Sessão

### 3.1 Fix: Contexto de Data e Produtos no Teteco AI
**Commit:** `3041a90`

**O que foi corrigido:**

1. **Data injetada dinamicamente no prompt:**
```javascript
const dataAtual = new Date().toLocaleDateString('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric'
});
// → "22 de março de 2026"
```

2. **Lista de modelos de referência por categoria no prompt:**
```
• iPhone: 16, 16 Plus, 16 Pro, 16 Pro Max (lançados set/2024)
• Samsung Galaxy S: S25, S25+, S25 Ultra (lançados jan/2025)
• Samsung Galaxy A: A55, A35, A15
• Xiaomi: Redmi Note 13, Poco X6, Poco F6
• Motorola: Moto G84, Moto G54, Edge 50
• Notebook: Dell Inspiron, Samsung Galaxy Book, Lenovo IdeaPad, Acer Aspire, ASUS VivoBook
• Console: PS5, Xbox Series X/S, Nintendo Switch OLED
• Smart TV: LG OLED, Samsung QLED, TCL QLED
• Fones: AirPods Pro 2, Samsung Galaxy Buds 2 Pro, JBL Tune 770NC
• Relógios: Apple Watch Series 10, Samsung Galaxy Watch 7, Xiaomi Smart Band 9
```

3. **Regra nova no prompt:** "Se tiver incerto, FAÇA A BUSCA MESMO ASSIM — deixe a loja confirmar se existe ou não."

4. **Exemplo atualizado:** iPhone 15 → iPhone 16 (modelo atual correto)

5. **Mesmo fix aplicado ao Analisador de Ofertas** (modal "Vale a pena?")

**Resultado:** Quando o usuário digita "iPhone 16", o Teteco busca corretamente. Se pedir "iPhone 17" (não lançado), redireciona para o 16, não mais para o 15.

---

### 3.2 Redesenho da Busca do Teteco AI — Sistema em Cascata
**Commit:** `ee2ff22`

**Arquitetura anterior (1 tentativa):**
```
Cliente: "iphone 16"
→ 1 termo gerado → falhou → "não encontrei" → venda perdida
```

**Nova arquitetura (cascata automática de 3 níveis):**
```
Cliente: "iphone 16"
          ↓
Nível 1: "Smartphone Apple iPhone 16 128GB Original"
   → tem resultado? → mostra ✅
   → zero resultado? → tenta automaticamente...
          ↓
Nível 2: "iPhone 16 Original Lacrado"
   → tem resultado? → mostra ✅
   → zero resultado? → tenta automaticamente...
          ↓
Nível 3: "iPhone 16"
   → tem resultado? → mostra ✅
   → zero resultado? → manda pro Telegram da equipe
```

**3 tags obrigatórias geradas pelo Gemini:**
```
[BUSCAR: termo_especifico]   ← Nível 1: marca + modelo + memória + Original
[BUSCAR_ALT: termo_medio]    ← Nível 2: marca + modelo, sem extras
[BUSCAR_SIMPLES: termo_curto] ← Nível 3: 2-3 palavras (fallback final)
```

**Filtro inteligente por categoria** (`filtrarAntiAcessorios`):

| Categoria | Preço mínimo |
|---|---|
| Smartphone (iPhone, Samsung, Xiaomi, Motorola...) | R$ 350 |
| Notebook / Laptop / MacBook | R$ 700 |
| Smart TV | R$ 600 |
| Console (PS5, Xbox, Nintendo) | R$ 250 |
| Eletrodoméstico (geladeira, lavadora, ar-cond.) | R$ 500 |
| Tablet / iPad | R$ 400 |
| Smartwatch / Apple Watch / Galaxy Watch | R$ 150 |

Categorias não listadas: sem filtro de preço aplicado.

**Prompt enriquecido:** 10+ categorias com exemplos exatos (iPhone, Samsung, Redmi, Moto G, Notebook, Smart TV, Console, Fone de ouvido, Smartwatch, Perfume, Eletrodoméstico).

---

### 3.3 Fix: FAB Escondido no Mobile Durante Chat Aberto
**Commit:** `8e1e152`

**Problema:** No mobile, o botão FAB (`bottom:16px; right:16px`) ficava sobreposto ao campo de texto do chat aberto (`bottom:0`).

**Solução — 1 linha de CSS:**
```css
@media (max-width: 768px) {
  .chat-fab.active { display: none; }
}
```

**Por que funciona:** Quando o chat abre, o FAB recebe a classe `.active`. No mobile, essa regra o esconde completamente. O cabeçalho do chat já tem o botão ✕ para fechar — sem perda de funcionalidade.

---

### 3.4 Documentação: CLAUDE.md
**Commit:** `fae04b7`

Arquivo de guia completo para assistentes de IA trabalharem no repositório. Inclui:
- Visão geral e stack
- Estrutura de arquivos e arquitetura do `index.html`
- Sistema de design (CSS tokens, tipografia, convenções)
- Documentação de todas as funções JavaScript principais
- Integrações externas (Google Sheets, Gemini, Shopee, Telegram)
- Fluxo de dados completo
- Checklist para mudanças comuns
- Status de segurança

---

## 4. Status dos Commits no Branch

| Hash | Descrição |
|---|---|
| `fae04b7` | docs: add CLAUDE.md com guia completo para assistentes IA |
| `8e1e152` | fix: esconder FAB do chat no mobile quando janela está aberta |
| `ee2ff22` | feat: redesenhar busca do Teteco AI com sistema em cascata de 3 termos |
| `3041a90` | fix: corrigir contexto de data e conhecimento de produtos no Teteco AI |

---

## 5. Pendências Identificadas (Não Implementadas)

### 5.1 Segurança (Urgente)

| # | Problema | Solução |
|---|---|---|
| 1 | `appSecret` da Shopee hardcoded em `api/shopee.js` | Mover para variável de ambiente `SHOPEE_APP_SECRET` no painel da Vercel |
| 2 | `admin.html` sem autenticação | Adicionar senha/PIN simples ou autenticação por token |
| 3 | CORS aberto (`*`) em `api/gemini.js` | Restringir ao domínio oficial do site |

### 5.2 Alto Impacto, Baixo Esforço

| # | Feature | Descrição |
|---|---|---|
| 4 | Contador de expiração nos cards | Badge "Expira em 2h" — gera urgência e aumenta CTR |
| 5 | PWA (Progressive Web App) | `manifest.json` + Service Worker → site instalável no celular |
| 6 | Aba de Cupons | Seção dedicada a cupons de desconto por loja — alto volume de busca orgânica |

### 5.3 Médio Esforço

| # | Feature | Descrição |
|---|---|---|
| 7 | Busca com autocomplete | Sugestões em tempo real enquanto o usuário digita |
| 8 | Alertas de preço por e-mail | Usuário cadastra produto + preço alvo → recebe notificação (Resend/EmailJS) |
| 9 | Notificações Push via Telegram Bot | Botão "Me avise no Telegram" em cada oferta |
| 10 | Filtro por faixa de preço (slider) | Range slider para complementar os filtros de categoria |

### 5.4 Alto Esforço

| # | Feature | Descrição |
|---|---|---|
| 11 | Migração de Google Sheets para Supabase | Banco de dados real, tempo real nativo, plano gratuito |
| 12 | Páginas por oferta (SEO) | URL própria por oferta indexável pelo Google |
| 13 | Comparador de preços | Selecionar até 3 produtos, ver tabela lado a lado |
| 14 | Dashboard de analytics no admin | Cliques por oferta, CTR por loja, horários de pico |

---

## 6. Matriz Esforço × Impacto

```
ALTO IMPACTO + BAIXO ESFORÇO  →  Fazer primeiro
────────────────────────────────────────────────
✅ Fix FAB mobile                   (feito)
✅ Fix contexto IA                  (feito)
✅ Busca em cascata                 (feito)
⏳ Contador de expiração nos cards
⏳ PWA (manifest + service worker)
⏳ Aba de Cupons
⏳ Mover appSecret para env var     (CRÍTICO)
⏳ Senha no admin.html              (CRÍTICO)

ALTO IMPACTO + MÉDIO ESFORÇO  →  Fazer a seguir
────────────────────────────────────────────────
⏳ Alertas de preço por e-mail
⏳ Notificações Push Telegram
⏳ Busca com autocomplete

ALTO IMPACTO + ALTO ESFORÇO  →  Planejar com calma
────────────────────────────────────────────────
⏳ Migração para Supabase
⏳ Páginas por oferta (SEO)
⏳ Comparador de preços
```

---

## 7. Notas Técnicas Relevantes

- **`admin.html` não está funcional:** O campo `APPS_SCRIPT_URL` na linha 262 ainda contém `"COLE_O_SEU_LINK_DO_APPS_SCRIPT_AQUI"` — o Apps Script precisa ser implantado e a URL inserida para que o painel funcione.
- **Imagens grandes:** `logo.png` (6.2 MB) e `banner.png` (6.3 MB) devem ser comprimidas antes de qualquer deploy sério — impactam o Lighthouse score.
- **Google Sheets como BD:** Funciona, mas é frágil. Se a planilha ficar privada ou exceder limites da API gratuita, o site para de carregar ofertas. Supabase (plano gratuito) é a migração recomendada.
- **Deploy:** Vercel com deploy automático a partir do `main`. O branch `claude/analyze-github-site-j0Xn3` precisa ser mergeado no `main` para refletir em produção.
