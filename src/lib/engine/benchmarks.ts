// Benchmark Configuration for Campaign Analysis

export const BENCHMARKS = {
  // Reply rate thresholds
  CRITICAL_REPLY_RATE: 0.45,    // Below this = COPY ISSUE
  LOW_REPLY_RATE: 1.0,          // Below this = needs attention
  GOOD_REPLY_RATE: 2.0,         // Above this = copy is working

  // Conversion thresholds (positive reply → meeting)
  CRITICAL_CONVERSION: 5,        // Below this = SUBSEQUENCE ISSUE
  TARGET_CONVERSION: 15,         // Realistic target
  ASPIRATIONAL_CONVERSION: 40,   // Documented target (hard to hit)

  // Lead thresholds
  CRITICAL_UNCONTACTED: 3000,    // Below this = VOLUME ISSUE
  WARNING_UNCONTACTED: 10000,    // Start planning for leads

  // Lifetime send thresholds
  EARLY_STAGE: 15000,            // Below this = TOO EARLY to judge
  VIABLE_THRESHOLD: 75000,       // Enough data to judge viability
  TAM_EXHAUSTED: 100000,         // Consider recycling

  // Inbox health
  HEALTHY_INBOX: 93,             // Below this = DELIVERABILITY ISSUE
  WARNING_INBOX: 85,             // Warning threshold

  // Daily send expectations
  MIN_DAILY_SEND_PER_INBOX: 20,  // Below this = volume issue at inbox level
  TARGET_DAILY_SEND_PER_INBOX: 40,

  // Copy length guidelines
  SUBJECT_LINE_WORDS: 3,
  FIRST_LINE_WORDS: 12,
  MAX_BODY_WORDS: 80,

  // Tier benchmarks (from doc)
  TIERS: {
    '1a': { 
      offerType: 'Make Money', 
      mechanism: 'Strong', 
      tam: 'Strong', 
      meetings: 15, 
      positiveReplyRate: 18 
    },
    '2a': { 
      offerType: 'Make Money', 
      mechanism: 'Medium', 
      tam: 'Weak', 
      meetings: 10, 
      positiveReplyRate: 18 
    },
    '2a_alt': { 
      offerType: 'Make Money', 
      mechanism: 'Weak', 
      tam: 'Strong', 
      meetings: 10, 
      positiveReplyRate: 13 
    },
    '3a': { 
      offerType: 'Make Money', 
      mechanism: 'Weak', 
      tam: 'Weak', 
      meetings: 5, 
      positiveReplyRate: 13 
    },
    '2b': { 
      offerType: 'Save Money/Time', 
      mechanism: 'Strong', 
      tam: 'Strong', 
      meetings: 10, 
      positiveReplyRate: 10 
    },
    '3b': { 
      offerType: 'Save Money/Time', 
      mechanism: 'Medium', 
      tam: 'Weak', 
      meetings: 5, 
      positiveReplyRate: 10 
    },
    '3b_alt': { 
      offerType: 'Save Money/Time', 
      mechanism: 'Weak', 
      tam: 'Strong', 
      meetings: 5, 
      positiveReplyRate: 6 
    },
    '3b_lowest': { 
      offerType: 'Save Money/Time', 
      mechanism: 'Weak', 
      tam: 'Weak', 
      meetings: 5, 
      positiveReplyRate: 6 
    },
  } as const,
} as const;

export type TierId = keyof typeof BENCHMARKS.TIERS;

export function getTierBenchmarks(tierId: TierId) {
  return BENCHMARKS.TIERS[tierId];
}

export function getExpectedMetrics(tierId: TierId) {
  const tier = BENCHMARKS.TIERS[tierId];
  return {
    expectedMeetings: tier.meetings,
    expectedPositiveReplyRate: tier.positiveReplyRate,
    minimumReplyRate: BENCHMARKS.CRITICAL_REPLY_RATE,
    targetConversion: BENCHMARKS.TARGET_CONVERSION,
  };
}
