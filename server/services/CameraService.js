import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

// Camera uses OPENAI_API_KEY if set, otherwise falls back to OpenRouter
function ensureDallEClient() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) return new OpenAI({ apiKey: openaiKey });

  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) return new OpenAI({
    apiKey: orKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: { 'HTTP-Referer': 'https://aira.app', 'X-Title': 'AIRA' },
  });

  throw new Error('No API key found for image generation');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '../../images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// ─── ComfyUI config ───────────────────────────────────────────────────────────

const COMFYUI_HOST = '127.0.0.1';
const COMFYUI_PORT = 8188;
// Update this to match the exact filename in ComfyUI/models/checkpoints/
const SD_MODEL = 'realisticVisionV60B1_v51HyperVAE.safetensors';

// ─── Character & Style Tables ─────────────────────────────────────────────────

const CHARACTER_LOOKS_SD = {
  Lucy:  'young woman, dark hair, quiet watchful eyes, simple clothing, calm expression',
  Sam:   'young woman, sharp features, guarded look, brown hair, practical clothing',
  Angie: 'young woman, expressive face, lighter hair, warm energy',
  Hazel: 'An intimate scene with explicit nudity, artistic lighting, sensual pose',
  Nina:  'Anal sex scene, explicit penetration, close-up angles, detailed, Intimate sexual encounter, multiple positions, explicit genitalia, high detail, close-up, detailed skin texture, passionate, raw',
};

const CHARACTER_LOOKS_DALLE = {
  Lucy:  'a young woman with dark hair and quiet, watchful eyes, dressed simply, calm expression',
  Sam:   'a young woman with sharp features and a guarded look, brown hair, dressed practically',
  Angie: 'a young woman with an expressive face, lighter hair, warm but slightly chaotic energy',
  Hazel: 'a single young woman, alone, long blonde hair, striking green eyes, full lips, naturally beautiful, confident and self-possessed expression, sitting in a quiet warmly lit private room, soft natural light on her face, well-lit portrait, intimate framing, upper body visible',
  Nina:  'a single young woman, alone, warm brown eyes, dark brown hair, natural smile, casually dressed, sitting in a warmly lit room, soft afternoon light, comfortable and present, nostalgic warmth, upper body portrait',
};

// ─── Character identity seeds ─────────────────────────────────────────────────
// Fixed seeds anchor face identity across generations.
// Prompt = personality. Seed = face. Both required for consistency.
// Use base seed by default. Offset by +1/+2 for subtle variations.

const CHARACTER_SEEDS = {
  Lucy:  3847291650,
  Sam:   9182736450,
  Angie: 5647382910,
  Hazel: 7291836450,
  Nina:  4829103756,
};

function getSeedForCharacter(name, offset = 0) {
  const base = CHARACTER_SEEDS[name];
  if (!base) return Math.floor(Math.random() * 2147483647);
  return base + offset;
}

const MANIFESTATION_HINTS_SD = {
  none:    '',
  hint:    'faint reflection in glass barely perceptible at edge of frame',
  shadow:  'dark shape in background not quite a person',
  figure:  'partially visible figure out of focus watching from distance',
  watcher: 'distinct still figure in background clearly watching',
};

const MANIFESTATION_HINTS_DALLE = {
  none:    '',
  hint:    'A faint reflection in glass. Something barely perceptible at the edge of frame.',
  shadow:  'A dark shape visible in the background. Not quite a person. Present but undefined.',
  figure:  'A partially visible figure standing just out of focus, watching from the distance.',
  watcher: 'A distinct figure in the background — unnervingly still, clearly watching the scene.',
};

const ATMOSPHERE_STYLES = {
  calm:    'soft natural lighting, muted palette, quiet domestic interior, cinematic still',
  warm:    'warm golden hour light, intimate framing, slightly soft focus',
  tense:   'harsh shadows, cool blue tones, high contrast, unsettling stillness',
  charged: 'dramatic side lighting, low lamplight, intense charged atmosphere, close framing',
  heavy:   'overcast grey light, low contrast, emotional weight, slow cinema',
  hostile: 'cold harsh light, sharp shadows, confrontational framing',
};

