import { v2 as cloudinary } from 'cloudinary';
import { ensureOpenAI } from './openaiClient.js';

// ─── Cloudinary config ────────────────────────────────────────────────────────

function ensureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary env vars missing: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

const CHARACTER_LOOKS = {
  Lucy:  'a young woman with dark hair and quiet, watchful eyes, dressed simply, calm expression',
  Sam:   'a young woman with sharp features and a guarded look, brown hair, dressed practically',
  Angie: 'a young woman with an expressive face, lighter hair, warm but slightly chaotic energy',
};

const MANIFESTATION_HINTS = {
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
  charged: 'dramatic side lighting, low lamplight, intense charged atmosphere, close framing, barely-contained tension between two people',
  heavy:   'overcast grey light, low contrast, emotional weight, slow-cinema look',
  hostile: 'cold harsh light, sharp shadows, confrontational framing',
};

const BEAT_HINTS = {
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

export function buildCameraPrompt(state) {
  const aira      = state?.aira || {};
  const emotion   = state?.emotionOverride;
  const tension   = state?.tension || 0;
  const relationships = state?.relationships || {};

  const present = Object.keys(relationships).filter(
    (name) => (relationships[name]?.trust ?? 0) > 0
  );

  const atmosphere = emotion?.atmosphere ||
    (tension > 0.6 ? 'tense' : tension > 0.3 ? 'charged' : 'calm');

  const atmoStyle = ATMOSPHERE_STYLES[atmosphere] || ATMOSPHERE_STYLES.calm;

  const characterDescs = present.length > 0
    ? present.map((name) => CHARACTER_LOOKS[name] || `a young woman named ${name}`).join(' and ')
    : 'a young woman, alone';

  const manifestation = aira.manifestation || 'none';
  const airaHint = MANIFESTATION_HINTS[manifestation] || '';

  const beat     = emotion?.beat || (tension > 0.6 ? 'tension' : 'calm');
  const beatPool = BEAT_HINTS[beat];
  const beatHint = beatPool ? beatPool[Math.floor(Math.random() * beatPool.length)] : '';

  const chargedBeat = ['intimacy', 'warmth', 'jealousy', 'rising'].includes(beat);

  return [
    `Cinematic still photograph.`,
    `${characterDescs}.`,
    atmoStyle + '.',
    beatHint,
    airaHint,
    chargedBeat
      ? `Sensual but tasteful. Implied intimacy. No explicit nudity. Shot on 35mm film. Film grain. Shallow depth of field.`
      : `No text. No UI. No phone screens. Shot on 35mm film. Film grain. Shallow depth of field.`,
    `Style: quiet, realistic, cinematic. Not anime. Not illustrated.`,
  ].filter(Boolean).join(' ');
}

// ─── Core generator ───────────────────────────────────────────────────────────

export async function generateCameraShot({ state, customPrompt } = {}) {
  const openai = ensureOpenAI();
  const cld    = ensureCloudinary();

  const prompt = customPrompt || buildCameraPrompt(state);

  // 1. Generate via DALL-E 3 (returns a temporary URL)
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'url',
  });

  const tempUrl = response.data?.[0]?.url;
  if (!tempUrl) throw new Error('No image URL returned from OpenAI');

  const revisedPrompt = response.data?.[0]?.revised_prompt || prompt;

  // 2. Upload directly from URL to Cloudinary (no disk needed)
  const filename = `shot_${Date.now()}`;
  const result = await cld.uploader.upload(tempUrl, {
    folder:    'aira',
    public_id: filename,
    overwrite: false,
  });

  return {
    filename: result.public_id,
    path:     result.secure_url,
    prompt,
    revisedPrompt,
    generatedAt: new Date().toISOString(),
  };
}

// ─── List shots from Cloudinary ───────────────────────────────────────────────

export async function listShots() {
  try {
    const cld = ensureCloudinary();
    const result = await cld.search
      .expression('folder:aira')
      .sort_by('created_at', 'desc')
      .max_results(50)
      .execute();

    return (result.resources || []).map((r) => ({
      filename: r.public_id,
      path:     r.secure_url,
    }));
  } catch {
    return [];
  }
}
