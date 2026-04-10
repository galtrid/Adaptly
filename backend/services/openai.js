const API_KEY = process.env.GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

async function askAI(prompt) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            temperature: 0.2, // 🔥 less randomness
            messages: [
                {
                    role: "system",
                    content: `
You are a strict JSON generator.

RULES:
- ONLY return valid JSON
- NO explanation
- NO markdown
- NO text outside JSON
- MUST be parsable by JSON.parse()
`
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        })
    });

    const data = await res.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.choices[0].message.content;
}

module.exports = askAI;