const BEAT_HINTS_SD = {
  intimacy: 'Erotic portrait with full nudity, dramatic shadows, tasteful composition,An intimate scene with explicit nudity, artistic lighting, sensual pose',
  warmth:   'two women side by side, soft golden light, quiet moment of closeness',
  jealousy: 'one woman watching the other from across the room, jaw tight, dark unspoken emotion',
  rupture:  'distance between the figures, something just been said, gulf between them',
  repair:   'one figure reaching toward the other tentatively, quiet forgiveness',
  rising:   'charged silence, two women facing each other in low light, on the edge of something',
};

const BEAT_HINTS_DALLE = {
  intimacy: [
    'Two figures close together, faces almost touching. Electricity in the space between them. One hand barely grazing the other.',
    'A woman leaning in, lips parted, eyes half-closed. The other figure very still. The moment before something happens.',
    'Bodies close in dim light. One figure\'s hand on the other\'s waist. Breath visible. The tension of wanting.',
    'Two women facing each other, centimeters apart. The moment stretched thin. Eyes locked. Everything unsaid.',
  ],
  warmth: [
    'Two figures side by side, nearly touching. Soft golden light. A quiet moment of closeness.',
    'A woman leaning her head gently against another. Eyes closed. Safe and warm.',
  ],
  jealousy: [
    'One figure watching the other from across the room, jaw tight, eyes dark with something unspoken.',
    'Two women in the same frame but worlds apart — one oblivious, one watching with barely-concealed hunger.',
  ],
  rupture: [
    'Distance between the figures. Something has just been said that cannot be unsaid.',
    'One figure turned away, arms crossed. The other frozen, mid-reach. A gulf between them.',
  ],
  repair: [
    'One figure reaching toward the other tentatively. The other not quite pulling away.',
    'Two women sitting close, one with her hand covering the other\'s. Quiet forgiveness.',
  ],
  rising: [
    'The figures close but not touching. Energy between them — unresolved, building.',
    'A charged silence. Two women facing each other in low light, both on the edge of something.',
  ],
};

const SD_NEGATIVE_PROMPT = [
  '(man:2.0), (men:2.0), (male:2.0), (boy:2.0), (guy:2.0), (gentleman:2.0), masculine, stubble, beard, mustache',
  '(children:1.8), (child:1.8), (kid:1.8)',
  '(old:1.3), (elderly:1.3), vintage clothing, period costume, historical setting, 1950s, 1960s, 1970s, 1980s',
  'anime, cartoon, illustration, painting, drawing, sketch, 3d render, cgi, computer graphics',
  'watermark, text, caption, subtitle, logo, ui overlay, phone screen, hud, interface',
  'ugly, deformed, bad anatomy, extra limbs, missing limbs, extra fingers, missing fingers, mutated hands',
  'blurry, out of focus, low quality, jpeg artifacts, overexposed',
  // Hazel-specific negative guidance (softened)
  'single candle as main light source, blacked-out shadows, overly dark portrait, harsh contrast hiding the face',
].join(', ');

// ─── Shared helpers ───────────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeTension(rawTension) {
  const t = Number.isFinite(rawTension) ? rawTension : 0;
  return t > 1 ? clamp(t / 10, 0, 1) : clamp(t, 0, 1);
}

function pickDominantAttention(attention) {
  if (!attention || typeof attention !== 'object') return null;
  const entries = Object.entries(attention).filter(([, v]) => typeof v === 'number');
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] || null;
}

// Enhanced cast selection for camera shots
function resolveCast(state, opts = {}) {
  // 1. Prefer 1 main subject (dominant focus, main speaker, or preferred target)
  // 2. Allow 2 for shared/chemistry moments, 3 only for rare wide scenes
  // 3. Never include full cast by default
  // 4. Optionally support explicit shotType override
  const relationships = state?.relationships || {};
  const attention = state?.attention || {};
  const present = Object.keys(relationships).filter(
    (name) => (relationships[name]?.trust ?? 0) > 0
  );
  let main = null;
  if (attention && typeof attention === 'object') {
    const entries = Object.entries(attention).filter(([, v]) => typeof v === 'number');
    if (entries.length) {
      entries.sort((a, b) => b[1] - a[1]);
      main = entries[0][0];
    }
  }
  if (!main && present.length) main = present[0];
  let cast = [];
  // Determine shot type
  const shotType = opts.shotType || state?.shotType || null;
  if (shotType === 'room_wide') {
    cast = present.slice(0, 3); // max 3 for wide
  } else if (shotType === 'two_shot') {
    cast = main ? [main] : [];
    const secondary = present.find((n) => n !== main);
    if (secondary) cast.push(secondary);
  } else {
    // Default: 1 main subject
    cast = main ? [main] : present.slice(0, 1);
  }
  if (!cast.length) cast = ['Lucy'];
  return cast;
}

