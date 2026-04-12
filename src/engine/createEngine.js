import { SystemOrchestrator } from './core/SystemOrchestrator.js';
import { AiraBrainController } from './brain/AiraBrainController.js';
import { MemorySystem } from './systems/MemorySystem.js';
import { EmotionSystem } from './systems/EmotionSystem.js';
import { FocusSystem } from './systems/FocusSystem.js';
import { DualLayerSystem } from './systems/DualLayerSystem.js';
import { ExplicitMode } from './systems/ExplicitMode.js';
import { AiraGM } from './systems/AiraGM.js';
import { AiraObserver } from './dev/AiraObserver.js';
import { AiraPatchWriter } from './dev/AiraPatchWriter.js';
import { NullAvatarBridge } from './bridges/NullAvatarBridge.js';
import { AiraInterferenceSystem } from './systems/AiraInterferenceSystem.js';
import { RelationshipContinuitySystem } from './systems/RelationshipContinuitySystem.js';

export const DEFAULT_TUNING = {
  responseLength:      3,  // 1–5 → word cap per mode
  subtextFrequency:    4,  // 1–5 → thoughtChance
  secondaryChance:     3,  // 1–5 → base secondary speaker probability
  temperature:         3,  // 1–5 → AI model temperature
  autoTalkFrequency:   3,  // 1–5 → idle timeout (client reads via /tune GET)
  typingSpeed:         3,  // 1–5 → typing delay multiplier (client reads)
  languageIntensity:   14, // 0–20 → overall edge/profanity tolerance
  languageLucy:        12, // 0–20 → Lucy edge
  languageSam:         16, // 0–20 → Sam edge
  languageAngie:       15, // 0–20 → Angie edge
};

export function createEngine() {
  const tuning = { ...DEFAULT_TUNING };

  const brain = new AiraBrainController(tuning);
  const gm = new AiraGM();
  const observer = new AiraObserver();
  const memory = new MemorySystem();
  const emotion = new EmotionSystem();
  const focus = new FocusSystem();
  const avatarManager = new NullAvatarBridge();
  const dualLayer = new DualLayerSystem(tuning);
  const explicitMode = new ExplicitMode();
  const interference = new AiraInterferenceSystem();
  const continuity = new RelationshipContinuitySystem();
  const patchWriter = new AiraPatchWriter(observer);

  const orchestrator = new SystemOrchestrator({
    brain,
    gm,
    observer,
    memory,
    ghost: null,
    emotion,
    focus,
    avatarManager,
    dualLayer,
    explicitMode,
    interference,
    continuity,
    tuning
  });

  function tune(patch) {
    const ranges = {
      responseLength: [1, 5],
      subtextFrequency: [1, 5],
      secondaryChance: [1, 5],
      temperature: [1, 5],
      autoTalkFrequency: [1, 5],
      typingSpeed: [1, 5],
      languageIntensity: [0, 20],
      languageLucy: [0, 20],
      languageSam: [0, 20],
      languageAngie: [0, 20],
    };

    for (const [key, val] of Object.entries(patch)) {
      if (key in tuning && typeof val === 'number') {
        const [min, max] = ranges[key] || [1, 5];
        tuning[key] = Math.min(max, Math.max(min, Math.round(val)));
      }
    }
    dualLayer.syncTuning(tuning);
    brain.syncTuning(tuning);
  }

  return {
    orchestrator,
    observer,
    patchWriter,
    memory,
    focus,
    tuning,
    tune
  };
}
