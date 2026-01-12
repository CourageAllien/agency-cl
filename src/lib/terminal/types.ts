// Terminal Command Types

export type CommandType = 
  // Time-period analysis
  | 'daily'      // Today's campaign analysis
  | 'weekly'     // 7-day campaign analysis
  // Task commands
  | 'send_volume'
  | 'low_leads'
  | 'blocked_domains'
  | 'benchmarks'
  | 'conversion'
  | 'inbox_health'
  | 'removed_inboxes'
  | 'reply_trends'
  | 'weekly_summary'  // Full weekly checklist
  // Utility
  | 'refresh'
  | 'help'
  | 'unknown';

export interface CampaignIssue {
  name: string;
  issue: string;
  action: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  metrics?: Record<string, string | number>;
}

export interface SendVolumeStatus {
  today: number;
  yesterday: number;
  average: number;
  change: number;
  status: 'Normal' | 'ABNORMALLY LOW';
  causes?: string[];
}

export interface BlockedDomainResult {
  found: boolean;
  total: number;
  byCampaign: Array<{
    campaignName: string;
    campaignId: string;
    microsoft: number;
    proofpoint: number;
    mimecast: number;
    cisco: number;
  }>;
}

export interface BenchmarkResult {
  name: string;
  actual: number;
  benchmark: number;
  gap: number;
  percentBelow: number;
  status: 'CRITICAL' | 'WARNING';
  action: string;
  sent: number;
}

export interface ConversionResult {
  name: string;
  positiveReplies: number;
  meetings: number;
  conversion: number;
  issue: string;
  action: string;
}

export interface InboxIssue {
  email: string;
  status: string;
  error?: string;
  campaigns?: string[];
  lastUsed?: string;
  impact?: string;
  healthScore?: number;
  landedInbox?: number;
  landedSpam?: number;
}

export interface TrendResult {
  name: string;
  week1Rate: number;
  week4Rate: number;
  change: number;
  percentChange: number;
  status: 'DECLINING' | 'IMPROVING' | 'STABLE';
  diagnosticSteps?: string[];
}

export interface TerminalResponse {
  type: 'success' | 'error' | 'info';
  command: CommandType;
  title: string;
  icon: string;
  sections: TerminalSection[];
  summary?: string[];
  metadata: {
    timestamp: string;
    cached: boolean;
    campaignCount?: number;
    issueCount?: number;
  };
}

export interface TerminalSection {
  title: string;
  type: 'list' | 'status' | 'summary';
  count?: number;
  items?: TerminalItem[];
  status?: {
    label: string;
    value: string | number;
    icon: string;
    change?: string;
  };
}

export interface TerminalItem {
  name: string;
  details: string[];
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'WARNING';
  metrics?: Record<string, string | number>;
  actions?: Array<{
    label: string;
    type: string;
  }>;
}

// Command aliases mapping
export const COMMAND_ALIASES: Record<string, CommandType> = {
  // Daily
  'd': 'daily',
  'daily': 'daily',
  'show daily tasks': 'daily',
  'what do i need to do today': 'daily',
  'today': 'daily',
  
  'send volume': 'send_volume',
  'check send volume': 'send_volume',
  'is send volume low': 'send_volume',
  'volume': 'send_volume',
  
  'low leads': 'low_leads',
  'campaigns under 3000 leads': 'low_leads',
  'which campaigns need leads': 'low_leads',
  'show campaigns with low leads': 'low_leads',
  'leads': 'low_leads',
  
  'blocked domains': 'blocked_domains',
  'check microsoft proofpoint mimecast cisco': 'blocked_domains',
  'scan for blocked emails': 'blocked_domains',
  'blocked email providers': 'blocked_domains',
  'blocked': 'blocked_domains',
  
  // Weekly analysis (7-day period)
  'w': 'weekly',
  'weekly': 'weekly',
  'this week': 'weekly',
  'last 7 days': 'weekly',
  '7 day': 'weekly',
  'week report': 'weekly',
  
  // Weekly summary (full checklist)
  'weekly summary': 'weekly_summary',
  'wednesday tasks': 'weekly_summary',
  'show wednesday checklist': 'weekly_summary',
  'full weekly': 'weekly_summary',
  
  'benchmarks': 'benchmarks',
  'campaigns below benchmarks': 'benchmarks',
  'benchmark check': 'benchmarks',
  'which campaigns not hitting targets': 'benchmarks',
  
  'conversion': 'conversion',
  'positive reply to meeting': 'conversion',
  'sub 40% conversion': 'conversion',
  'meeting conversion rates': 'conversion',
  'subsequences': 'conversion',
  
  'inbox health': 'inbox_health',
  'disconnected inboxes': 'inbox_health',
  'inbox errors': 'inbox_health',
  'check inbox status': 'inbox_health',
  'inboxes': 'inbox_health',
  
  'removed inboxes': 'removed_inboxes',
  'tag removal report': 'removed_inboxes',
  'inboxes removed this week': 'removed_inboxes',
  
  'reply trends': 'reply_trends',
  'trending downward': 'reply_trends',
  'reply rate trends': 'reply_trends',
  'check trends': 'reply_trends',
  'trends': 'reply_trends',
  
  // Utility
  'help': 'help',
  '?': 'help',
  'commands': 'help',
};

// Blocked domains to check (exclude Barracuda)
export const BLOCKED_DOMAINS = [
  '@microsoft.com',
  '@proofpoint.com', 
  '@mimecast.com',
  '@cisco.com'
];

// Benchmarks
export const BENCHMARKS = {
  MIN_REPLY_RATE: 0.45,        // 0.45% minimum
  TARGET_CONVERSION: 40,        // 40% positive reply to meeting
  MIN_HEALTH_SCORE: 93,         // Inbox health threshold
  LOW_LEADS_WARNING: 3000,      // Warning threshold
  LOW_LEADS_CRITICAL: 1000,     // Critical threshold
  SEND_VOLUME_THRESHOLD: -20,   // % below average = abnormally low
  TREND_SIGNIFICANT: 5,         // % change to be significant
};

// Diagnostic steps for declining reply rates
export const DIAGNOSTIC_STEPS = [
  'Step 1: Check first line (<12 words?)',
  'Step 2: Test new mechanism reframe',
  'Step 3: Narrow targeting if too broad',
  'Step 4: A/B test new angle',
];
