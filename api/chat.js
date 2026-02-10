export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }

    const { mensaje } = req.body;

    if (!mensaje) {
        return res.status(400).json({ error: "Mensaje vacío" });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://gym-pwa-murex.vercel.app",
            "X-Title": "Gym PWA"
        },
        body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct",
            messages: [
            {
                role: "system",
                content: "Eres un asistente experto en gimnasio. Solo respondes preguntas sobre entrenamiento, rutinas, ejercicios, series, repeticiones, descanso y nutrición básica. Si te preguntan otra cosa, responde: 'Solo puedo ayudarte con temas de gimnasio.'"
            },
            {
                role: "user",
                content: mensaje
            }
            ]
        })
        });

        const data = await response.json();

        if (!response.ok) {
        return res.status(response.status).json(data);
        }

        res.status(200).json({
        respuesta: data.choices[0].message.content
        });

    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
    }
}
