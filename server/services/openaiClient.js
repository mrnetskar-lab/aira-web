import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from project root even when the process is started from another cwd.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fallback to default dotenv behavior for environments that rely on process cwd.
dotenv.config();

// ─── Provider config ──────────────────────────────────────────────────────────
// Priority: OPENROUTER → GROQ → TOGETHER → OPENAI
// Set the matching API key in .env to activate a provider.
// Override model by setting AI_MODEL in .env (optional).
// Per-character models: LUCY_MODEL, SAM_MODEL, ANGIE_MODEL (OpenRouter model IDs).

const PROVIDERS = [
  {
    name: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'nousresearch/hermes-3-llama-3.1-70b',
    defaultHeaders: {
      'HTTP-Referer': 'https://aira.app',
      'X-Title': 'AIRA',
    },
  },
  {
    name: 'groq',
    envKey: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    name: 'together',
    envKey: 'TOGETHER_API_KEY',
    baseURL: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  },
  {
    name: 'openai',
    envKey: 'OPENAI_API_KEY',
    baseURL: null,
    defaultModel: 'gpt-4.1-mini',
  },
];

// Per-character model overrides (OpenRouter model IDs).
// Falls back to activeModel if not set.
const CHARACTER_MODELS = {
  Lucy:  process.env.LUCY_MODEL  || null,
  Sam:   process.env.SAM_MODEL   || null,
  Angie: process.env.ANGIE_MODEL || null,
};

function resolveProvider() {
  for (const provider of PROVIDERS) {
    const key = process.env[provider.envKey];
    if (key) {
      return { provider, apiKey: key };
    }
  }
  return null;
}

const resolved = resolveProvider();

function buildClient(provider, apiKey) {
  const opts = { apiKey };
  if (provider.baseURL) opts.baseURL = provider.baseURL;
  if (provider.defaultHeaders) opts.defaultHeaders = provider.defaultHeaders;
  return new OpenAI(opts);
}

export function getModelForCharacter(characterName) {
  return CHARACTER_MODELS[characterName] || activeModel;
}

export const openai = resolved
  ? buildClient(resolved.provider, resolved.apiKey)
  : null;

export const activeProvider = resolved?.provider?.name ?? null;
export const activeModel =
  process.env.AI_MODEL ||
  resolved?.provider?.defaultModel ||
  'gpt-4.1-mini';

export function ensureOpenAI() {
  if (!openai) {
    throw new Error(
      'No AI API key found. Add GROQ_API_KEY, TOGETHER_API_KEY, or OPENAI_API_KEY to .env'
    );
  }
  return openai;
}

// Log active provider on startup (server-side only).
if (resolved) {
  console.log(`[AI] Provider: ${resolved.provider.name} | Model: ${activeModel}`);
} else {
  console.warn('[AI] No API key found — AI calls will fail until a key is set in .env');
}
