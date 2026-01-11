// Analysis and Classification Types

export type IssueBucket = 
  | 'VOLUME_ISSUE'
  | 'COPY_ISSUE'
  | 'SUBSEQUENCE_ISSUE'
  | 'DELIVERABILITY_ISSUE'
  | 'TAM_EXHAUSTED'
  | 'NOT_VIABLE'
  | 'PERFORMING_WELL'
  | 'TOO_EARLY';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface ClientMetrics {
  totalSent: number;
  totalOpened: number;
  totalReplies: number;
  replyRate: number;
  openRate: number;
  positiveReplies: number;
  opportunities: number;
  conversionRate: number;
  uncontactedLeads: number;
  totalLeads: number;
  activeCampaigns: number;
  activeInboxes: number;
  disconnectedInboxes: number;
  lowHealthInboxes: number;
  avgInboxHealth: number;
}

export interface ClientClassification {
  clientId: string;
  clientName: string;
  bucket: IssueBucket;
  severity: Severity;
  reason: string;
  metrics: ClientMetrics;
  autoTask: {
    title: string;
    description: string;
    category: string;
  };
  analyzedAt: string;
}

export interface InboxHealthSummary {
  total: number;
  healthy: number;
  lowHealth: number;
  disconnected: number;
  warming: number;
  avgHealthScore: number;
}

export interface WeeklyTrendData {
  week: string;
  clients: Array<{
    name: string;
    replyRate: number;
    previousReplyRate: number;
    change: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
}

export interface AnalysisResult {
  id: string;
  classifications: ClientClassification[];
  inboxHealth: InboxHealthSummary;
  weeklyTrends?: WeeklyTrendData;
  analyzedAt: string;
}

export interface BucketConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  priority: number;
}

export const BUCKET_CONFIGS: Record<IssueBucket, BucketConfig> = {
  VOLUME_ISSUE: {
    label: 'Volume Issue',
    description: 'Not enough leads',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: '📉',
    priority: 1,
  },
  COPY_ISSUE: {
    label: 'Copy Issue',
    description: 'Low reply rate (<0.45%)',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: '✍️',
    priority: 2,
  },
  SUBSEQUENCE_ISSUE: {
    label: 'Subsequence Issue',
    description: 'High reply, low conversion',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: '🔄',
    priority: 3,
  },
  DELIVERABILITY_ISSUE: {
    label: 'Deliverability Issue',
    description: 'Inbox health problems',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: '📧',
    priority: 0,
  },
  TAM_EXHAUSTED: {
    label: 'TAM Exhausted',
    description: 'Need to recycle leads',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: '♻️',
    priority: 4,
  },
  NOT_VIABLE: {
    label: 'Not Viable',
    description: 'Consider pausing',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    icon: '⚠️',
    priority: 6,
  },
  PERFORMING_WELL: {
    label: 'Performing Well',
    description: 'No action needed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: '✅',
    priority: 7,
  },
  TOO_EARLY: {
    label: 'Too Early',
    description: 'Not enough data',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: '⏳',
    priority: 5,
  },
};
