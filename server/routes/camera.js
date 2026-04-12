import express from 'express';
import { engine } from '../services/engineInstance.js';
import { generateCameraShot, listShots } from '../services/CameraService.js';

const router = express.Router();

// POST /api/camera/generate
// Body: { prompt?: string }  — omit prompt to auto-build from engine state
router.post('/generate', async (req, res) => {
  try {
    const customPrompt = req.body?.prompt || null;
    const state = engine.orchestrator.getState();
    const shot = await generateCameraShot({ state, customPrompt });
    return res.json({ ok: true, shot });
  } catch (error) {
    console.error('Camera generate error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/camera/list
router.get('/list', (_req, res) => {
  res.json({ ok: true, shots: listShots() });
});

export default router;
