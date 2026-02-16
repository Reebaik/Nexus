import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath, override: true });

// Fallback parser for specific keys if dotenv failed to populate them (handles edge cases)
const ensureKeys = (keys) => {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length === 0) return { filled: [], from: 'dotenv' };
  
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    // Try to use dotenv.parse first as it handles quotes/multiline better
    const parsed = dotenv.parse(raw);
    let filled = [];
    
    // 1. Try from dotenv.parse result
    for (const key of missing) {
      if (parsed[key]) {
        process.env[key] = parsed[key];
        filled.push(key);
      }
    }
    
    // 2. If still missing, try manual regex (aggressive)
    const stillMissing = keys.filter(k => !process.env[k]);
    if (stillMissing.length > 0) {
      const lines = raw.split(/\r?\n/);
      console.log('[env] debug: raw file lines found:', lines.length);
      
      for (const line of lines) {
        // Match key=value, ignoring leading/trailing whitespace
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=(.*)$/);
        if (m) {
          const key = m[1];
          let val = m[2].trim();
          // Remove quotes if present
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          
          if (stillMissing.includes(key)) {
            process.env[key] = val;
            filled.push(key);
            console.log(`[env] debug: manually extracted ${key}`);
          }
        }
      }
    }
    
    return { filled, from: 'fallback' };
  } catch (err) {
    console.error('[env] fallback error:', err);
    return { filled: [], from: 'error' };
  }
};

const checked = ensureKeys(['GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY_PATH', 'GITHUB_WEBHOOK_SECRET']);

try {
  const flags = {
    hasAppId: Boolean(process.env.GITHUB_APP_ID),
    hasPrivKeyPath: Boolean(process.env.GITHUB_PRIVATE_KEY_PATH),
    hasWebhookSecret: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
  };
  console.log('[env] loaded .env at', envPath, flags, checked);
} catch {}

export default dotenv;
