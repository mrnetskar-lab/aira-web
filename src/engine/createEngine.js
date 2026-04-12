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
    for (const [key, val] of Object.entries(patch)) {
      if (key in tuning && typeof val === 'number') {
        tuning[key] = Math.min(5, Math.max(1, val));
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
