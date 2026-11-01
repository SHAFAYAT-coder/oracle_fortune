require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_KEY = process.env.GROQ_API_KEY;
const MODEL = 'openai/gpt-oss-120b';

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    if (!GROQ_KEY) {
        return res.status(500).json({ error: { message: 'Server has no GROQ_API_KEY set.' } });
    }

    const { system, messages } = req.body || {};
    if (typeof system !== 'string' || !Array.isArray(messages)) {
        return res.status(400).json({ error: { message: 'Bad request.' } });
    }

    // Keep only recent, valid messages and limit their size
    const cleanMessages = messages
        .slice(-40)
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'system', content: system.slice(0, 4000) }, ...cleanMessages],
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        const data = await groqRes.json();
        res.status(groqRes.status).json(data);
    } catch (err) {
        res.status(502).json({ error: { message: 'Could not reach Groq. Check your internet connection.' } });
    }
});

app.listen(PORT, () => {
    console.log(`Oracle game running at http://localhost:${PORT}`);
});