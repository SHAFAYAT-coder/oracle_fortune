require('dotenv').config();
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const GROK_KEY = process.env.XAI_API_KEY;
const MODEL = 'grok-3-mini';
const API_URL = 'https://api.x.ai/v1/chat/completions';

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    if (!GROK_KEY) {
        return res.status(500).json({ error: { message: 'Server has no XAI_API_KEY set. Add it to .env.' } });
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
        const grokRes = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROK_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'system', content: system.slice(0, 4000) }, ...cleanMessages],
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        const data = await grokRes.json();
        res.status(grokRes.status).json(data);
    } catch (err) {
        res.status(502).json({ error: { message: 'Could not reach Grok. Check your internet connection.' } });
    }
});

app.listen(PORT, () => {
    console.log(`Oracle game running at http://localhost:${PORT}`);
});
