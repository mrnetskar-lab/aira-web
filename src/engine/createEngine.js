import { SystemOrchestrator } from './core/SystemOrchestrator.js';
import { AiraBrainController } from './brain/AiraBrainController.js';
import { MemorySystem } from './systems/MemorySystem.js';
import { EmotionSystem } from './systems/EmotionSystem.js';
import { FocusSystem } from './systems/FocusSystem.js';
import { DualLayerSystem } from './systems/DualLayerSystem.js';
import { ExplicitMode } from './systems/ExplicitMode.js';
import { SimpleGM } from './systems/SimpleGM.js';
import { AiraObserver } from './dev/AiraObserver.js';
import { AiraPatchWriter } from './dev/AiraPatchWriter.js';
import { NullAvatarBridge } from './bridges/NullAvatarBridge.js';
import { AiraInterferenceSystem } from './systems/AiraInterferenceSystem.js';
import { RelationshipContinuitySystem } from './systems/RelationshipContinuitySystem.js';

export function createEngine() {
  const brain = new AiraBrainController();
  const gm = new SimpleGM();
  const observer = new AiraObserver();
  const memory = new MemorySystem();
  const emotion = new EmotionSystem();
  const focus = new FocusSystem();
  const avatarManager = new NullAvatarBridge();
  const dualLayer = new DualLayerSystem();
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
    continuity
  });

  return {
    orchestrator,
    observer,
    patchWriter,
    memory,
    focus
  };
}
