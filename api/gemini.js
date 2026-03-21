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

        // ARRAY "MÁGICO" DE MODELOS
        // Vai testar do mais estável ao mais recente até a Google aprovar a chave
        const modelosParaTestar = [
            "gemini-1.5-flash", 
            "gemini-2.0-flash", 
            "gemini-2.5-flash"
        ];
        
        let response;
        let data;
        let ultimoErro = "";

        for (const model of modelosParaTestar) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            data = await response.json();
            
            if (response.ok) {
                break; // Encontrou o modelo compatível! Sai do loop imediatamente.
            } else {
                ultimoErro = data.error?.message || response.statusText;
            }
        }

        // Se falhar em TODOS os modelos da lista
        if (!response?.ok) {
            return res.status(502).json({
                error: `Motivo da Google: ${ultimoErro}`
            });
        }

        if (!data.candidates || !data.candidates[0]?.content) {
            return res.status(200).json({ text: "Bloqueado por política de segurança da Google 🛡️", blocked: true });
        }

        return res.status(200).json({
            text: data.candidates[0].content.parts[0].text,
            blocked: false
        });

    } catch (error) {
        return res.status(500).json({ error: `Falha interna Vercel: ${error.message}` });
    }
}
