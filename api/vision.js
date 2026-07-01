// api/vision.js
// Proxy serverless para el analizador de fotos con IA.
// Recibe la imagen en base64 desde el frontend y le pega a Groq (vision)
// desde el servidor, así la GROQ_API_KEY nunca queda expuesta en el navegador.
//
// Requiere la variable de entorno GROQ_API_KEY configurada en Vercel
// (Project Settings > Environment Variables). Es la MISMA key que ya usás
// en /api/chat, no hace falta crear una cuenta nueva.

export const config = {
  runtime: 'edge',
};

const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { image, mimeType, prompt } = await req.json();

    if (!image || !prompt) {
      return new Response(JSON.stringify({ error: 'Faltan datos: image y prompt son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const safeMime = mimeType || 'image/jpeg';

    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:${safeMime};base64,${image}` },
              },
            ],
          },
        ],
        temperature: 0.4,
        max_completion_tokens: 700,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await groqResp.json();

    if (!groqResp.ok) {
      const message = (data && data.error && data.error.message) || 'Error al consultar Groq';
      return new Response(JSON.stringify({ error: message }), {
        status: groqResp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
