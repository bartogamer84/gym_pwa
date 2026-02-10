// api/openrouter.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).send('Only POST allowed');
    }

    // Opcional: validación básica de CORS/origen
    // const allowed = ['https://tu-dominio.github.io', 'http://localhost:5500'];
    // const origin = req.headers.origin;
    // if (origin && !allowed.includes(origin)) return res.status(403).send('Origin not allowed');

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
        });

        const text = await resp.text();
        // Reenvía cabeceras relevantes y el cuerpo tal cual
        res.status(resp.status).setHeader('content-type', resp.headers.get('content-type') || 'application/json');
        return res.send(text);
    } catch (err) {
        console.error('OpenRouter proxy error:', err);
        return res.status(500).json({ error: 'Proxy error', message: String(err.message) });
    }
}