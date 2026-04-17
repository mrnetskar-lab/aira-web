import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from '../services/engineInstance.js';
import { generateCameraShot, listShots } from '../services/CameraService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '../../images');

const router = express.Router();

// POST /api/camera/generate
// Body: { prompt?: string }  — omit prompt to auto-build from engine state
router.post('/generate', async (req, res) => {
  try {
    const customPrompt  = req.body?.prompt    || null;
    const character     = req.body?.character || null;
    const contextHint   = req.body?.contextHint || null;
    const state = engine.orchestrator.getState();

    // If a specific character is requested, override the cast in state
    const stateOverride = character
      ? { ...state, attention: { [character]: 1 }, relationships: { [character]: { trust: 1 } } }
      : state;

    // Single character private room → portrait orientation
    const portrait = !!character;

    // If the client provided an image (base64), persist it and include in prompt
    let uploadedUrl = null;
    const imageBase64 = req.body?.imageBase64 || null;
    if (imageBase64) {
      try {
        const timestamp = Date.now();
        const filename = `upload_${timestamp}.jpg`;
        const filepath = path.join(IMAGES_DIR, filename);
        const raw = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '').trim();
        fs.writeFileSync(filepath, Buffer.from(raw, 'base64'));
        uploadedUrl = `/images/${filename}`;
      } catch (saveErr) {
        console.warn('Failed to save uploaded image:', saveErr.message);
      }
    }

    // Build an effective prompt: prefer explicit customPrompt, otherwise reference uploaded image
    const effectivePrompt = customPrompt || (uploadedUrl
      ? `Generate a portrait of ${character || 'the character'} reacting to the uploaded image at ${uploadedUrl}. Keep it cinematic and focused on facial reaction.`
      : null);

    const shot = await generateCameraShot({ state: stateOverride, customPrompt: effectivePrompt, portrait });

    return res.json({ ok: true, shot, uploadedUrl, imageUrl: shot?.path || uploadedUrl || null });
  } catch (error) {
    console.error('Camera generate error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/camera/list
router.get('/list', (_req, res) => {
  res.json({ ok: true, shots: listShots() });
});

// DELETE /api/camera/:filename
router.delete('/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename || !/\.(png|jpg|jpeg|webp)$/i.test(filename)) {
    return res.status(400).json({ ok: false, error: 'Invalid filename' });
  }

  const filepath = path.join(IMAGES_DIR, filename);
  const normalized = path.resolve(filepath);
  if (!normalized.startsWith(IMAGES_DIR + path.sep) && normalized !== IMAGES_DIR) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }

  try {
    fs.unlinkSync(filepath);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
