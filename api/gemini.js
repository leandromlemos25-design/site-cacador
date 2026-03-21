export default async function handler(req, res) {
    // Permite que o seu site acesse a API sem bloqueios de segurança (CORS)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

    // Puxa a chave da Vercel e limpa espaços/aspas
    let apiKey = process.env.GEMINI_API_KEY || "";
    apiKey = apiKey.replace(/"/g, '').trim();

    if (!apiKey) return res.status(500).json({ error: "Chave API ausente na Vercel." });

    try {
        const { prompt, systemInstruction, history } = req.body;

        let contents = [];
        if (history && Array.isArray(history) && history.length > 0) {
            contents = history.map((msg) => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
            }));
        }
        contents.push({ role: "user", parts: [{ text: prompt }] });

        const payload = { contents };
        if (systemInstruction) {
            payload.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        // TENTATIVA 1: O modelo mais recente e otimizado
        let model = "gemini-1.5-flash-latest";
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        let response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        
        let data = await response.json();

        // TENTATIVA 2 (FALLBACK): Se a Google não encontrar o modelo 1.5, usamos o modelo clássico universal
        if (!response.ok && data.error?.message?.includes("is not found")) {
            model = "gemini-pro";
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            data = await response.json();
        }

        // Se mesmo assim a Google recusar, mostramos o erro exato
        if (!response.ok) {
            return res.status(502).json({
                error: `Motivo da Google: ${data.error?.message || response.statusText}`
            });
        }

        // Verifica bloqueios de segurança da Google
        if (!data.candidates || !data.candidates[0]?.content) {
            return res.status(200).json({ text: "Bloqueado por segurança 🛡️", blocked: true });
        }

        // Sucesso! Devolve a resposta final ao site
        return res.status(200).json({
            text: data.candidates[0].content.parts[0].text,
            blocked: false
        });

    } catch (error) {
        return res.status(500).json({ error: `Falha interna Vercel: ${error.message}` });
    }
}
