export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    if (!process.env.OPENROUTER_KEY) {
        return res.status(500).json({ error: "OPENROUTER_KEY no configurada" });
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
            "X-Title": "GymPWA"
        },
        body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct",
            messages: [
            {
                role: "system",
                content: `
                Eres un asistente experto EXCLUSIVAMENTE en gimnasio.
                Solo respondes preguntas sobre entrenamiento, rutinas,
                ejercicios, series, repeticiones, técnica y descanso.

                Si la pregunta no es de gimnasio, responde EXACTAMENTE:
                "No puedo responder a eso. Solo puedo ayudarte con temas de entrenamiento y gimnasio."
                `
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

        let content = data.choices?.[0]?.message?.content || "";

        // Limpiar <think> si el modelo lo usa
        if (content.includes("</think>")) {
        content = content.split("</think>").pop().trim();
        }

        res.status(200).json({ respuesta: content });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error interno", message: err.message });
    }
}
