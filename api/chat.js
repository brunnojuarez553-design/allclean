// /api/chat.js
// Proxy serverless para Vercel: recibe los mensajes del chat del sitio,
// llama a Groq con la API key oculta en una variable de entorno,
// y devuelve la respuesta tal cual la espera el frontend.
//
// Configurar en Vercel: Settings → Environment Variables → GROQ_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Faltan los mensajes' });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.6,
        max_tokens: 700
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error('Groq error:', data);
      return res.status(groqResponse.status).json({
        error: (data.error && data.error.message) || 'Error al consultar Groq'
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
