require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for Anthropic API (keeps API key server-side)
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Anthropic proxy error:', err);
    res.status(500).json({ error: 'Failed to reach AI service.' });
  }
});

// Serve index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'UCConnect2.0.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`UCConnect running at http://localhost:${PORT}`);
});
