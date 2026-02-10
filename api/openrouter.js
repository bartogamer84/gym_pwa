// api/openrouter.js
export default async function handler(req, res) {
    // CORS headers - permitir requests desde cualquier origen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight requests (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo permite POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST, OPTIONS');
        return res.status(405).json({ error: 'Only POST allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // Verificar que la clave esté configurada
        if (!process.env.OPENROUTER_KEY) {
            console.error('ERROR: OPENROUTER_KEY no está configurada');
            return res.status(500).json({ error: 'API key not configured in Vercel' });
        }

        console.log('Proxy: Forwarding request to OpenRouter with model:', body.model);

        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://gym-pwa-murex.vercel.app',
                'X-Title': 'GymPWA'
            },
            body: JSON.stringify(body)
        });

        const text = await resp.text();
        
        if (!resp.ok) {
            console.error('OpenRouter error response:', resp.status, text.substring(0, 200));
        } else {
            console.log('OpenRouter success: status', resp.status);
        }

        res.status(resp.status);
        res.setHeader('Content-Type', resp.headers.get('content-type') || 'application/json');
        return res.send(text);
    } catch (err) {
        console.error('Proxy error:', err.message);
        return res.status(500).json({ error: 'Proxy error', message: err.message });
    }
}