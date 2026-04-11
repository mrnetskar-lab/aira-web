import 'dotenv/config';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

export function ensureOpenAI() {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is missing. Add it to .env');
  }

  return openai;
}
