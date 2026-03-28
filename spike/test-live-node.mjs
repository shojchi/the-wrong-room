/**
 * Quick diagnostic: list available models and test with correct names
 */
import { GoogleGenAI, Modality } from '@google/genai';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '.env.local'), 'utf-8');
const apiKey = envContent.match(/GEMINI_API_KEY=(.*)/)?.[1]?.trim();
const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  console.log('📋 Listing available models with "live" support...\n');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await response.json();
    
    const liveModels = data.models?.filter(m => 
      m.name.includes('live') || 
      m.supportedGenerationMethods?.includes('bidiGenerateContent')
    ) || [];
    
    if (liveModels.length === 0) {
      console.log('No live models found. Listing all models:');
      for (const m of (data.models || [])) {
        console.log(`  ${m.name} → methods: ${m.supportedGenerationMethods?.join(', ')}`);
      }
    } else {
      for (const m of liveModels) {
        console.log(`  ✅ ${m.name}`);
        console.log(`     Display: ${m.displayName}`);
        console.log(`     Methods: ${m.supportedGenerationMethods?.join(', ')}`);
        console.log();
      }
    }
    
    return liveModels;
  } catch (err) {
    console.error('❌ Failed to list models:', err.message);
    return [];
  }
}

async function testLiveWithModel(modelName) {
  console.log(`\n🧪 Testing Live API with model: ${modelName}`);
  console.log('─'.repeat(50));

  try {
    let responseText = '';
    let hasAudio = false;
    let turnComplete = false;
    let errorMsg = null;

    // Try TEXT first
    console.log('  Trying TEXT modality...');
    const session = await ai.live.connect({
      model: modelName,
      config: {
        responseModalities: [Modality.TEXT],
      },
      callbacks: {
        onopen() { console.log('  ✅ Connected (TEXT mode)'); },
        onmessage(msg) {
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.text) { responseText += part.text; process.stdout.write(part.text); }
              if (part.inlineData) hasAudio = true;
            }
          }
          if (msg.serverContent?.turnComplete) turnComplete = true;
        },
        onerror(e) { errorMsg = e.message; },
        onclose(e) { 
          if (e.reason && e.reason !== '' && !turnComplete) {
            console.log('\n  ⚠️ Closed with:', e.reason);
          }
        },
      },
    });

    session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: 'Say "hello world" and nothing else.' }] }],
      turnComplete: true,
    });

    const start = Date.now();
    while (!turnComplete && !errorMsg && Date.now() - start < 15000) {
      await new Promise(r => setTimeout(r, 200));
    }

    if (responseText) {
      console.log(`\n  ✅ TEXT works! Response: "${responseText}"`);
      session.close();
      return { model: modelName, mode: 'TEXT', success: true };
    }

    session.close();
    
    // TEXT failed, try AUDIO
    console.log('\n  TEXT failed, trying AUDIO modality...');
    responseText = '';
    hasAudio = false;
    turnComplete = false;
    errorMsg = null;

    const session2 = await ai.live.connect({
      model: modelName,
      config: {
        responseModalities: [Modality.AUDIO],
      },
      callbacks: {
        onopen() { console.log('  ✅ Connected (AUDIO mode)'); },
        onmessage(msg) {
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData) { if (!hasAudio) console.log('  🔊 Audio received'); hasAudio = true; }
              if (part.text) { responseText += part.text; }
            }
          }
          if (msg.serverContent?.turnComplete) turnComplete = true;
        },
        onerror(e) { errorMsg = e.message; },
        onclose(e) { 
          if (e.reason && !turnComplete) console.log('  ⚠️ Closed with:', e.reason);
        },
      },
    });

    session2.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: 'Say "hello world" and nothing else.' }] }],
      turnComplete: true,
    });

    const start2 = Date.now();
    while (!turnComplete && !errorMsg && Date.now() - start2 < 15000) {
      await new Promise(r => setTimeout(r, 200));
    }

    if (hasAudio) {
      console.log(`  ✅ AUDIO works!`);
      session2.close();
      return { model: modelName, mode: 'AUDIO', success: true };
    }
    
    session2.close();
    console.log('  ❌ Both TEXT and AUDIO failed');
    return { model: modelName, mode: 'none', success: false };
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return { model: modelName, mode: 'none', success: false };
  }
}

async function main() {
  console.log('🔍 Gemini Live API — Model Discovery & Test\n');
  
  const models = await listModels();
  
  // Also try known model names
  const candidates = new Set([
    ...models.map(m => m.name.replace('models/', '')),
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-live-001', 
    'gemini-2.5-flash-preview-native-audio-dialog',
    'gemini-3.1-flash-live-preview',
  ]);
  
  console.log(`\n📋 Will test ${candidates.size} model candidates\n`);

  const results = [];
  for (const model of candidates) {
    const r = await testLiveWithModel(model);
    results.push(r);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 FINAL RESULTS');
  console.log('═'.repeat(50));
  for (const r of results) {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.model} → ${r.mode}`);
  }
  
  const working = results.filter(r => r.success);
  if (working.length > 0) {
    const textMatch = working.find(r => r.mode === 'TEXT');
    const best = textMatch || working[0];
    console.log(`\n🎯 BEST OPTION: ${best.model} (${best.mode} modality)`);
  } else {
    console.log('\n🎯 No Live API model worked — use Standard API streamGenerateContent');
  }
}

main().catch(console.error);
