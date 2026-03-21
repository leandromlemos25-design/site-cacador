/**
 * Vercel Serverless Function — Proxy para Gemini API
 */

export default async function handler(req, res) {
    // CORS — adicionado o seu domínio Vercel de testes!
    const allowedOrigins = [
        "https://ocacadordeofertas.com",
        "https://www.ocacadordeofertas.com",
        "https://site-cacador.vercel.app", // <--- O SEU DOMÍNIO AQUI!
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ];

    const origin = req.headers.origin || "";
    // Permitir se for do mesmo domínio ou da lista de autorizados
    if (!origin || allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Preflight (requisições preliminares do navegador)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido. Use POST." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY não configurada na Vercel.");
        return res.status(500).json({ error: "Configuração do servidor incompleta." });
    }

    try {
        const { prompt, systemInstruction, history } = req.body;

        if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
            return res.status(400).json({ error: "Campo 'prompt' é obrigatório." });
        }

        // Limitar tamanho para não gastar tokens desnecessários
        if (prompt.length > 10000) {
            return res.status(400).json({ error: "Prompt muito longo." });
        }

        // Modelo Gemini otimizado
        const model = "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        let contents;
        if (history && Array.isArray(history) && history.length > 0) {
            contents = history.map((msg) => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
            }));
            contents.push({ role: "user", parts: [{ text: prompt }] });
        } else {
            contents = [{ role: "user", parts: [{ text: prompt }] }];
        }

        const payload = { contents };

        if (systemInstruction && typeof systemInstruction === "string") {
            payload.systemInstruction = {
                parts: [{ text: systemInstruction }],
            };
        }

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API error:", data.error?.message);
            return res.status(502).json({
                error: "Erro na API de IA.",
                detail: data.error?.message || "Resposta inválida",
            });
        }

        if (!data.candidates || !data.candidates[0]?.content) {
            const reason = data.candidates?.[0]?.finishReason || "UNKNOWN";
            return res.status(200).json({
                text: reason === "SAFETY"
                    ? "A política de segurança bloqueou esta análise. 🛡️"
                    : "Não consegui gerar uma resposta. Tente novamente.",
                blocked: true,
            });
        }

        const text = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text, blocked: false });

    } catch (error) {
        console.error("Proxy Gemini error:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}
