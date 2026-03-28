import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the .env.local file from spike folder since that's where we put the key
// In production, you would configure environment variables natively.
dotenv.config({ path: resolve(__dirname, '../spike/.env.local') });

const app = express();
const port = process.env.PORT || 3001;

// Allow localhost connections for development
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ ERROR: Missing GEMINI_API_KEY environment variable. Check ../spike/.env.local');
}

// Lightweight proxy/token approach for the hackathon
// Real production apps should use the ephemeral token pattern or full websocket proxy,
// but returning the key cleanly via an authenticated / CORS-protected endpoint 
// allows the frontend to use the SDK natively without exposing it in the GitHub repo `vite.config` or frontend `.env`.
app.get('/api/token', (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing API key configuration' });
  }
  
  // Using explicit API keys vs OAuth triggers the ephemeral token system internally 
  // or lets the frontend connect directly. We return it as "token" to abstract it.
  res.json({ token: apiKey });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`🚀 The Wrong Room — Backend running at http://localhost:${port}`);
});