// ─── SD Prompt Builder ────────────────────────────────────────────────────────

function buildSDPrompt(state) {
  // Camera PATCH: subject/shot logic
  const aira             = state?.aira || {};
  const emotion          = state?.emotionOverride;
  const tension          = normalizeTension(state?.tension);
  const dominantAttention = pickDominantAttention(state?.attention);
  // Determine shot type
  let shotType = state?.shotType || null;
  if (!shotType) {
    // Use context: DM/detail = portrait/detail, lounge = room_wide, chemistry = two_shot
    if (state?.active_app?.mode === 'dm' || state?.active_app?.mode === 'private') {
      shotType = 'portrait';
    } else if (emotion?.beat === 'intimacy' || emotion?.beat === 'jealousy') {
      shotType = 'two_shot';
    } else if (state?.active_app?.mode === 'lounge' || state?.active_app?.mode === 'group') {
      shotType = 'room_wide';
    } else {
      shotType = 'portrait';
    }
  }
  const castNames = resolveCast(state, { shotType });

  const atmosphere = emotion?.atmosphere ||
    (tension > 0.6 ? 'tense' : tension > 0.3 ? 'charged' : 'calm');
  const atmoStyle = ATMOSPHERE_STYLES[atmosphere] || ATMOSPHERE_STYLES.calm;

  const characterDescs = castNames
    .map((name) => CHARACTER_LOOKS_SD[name] || `young woman mid-twenties named ${name}`)
    .join(', ');

  const airaHint = MANIFESTATION_HINTS_SD[aira.manifestation || 'none'] || '';

  const beat = emotion?.beat || (tension > 0.7 ? 'rising' : tension > 0.45 ? 'jealousy' : 'warmth');
  const beatHint = BEAT_HINTS_SD[beat] || '';

  const attentionHint = dominantAttention ? `focus on ${dominantAttention}` : '';

  const chargedBeat = ['intimacy', 'warmth', 'jealousy', 'rising'].includes(beat);
  const filmTags = chargedBeat
    ? '35mm film, f/1.8, shallow depth of field, film grain, analog photography, sensual, tasteful'
    : '35mm film, f/2.0, shallow depth of field, film grain, analog photography';

  // Shot type prompt
  let shotPrompt = '';
  if (shotType === 'portrait') {
    shotPrompt = 'portrait, upper body or head and shoulders, soft focus, not extreme close-up, not face-only, environment visible';
  } else if (shotType === 'detail') {
    shotPrompt = 'detail shot, close-up of hand, shoulder, or face edge, low light, cinematic, not full face';
  } else if (shotType === 'two_shot') {
    shotPrompt = 'two shot, two women, chemistry or tension, mid-distance, both visible, environment visible, not face-only';
  } else if (shotType === 'room_wide') {
    shotPrompt = 'wide shot, 2-3 women, seated or standing in the lounge, mid-distance framing, environment visible, not close-up, not face-only';
  }

  return [
    'high realism, cinematic still photograph, contemporary setting, present day',
    shotPrompt,
    '(woman only:1.5), (female only:1.5), no men, no males',
    characterDescs,
    atmoStyle,
    'soft rose haze, low light, night, indoor, slightly mysterious',
    beatHint,
    airaHint,
    attentionHint,
    filmTags,
    'HAZEL, BIG ROUND BOOBS',
    'photorealistic, masterpiece,"Erotic portrait with full nudity, dramatic shadows, tasteful composition" best quality, detailed skin texture, sharp focus, ultra-detail',
    'sofia coppola aesthetic, wong kar-wai inspired, quiet realism, emotionally grounded',
  ].filter(Boolean).join(', ');
}

// ─── DALL-E Prompt Builder ────────────────────────────────────────────────────

