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
  }
};

export const CHARACTER_NAME_BY_ID = Object.fromEntries(
  Object.entries(CHARACTER_PROFILES).map(([name, profile]) => [profile.id, name])
);
