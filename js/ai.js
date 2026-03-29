// MOTOR DE INTELIGÊNCIA ARTIFICIAL (GEMINI API)
// ==========================================
async function chamarGemini(promptTexto, systemInst = "", historico = []) {
    let delay = 1000;
    let ultimoErro = "";

    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(GEMINI_PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: promptTexto,
                    systemInstruction: systemInst || undefined,
                    history: historico.length > 0 ? historico : undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                ultimoErro = result.error || result.detail || response.statusText;
                throw new Error(`Proxy Error: ${response.status} - ${ultimoErro}`);
            }

            if (result.blocked) {
                return result.text;
            }

            return result.text;
        } catch (error) {
            console.error(`Tentativa ${i + 1} falhou:`, error);
            if (i === 2) {
                return `Desculpe, a IA está indisponível no momento. 😔`;
            }
            await new Promise((r) => setTimeout(r, delay));
            delay *= 2;
        }
    }
}

function _formatarRespostaIA(txt) {
    if (!txt) return "";
    return txt.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
              .replace(/\*(.*?)\*/g, '<i>$1</i>')
              .replace(/\n/g, '<br>');
}

// ==========================================