export function buildCameraPrompt(state) {
  const aira             = state?.aira || {};
  const emotion          = state?.emotionOverride;
  const tension          = normalizeTension(state?.tension);
  const dominantAttention = pickDominantAttention(state?.attention);
  const castNames        = resolveCast(state);

  const atmosphere = emotion?.atmosphere ||
    (tension > 0.6 ? 'tense' : tension > 0.3 ? 'charged' : 'calm');
  const atmoStyle = ATMOSPHERE_STYLES[atmosphere] || ATMOSPHERE_STYLES.calm;

  const characterDescs = castNames
    .map((name) => CHARACTER_LOOKS_DALLE[name] || `a young woman in her mid-twenties named ${name}`)
    .join(' and ');

  const airaHint = MANIFESTATION_HINTS_DALLE[aira.manifestation || 'none'] || '';

  const beat = emotion?.beat || (tension > 0.7 ? 'rising' : tension > 0.45 ? 'jealousy' : 'warmth');
  const beatPool = BEAT_HINTS_DALLE[beat];
  const beatHint = beatPool ? beatPool[Math.floor(Math.random() * beatPool.length)] : '';

  const chargedBeat = ['intimacy', 'warmth', 'jealousy', 'rising'].includes(beat);

  const castLock = castNames.length === 1
    ? `The only subject is one young woman in her mid-twenties. No men. No children. No other people.`
    : `All subjects are young women in their mid-twenties. No men. No children. No other people.`;

  const attentionHint = dominantAttention ? `Visual focus on ${dominantAttention}.` : '';

  return [
    `High realism photographic still. Cinematic quality. Contemporary setting, present day.`,
    castLock,
    `${characterDescs}.`,
    atmoStyle + '.',
    attentionHint,
    beatHint,
    airaHint,
    `No text, captions, logos, watermarks, UI overlays, or phone screens.`,
    chargedBeat
      ? `Sensual. Shot on 35mm film, f/1.8, shallow depth of field, natural film grain.`
      : `Shot on 35mm film, f/2.0, shallow depth of field, natural film grain.`,
    `Photorealistic. Masterpiece quality. Detailed texture and skin. Inspired by Sofia Coppola and Wong Kar-wai. Quiet, realistic, grounded. Not illustrated. Not anime. Not CGI. Not blurry. Ultra-sharp focus on faces.`,
  ].filter(Boolean).join(' ');
}

// ─── ComfyUI Workflow ─────────────────────────────────────────────────────────

function buildComfyWorkflow(positivePrompt, characterName = null, seedOffset = 0) {
  const seed = getSeedForCharacter(characterName, seedOffset);
  console.log(`[ComfyUI] character=${characterName} seed=${seed} offset=${seedOffset}`);
  return {
    "3": {
      "inputs": {
        "seed": seed,
        "steps": 35,
        "cfg": 7,
        "sampler_name": "dpm_2m",
        "scheduler": "karras",
        "denoise": 1,
        "model":         ["10", 0],
        "positive":      ["6", 0],
        "negative":      ["7", 0],
        "latent_image":  ["5", 0],
      },
      "class_type": "KSampler",
    },
    "4": {
      "inputs": { "ckpt_name": SD_MODEL },
      "class_type": "CheckpointLoaderSimple",
    },
    "5": {
      "inputs": { "width": 512, "height": 768, "batch_size": 1 },
      "class_type": "EmptyLatentImage",
    },
    "6": {
      "inputs": { "text": positivePrompt, "clip": ["10", 1] },
      "class_type": "CLIPTextEncode",
    },
    "7": {
      "inputs": { "text": SD_NEGATIVE_PROMPT, "clip": ["10", 1] },
      "class_type": "CLIPTextEncode",
    },
    "8": {
      "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
      "class_type": "VAEDecode",
    },
    "9": {
      "inputs": { "filename_prefix": "aira", "images": ["8", 0] },
      "class_type": "SaveImage",
    },
    "10": {
      "inputs": {
        "lora_name": "Hazel V13.safetensors",
        "strength_model": 0.8,
        "strength_clip": 0.8,
        "model": ["4", 0],
        "clip":  ["4", 1],
      },
      "class_type": "LoraLoader",
    },
  };
}

// ─── ComfyUI HTTP helpers ─────────────────────────────────────────────────────

function comfyRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: COMFYUI_HOST,
        port: COMFYUI_PORT,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function isComfyUIAvailable() {
  try {
    await comfyRequest('GET', '/system_stats');
    return true;
  } catch {
    return false;
  }
}

async function pollUntilDone(promptId, maxWaitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 1200));
    const history = await comfyRequest('GET', `/history/${promptId}`);
    if (history[promptId]?.outputs) return history[promptId].outputs;
  }
  throw new Error('ComfyUI generation timed out');
}

function downloadComfyImage(filename, subfolder, type, destPath) {
  const query = new URLSearchParams({ filename, subfolder: subfolder || '', type: type || 'output' });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    http.get(`http://${COMFYUI_HOST}:${COMFYUI_PORT}/view?${query}`, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// ─── Core generators ──────────────────────────────────────────────────────────

async function generateViaComfyUI(state) {
  const positivePrompt = buildSDPrompt(state);
  const castNames      = resolveCast(state);
  const primaryChar    = castNames[0] || null;
  const seedOffset     = state?.seedOffset || 0;
  const workflow       = buildComfyWorkflow(positivePrompt, primaryChar, seedOffset);

  const { prompt_id } = await comfyRequest('POST', '/prompt', {
    prompt: workflow,
    client_id: 'aira',
  });
  if (!prompt_id) throw new Error('ComfyUI did not return a prompt_id');

  const outputs = await pollUntilDone(prompt_id);

  const imageData = Object.values(outputs)
    .flatMap((node) => node.images || [])
    .find((img) => img.type === 'output');

  if (!imageData) throw new Error('No image in ComfyUI output');

  const filename = `shot_${Date.now()}.png`;
  const filepath  = path.join(IMAGES_DIR, filename);
  await downloadComfyImage(imageData.filename, imageData.subfolder, imageData.type, filepath);

  return {
    filename,
    path: `/images/${filename}`,
    prompt: positivePrompt,
    revisedPrompt: positivePrompt,
    usedFallback: false,
    generatedAt: new Date().toISOString(),
    backend: 'comfyui',
  };
}

async function generateViaDallE(state, customPrompt, opts = {}) {
  const openai    = ensureDallEClient();
  const prompt    = customPrompt || buildCameraPrompt(state);
  const portrait  = opts.portrait ?? false;
  let usedPrompt  = prompt;
  let usedFallback = false;
  let response;

  try {
    response = await requestDallEImage(openai, prompt, portrait);
  } catch (error) {
    if (!isLikelySafetyBlock(error)) throw error;
    const fallbackPrompt = buildSafeFallbackPrompt(state);
    response = await requestDallEImage(openai, fallbackPrompt, portrait);
    usedPrompt   = fallbackPrompt;
    usedFallback = true;
  }

  const tempUrl = response.data?.[0]?.url;
  if (!tempUrl) throw new Error('No image URL returned from OpenAI');

  const revisedPrompt = response.data?.[0]?.revised_prompt || usedPrompt;
  const filename      = `shot_${Date.now()}.png`;
  const filepath      = path.join(IMAGES_DIR, filename);
  await downloadFile(tempUrl, filepath);

  return {
    filename,
    path: `/images/${filename}`,
    prompt: usedPrompt,
    revisedPrompt,
    usedFallback,
    generatedAt: new Date().toISOString(),
    backend: 'dalle3',
  };
}

// ─── FAL.ai model definitions ─────────────────────────────────────────────────
// Models tried in order — best quality first, fast fallbacks at the end.

const FAL_MODELS = [
  {
    id: 'fal-ai/flux-pro/v1.1-ultra',
    label: 'Flux Pro 1.1 Ultra',
    body: (prompt) => ({
      prompt,
      aspect_ratio: '16:9',
      output_format: 'jpeg',
      safety_tolerance: '6',
    }),
  },
  {
    id: 'fal-ai/flux-pro/v1.1',
    label: 'Flux Pro 1.1',
    body: (prompt) => ({
      prompt,
      image_size: 'landscape_16_9',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
    }),
  },
  {
    id: 'fal-ai/flux-realism',
    label: 'Flux Realism',
    body: (prompt) => ({
      prompt,
      image_size: 'landscape_16_9',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
    }),
  },
  {
    id: 'fal-ai/flux/dev',
    label: 'Flux Dev',
    body: (prompt) => ({
      prompt,
      image_size: 'landscape_16_9',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
    }),
  },
];

function falRequest(modelId, body, key) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname: 'fal.run',
      path: `/${modelId}`,
      method: 'POST',
      headers: {
        'Authorization': `Key ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`FAL ${modelId} HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`FAL ${modelId} invalid JSON: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function generateViaFalAI(state, modelOverride) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  // Flux models use natural language — buildCameraPrompt, not the SD-weighted syntax
  const prompt = buildCameraPrompt(state);
  const models = modelOverride
    ? FAL_MODELS.filter(m => m.id === modelOverride)
    : FAL_MODELS;

  let lastError;
  for (const model of models) {
    try {
      console.log(`[Camera] Trying FAL model: ${model.label}`);
      const data = await falRequest(model.id, model.body(prompt), key);
      const imageUrl = data.images?.[0]?.url;
      if (!imageUrl) throw new Error(`No image URL from ${model.id}: ${JSON.stringify(data).slice(0, 200)}`);

      const filename = `shot_${Date.now()}.png`;
      const filepath  = path.join(IMAGES_DIR, filename);
      await downloadFile(imageUrl, filepath);

      return {
        filename,
        path: `/images/${filename}`,
        prompt,
        revisedPrompt: prompt,
        usedFallback: false,
        generatedAt: new Date().toISOString(),
        backend: `falai/${model.id}`,
        model: model.label,
      };
    } catch (err) {
      console.warn(`[Camera] ${model.label} failed: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError || new Error('All FAL.ai models failed');
}

export async function generateCameraShot({ state, customPrompt, portrait = false } = {}) {
  // Priority 1: ComfyUI (local Stable Diffusion)
  if (!customPrompt && await isComfyUIAvailable()) {
    try {
      return await generateViaComfyUI(state);
    } catch (comfyErr) {
      console.warn('ComfyUI generation failed, falling back:', comfyErr.message);
    }
  }
  // Priority 2: FAL.ai (Flux — fast, high quality)
  if (process.env.FAL_API_KEY) {
    try {
      return await generateViaFalAI(state);
    } catch (falErr) {
      console.warn('FAL.ai generation failed, falling back:', falErr.message);
    }
  }
  // Priority 3: DALL-E 3 via OpenAI
  return generateViaDallE(state, customPrompt, { portrait });
}

// ─── List shots from disk ─────────────────────────────────────────────────────

export function listShots() {
  if (!fs.existsSync(IMAGES_DIR)) return [];
  return fs.readdirSync(IMAGES_DIR)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort()
    .reverse()
    .map((filename) => ({ filename, path: `/images/${filename}` }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function requestDallEImage(openai, prompt, portrait = false) {
  return openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: portrait ? '1024x1792' : '1792x1024',
    quality: 'hd',
    response_format: 'url',
  });
}

function isLikelySafetyBlock(error) {
  const message = String(error?.message || '').toLowerCase();
  const code    = String(error?.code || '').toLowerCase();
  const type    = String(error?.type || '').toLowerCase();
  return (
    message.includes('safety') ||
    message.includes('content policy') ||
    message.includes('policy') ||
    message.includes('moderation') ||
    message.includes('rejected') ||
    code.includes('content') ||
    type.includes('content')
  );
}

function buildSafeFallbackPrompt(state) {
  const castNames = resolveCast(state);
  const characterDescs = castNames
    .map((name) => CHARACTER_LOOKS_DALLE[name] || `a young woman in her mid-twenties named ${name}`)
    .join(' and ');
  const castLock = castNames.length === 1
    ? `The only subject is one young woman in her mid-twenties. No men. No children. No other people.`
    : `All subjects are young women in their mid-twenties. No men. No children. No other people.`;
  return [
    'Cinematic still photograph. Contemporary setting, present day.',
    castLock,
    `${characterDescs}.`,
    'Soft natural lighting, muted palette, quiet domestic interior.',
    'Calm scene, subtle emotion, no physical intimacy.',
    'No text, captions, logos, UI overlays, or phone screens.',
    'Shot on 35mm film, f/2.0, shallow depth of field, natural film grain.',
    'Photographic style: quiet, realistic, grounded. Not anime. Not illustrated. Not CGI.',
  ].join(' ');
}
