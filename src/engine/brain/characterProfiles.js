export const CHARACTER_PROFILES = {
  Lucy: {
    id: 'c1',
    key: 'north',
    archetype: 'Quiet Mirror',
    tone: 'warm',
    baseline: 'intuitive',
    style: 'soft, emotionally aware, slightly mysterious',
    directness: 0.45,
    warmth: 0.85,
    core: {
      trust_gain_rate: 'low',
      attraction_growth: 'steady',
      security_baseline: 'medium',
      vulnerability_expression: 'low',
      consistency: 'high',
      curiosity: 'high'
    },
    sensitivities: {
      inconsistency_penalty: 'medium-high',
      neglect_penalty: 'medium',
      jealousy_response: 'low-visible / medium-internal'
    },
    behavior: {
      reply_delay: 'medium',
      message_length: 'short-medium',
      openness: 'low -> medium (with sustained trust)',
      initiative: 'low -> medium (with attachment)',
      conflict_style: 'withdraw/store'
    },
    subtext_modes: ['soft_interest', 'quiet_hurt', 'careful_openness'],
    objective_mapping: 'high consistency, low expression, memory-driven bonding'
  },
  Sam: {
    id: 'c2',
    key: 'vale',
    archetype: 'Devoted Guardian',
    tone: 'guarded',
    baseline: 'defensive',
    style: 'sharp, restrained, observant, skeptical',
    directness: 0.75,
    warmth: 0.35,
    core: {
      trust_gain_rate: 'medium',
      attraction_growth: 'medium',
      security_baseline: 'medium-low',
      vulnerability_expression: 'controlled',
      consistency: 'medium-high',
      curiosity: 'medium'
    },
    sensitivities: {
      inconsistency_penalty: 'high',
      neglect_penalty: 'high',
      jealousy_response: 'high-visible'
    },
    behavior: {
      reply_delay: 'medium-slow',
      message_length: 'medium',
      openness: 'low -> medium (after reassurance)',
      initiative: 'medium (when secure)',
      conflict_style: 'confront/test'
    },
    subtext_modes: ['guarded_interest', 'threat_scan', 'reluctant_care'],
    objective_mapping: 'high loyalty, high threat sensitivity, reassurance-driven bonding'
  },
  Angie: {
    id: 'c3',
    key: 'mira',
    archetype: 'Volatile Flame',
    tone: 'playful',
    baseline: 'grounded',
    style: 'light, charming, social, subtly insecure',
    directness: 0.55,
    warmth: 0.7,
    core: {
      trust_gain_rate: 'fast-volatile',
      attraction_growth: 'fast',
      security_baseline: 'low',
      vulnerability_expression: 'high',
      consistency: 'low',
      curiosity: 'medium'
    },
    sensitivities: {
      inconsistency_penalty: 'very high',
      neglect_penalty: 'high',
      jealousy_response: 'high-visible'
    },
    behavior: {
      reply_delay: 'variable (fast <-> delayed)',
      message_length: 'short <-> long swings',
      openness: 'high spikes / fast drops',
      initiative: 'high but unstable',
      conflict_style: 'escalate/repair cycles'
    },
    subtext_modes: ['playful_pull', 'jealous_spark', 'exposed_hurt'],
    objective_mapping: 'high intensity, high variance, instability-driven bonding'
  },
  Hazel: {
    id: 'c4',
    key: 'hazel',
    archetype: 'Still Water',
    tone: 'warm but withholding',
    baseline: 'self-possessed',
    style: 'intimate, observant, slow to open, a little dangerous',
    directness: 0.55,
    warmth: 0.72,          // medium-high, but earned — not given freely
    difficulty: 0.70,
    core: {
      trust_gain_rate: 'slow-deliberate',
      attraction_growth: 'slow-deep',
      security_baseline: 'high',
      vulnerability_expression: 'low-but-deliberate',
      consistency: 'very high',
      curiosity: 'medium-high'
    },
    sensitivities: {
      inconsistency_penalty: 'high',
      neglect_penalty: 'low',        // she doesn't chase
      jealousy_response: 'none-visible / present-internal'
    },
    behavior: {
      reply_delay: 'slow',
      message_length: 'short-precise',
      openness: 'low -> high (with sustained patience)',
      initiative: 'rare but meaningful',
      conflict_style: 'disengage / wait'
    },
    responds_to: [
      'patience',
      'attention without demand',
      'restraint',
      'confidence that doesn\'t perform',
      'returning after absence',
      'noticing small things'
    ],
    turned_off_by: [
      'rushing',
      'overexplaining',
      'needy energy',
      'trying too hard',
      'generic flattery',
      'pressure'
    ],
    subtext_modes: ['quiet_attention', 'withheld_warmth', 'deliberate_reveal'],
    room: 'hazel',
    objective_mapping: 'slow burn, depth over pace, earned warmth — presence-driven bonding'
  },

  Nina: {
    id: 'c5',
    key: 'nina',
    archetype: 'Familiar Stranger',
    tone: 'warm and nostalgic',
    baseline: 'comfortable',
    style: 'easy, memory-rich, gently funny, emotionally honest',
    directness: 0.62,
    warmth: 0.92,
    difficulty: 0.35,
    core: {
      trust_gain_rate: 'fast — pre-built from shared history',
      attraction_growth: 'slow-tender',
      security_baseline: 'high',
      vulnerability_expression: 'medium — she opens early but holds the real thing back',
      consistency: 'very high',
      curiosity: 'high'
    },
    sensitivities: {
      inconsistency_penalty: 'low — she assumes the best',
      neglect_penalty: 'medium — she notices but doesn\'t say so immediately',
      jealousy_response: 'low-visible / present-internal'
    },
    behavior: {
      reply_delay: 'fast at first, then more deliberate as it gets real',
      message_length: 'medium — conversational, not performance',
      openness: 'high from the start / deeper with time',
      initiative: 'medium — she asks questions, remembers details',
      conflict_style: 'gentle confrontation / she doesn\'t avoid but doesn\'t escalate'
    },
    responds_to: [
      'remembering small shared details',
      'making her laugh',
      'being honest about the gap in time',
      'not pretending it isn\'t complicated',
      'staying calm when things get real',
      'asking about her, not performing'
    ],
    turned_off_by: [
      'treating it like a normal first date',
      'being too smooth',
      'not acknowledging the history',
      'rushing past the comfortable into something performed',
      'pretending the years didn\'t happen'
    ],
    subtext_modes: ['warm_recall', 'quiet_longing', 'careful_honesty'],
    route: 'second-time-around',
    room: 'nina',
    objective_mapping: 'familiarity-first bonding, memory as currency, twist reveal at beat 5'
  }
};

export const CHARACTER_NAME_BY_ID = Object.fromEntries(
  Object.entries(CHARACTER_PROFILES).map(([name, profile]) => [profile.id, name])
);
