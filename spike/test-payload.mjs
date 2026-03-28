import { GoogleGenAI, Modality } from '@google/genai';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '.env.local'), 'utf-8');
const apiKey = envContent.match(/GEMINI_API_KEY=(.*)/)?.[1]?.trim();
const ai = new GoogleGenAI({ apiKey });

async function testAudioPayload() {
  console.log('Testing gemini-2.5-flash-native-audio-latest payload...');
  let hasText = false;
  let hasAudio = false;
  
  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-latest',
    config: {
      responseModalities: [Modality.AUDIO],
    },
    callbacks: {
      onopen() { console.log('Connected.'); },
      onmessage(msg) {
        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.text) {
              console.log('GOT TEXT:', part.text);
              hasText = true;
            }
            if (part.inlineData) {
              hasAudio = true;
            }
          }
        }
        if (msg.serverContent?.turnComplete) {
          console.log('\nTurn complete. Audio:', hasAudio, 'Text:', hasText);
          session.close();
        }
      },
      onerror(e) { console.error('Error:', e.message); },
    }
  });

  session.sendClientContent({
    turns: [{ role: 'user', parts: [{ text: 'Say "hello world" and nothing else.' }] }],
    turnComplete: true,
  });
}

testAudioPayload().catch(console.error);
