export default async function handler(req, res) {
  // FASE 1: Proteção CORS
  const origin = req.headers.origin;
  const allowed = !origin || origin.includes('ocacadordeofertas.com') || origin.includes('vercel.app') || origin.includes('localhost');
  if (!allowed) {
      return res.status(403).json({ error: 'Acesso negado. Domínio não autorizado.' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, systemInstruction, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Chave da API do Gemini não configurada' });
    }

    // Estrutura para chamada à API do Gemini
    const contents = history ? [...history, { role: "user", parts: [{ text: prompt }] }] : [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents };
    
    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API Gemini');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";
    return res.status(200).json({ text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
