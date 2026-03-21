export default async function handler(req, res) {
    // Permite que o seu site acesse a API sem bloqueios de segurança (CORS)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

    // Puxa a sua chave secreta lá da Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Chave API ausente na Vercel." });

    try {
        const { prompt, systemInstruction, history } = req.body;

        // MUDANÇA CRÍTICA: Usando o modelo universal e estável da Google
        const model = "gemini-1.5-flash";
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
        if (systemInstruction) {
            payload.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        // Bate na porta da Google
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        // Se a Google recusar, agora vamos ver o motivo exato
        if (!response.ok) {
            return res.status(502).json({
                error: "A Google recusou a requisição",
                detail: data.error?.message || "Erro desconhecido da Google"
            });
        }

        if (!data.candidates || !data.candidates[0]?.content) {
            return res.status(200).json({ text: "Bloqueado por segurança 🛡️", blocked: true });
        }

        // Sucesso! Devolve a resposta ao seu site
        return res.status(200).json({
            text: data.candidates[0].content.parts[0].text,
            blocked: false
        });

    } catch (error) {
        return res.status(500).json({ error: "Falha no servidor", detail: error.message });
    }
}
