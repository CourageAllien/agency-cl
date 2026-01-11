// Client Types

import { IssueBucket, Severity, ClientMetrics } from './analysis';

export interface Client {
  id: string;
  name: string;
  tier?: string;
  offerType?: 'Make Money' | 'Save Money/Time';
  mechanism?: 'Strong' | 'Medium' | 'Weak';
  tam?: 'Strong' | 'Weak';
  industry?: string;
  startDate: string;
  status: 'active' | 'paused' | 'churned' | 'onboarding';
  contactEmail?: string;
  contactName?: string;
  notes?: string;
}

export interface ClientWithAnalysis extends Client {
  metrics: ClientMetrics;
  bucket: IssueBucket;
  severity: Severity;
  healthScore: number;
  lastAnalyzedAt: string;
}

export interface ClientSummary {
  total: number;
  active: number;
  paused: number;
  onboarding: number;
  churned: number;
  byBucket: Record<IssueBucket, number>;
  avgHealthScore: number;
  totalOpportunities: number;
}

// Tier definitions from benchmarks
export interface TierDefinition {
  id: string;
  offerType: 'Make Money' | 'Save Money/Time';
  mechanism: 'Strong' | 'Medium' | 'Weak';
  tam: 'Strong' | 'Weak';
  expectedMeetings: number;
  expectedPositiveReplyRate: number;
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  { id: '1a', offerType: 'Make Money', mechanism: 'Strong', tam: 'Strong', expectedMeetings: 15, expectedPositiveReplyRate: 18 },
  { id: '2a', offerType: 'Make Money', mechanism: 'Medium', tam: 'Weak', expectedMeetings: 10, expectedPositiveReplyRate: 18 },
  { id: '2a_alt', offerType: 'Make Money', mechanism: 'Weak', tam: 'Strong', expectedMeetings: 10, expectedPositiveReplyRate: 13 },
  { id: '3a', offerType: 'Make Money', mechanism: 'Weak', tam: 'Weak', expectedMeetings: 5, expectedPositiveReplyRate: 13 },
  { id: '2b', offerType: 'Save Money/Time', mechanism: 'Strong', tam: 'Strong', expectedMeetings: 10, expectedPositiveReplyRate: 10 },
  { id: '3b', offerType: 'Save Money/Time', mechanism: 'Medium', tam: 'Weak', expectedMeetings: 5, expectedPositiveReplyRate: 10 },
  { id: '3b_alt', offerType: 'Save Money/Time', mechanism: 'Weak', tam: 'Strong', expectedMeetings: 5, expectedPositiveReplyRate: 6 },
  { id: '3b_lowest', offerType: 'Save Money/Time', mechanism: 'Weak', tam: 'Weak', expectedMeetings: 5, expectedPositiveReplyRate: 6 },
];
