const CONTINUITY_PROFILES = {
  Lucy: {
    prefers: ["evening", "morning"],
    sleepDuring: ["sleep_hours"],
    busyBias: 0.25,
    seenBias: 0.65,
    replyBias: 0.58,
  },
  Sam: {
    prefers: ["day", "evening"],
    sleepDuring: ["sleep_hours"],
    busyBias: 0.42,
    seenBias: 0.72,
    replyBias: 0.38,
  },
  Angie: {
    prefers: ["evening", "late_night"],
    sleepDuring: ["sleep_hours"],
    busyBias: 0.18,
    seenBias: 0.56,
    replyBias: 0.68,
  },
};

const CHARACTERS = Object.keys(CONTINUITY_PROFILES);

function getTimeBlock(turnClock) {
  const slot = turnClock % 18;
  if (slot <= 3) return "evening";
  if (slot <= 6) return "late_night";
  if (slot <= 9) return "sleep_hours";
  if (slot <= 13) return "morning";
  return "day";
}

function buildInitialAvailability() {
  const availability = {};
  for (const name of CHARACTERS) {
    availability[name] = {
      online: true,
      sleeping: false,
      busy: false,
      seen: false,
      replying: false,
      lastSeenTurn: null,
    };
  }
  return availability;
}

export function buildInitialContinuityState() {
  return {
    turnClock: 0,
    timeBlock: "evening",
    activeApp: {
      type: "chat",
      mode: "group",
      visibility: "public",
    },
    availability: buildInitialAvailability(),
    queuedEvents: [],
  };
}

export class RelationshipContinuitySystem {
  update({ state }) {
    if (!state.continuity) {
      state.continuity = buildInitialContinuityState();
    }

    state.continuity.turnClock += 1;
    const timeBlock = getTimeBlock(state.continuity.turnClock);
    state.continuity.timeBlock = timeBlock;

    for (const name of CHARACTERS) {
      const profile = CONTINUITY_PROFILES[name];
      if (!profile) continue;

      const avail = state.continuity.availability[name];

      const sleeping = profile.sleepDuring.includes(timeBlock);

      const busy =
        !sleeping &&
        Math.random() < profile.busyBias &&
        timeBlock !== "late_night";

      const online =
        !sleeping &&
        (profile.prefers.includes(timeBlock) || Math.random() < 0.45);

      avail.sleeping = sleeping;
      avail.busy = busy;
      avail.online = online;

      // Reset transient markers each turn
      avail.seen = false;
      avail.replying = false;
    }
  }

  getAvailabilitySnapshot(state) {
    return state.continuity?.availability ?? null;
  }

  queueFollowUp({ state, character, type, delayTurns, reason }) {
    if (!state.continuity) return;

    const id = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    state.continuity.queuedEvents.push({
      id,
      character,
      type,
      reason,
      createdTurn: state.continuity.turnClock,
      readyTurn: state.continuity.turnClock + delayTurns,
      consumed: false,
    });
  }

  consumeReadyEvents(state) {
    if (!state.continuity?.queuedEvents?.length) return [];

    const currentTurn = state.continuity.turnClock;
    const ready = [];

    for (const event of state.continuity.queuedEvents) {
      if (!event.consumed && event.readyTurn <= currentTurn) {
        event.consumed = true;
        ready.push(event);
        // Hard cap: max 1 consumed event per run in Phase A
        break;
      }
    }

    return ready;
  }
}

