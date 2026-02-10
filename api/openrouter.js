export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    const apiKey = process.env.OPENROUTER_KEY;

    if (!apiKey) {
        console.error("OPENROUTER_KEY no definida");
        return res.status(500).json({ error: "API key no configurada" });
    }

    const { mensaje } = req.body;

    if (!mensaje) {
        return res.status(400).json({ error: "Mensaje vacío" });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://gym-mfwult25m-julio-emilios-projects.vercel.app",
            "X-Title": "GymPWA"
        },
        body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct",
            messages: [
            {
                role: "system",
                content: "Eres un asistente experto solo en gimnasio. Si la pregunta no es de gimnasio, responde que no puedes."
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
        console.error("OpenRouter error:", data);
        return res.status(response.status).json(data);
        }

        res.status(200).json({
        respuesta: data.choices[0].message.content
        });

    } catch (error) {
        console.error("Error backend:", error);
        res.status(500).json({ error: "Error interno", message: error.message });
    }
}
