// Terminal Command Types

export type CommandType = 
  // Time-period analysis
  | 'daily'           // Today's campaign analysis
  | 'daily_report'    // Full daily report for form
  | 'weekly'          // 7-day campaign analysis
  | 'weekly_report'   // Full weekly report for form
  
  // Campaign commands
  | 'campaigns'       // List all active campaigns with classification
  | 'campaign_detail' // Get specific campaign details
  | 'send_volume'     // Check today's send volume
  | 'send_volume_7d'  // Check 7-day send volume trend
  | 'low_leads'       // Campaigns under 3000 leads
  | 'blocked_domains' // ESP check (Microsoft/Proofpoint/Mimecast/Cisco)
  | 'esp_check'       // Alias for blocked_domains
  | 'underperforming' // Campaigns not hitting benchmarks
  | 'benchmarks'      // Benchmark analysis
  | 'conversion'      // Positive reply to meeting rate
  | 'low_conversion'  // Sub 40% conversion
  | 'bad_variants'    // Underperforming email variants
  
  // Inbox commands
  | 'inbox_health'    // Full inbox health report
  | 'inbox_issues'    // Disconnected/error inboxes grouped by tag
  | 'removed_inboxes' // Inboxes removed this week
  | 'warmup_status'   // Warmup analytics
  
  // Trend analysis
  | 'reply_trends'    // Reply rate trends week-over-week
  | 'daily_trends'    // Daily analytics trends
  
  // Lead management
  | 'leads'           // Lead overview
  | 'leads_campaign'  // Leads for specific campaign
  | 'interested'      // Interested/positive leads
  | 'meetings_booked' // Leads with meetings booked
  | 'lead_lists'      // List all lead lists
  
  // Resources
  | 'tags'            // List all custom tags
  | 'accounts_by_tag' // Accounts filtered by tag
  | 'block_list'      // View blocked domains/emails
  | 'templates'       // Email templates
  | 'subsequences'    // Campaign subsequences
  
  // Workspace
  | 'workspace'       // Workspace info
  | 'team'            // Team members
  | 'audit_log'       // Activity log
  | 'billing'         // Billing/usage info
  
  // Diagnostics
  | 'diagnose'        // AI-powered campaign diagnosis
  | 'verify_email'    // Verify single email
  
  // Reports
  | 'weekly_summary'  // Full weekly checklist
  | 'form_daily'      // Generate daily form answers
  | 'form_weekly'     // Generate weekly form answers
  
  // Utility
  | 'refresh'
  | 'help'
  | 'status'          // API connection status
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

// Detailed inbox health types
export type InboxIssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type InboxIssueType = 
  | 'DISCONNECTED'
  | 'AUTH_ERROR'
  | 'SMTP_ERROR'
  | 'SENDING_ERROR'
  | 'LOW_HEALTH'
  | 'WARMUP_DISABLED';

export interface DetectedIssue {
  type: InboxIssueType;
  severity: InboxIssueSeverity;
  message: string;
  details?: string;
  icon: string;
}

export interface InboxAction {
  label: string;
  action: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  steps: string[];
}

export interface ProcessedInbox {
  email: string;
  status: string;
  statusCode: number;
  statusMessage?: string;
  
  // Health metrics
  healthScore: number | null;
  landedInbox: number | null;
  landedSpam: number | null;
  
  // Sending capacity
  dailyLimit: number;
  warmupStatus: number;
  warmupEnabled: boolean;
  lastUsed?: string;
  
  // Issues
  issues: DetectedIssue[];
  hasIssues: boolean;
  severity: InboxIssueSeverity;
  
  // Impact
  affectedCampaigns: string[];
  campaignCount: number;
  lostCapacity: number;
  daysSinceLastUsed: number | null;
  
  // Recommendations
  actions: InboxAction[];
}

export interface InboxHealthStats {
  total: number;
  healthy: number;
  withIssues: number;
  critical: number;
  high: number;
  medium: number;
  totalLostCapacity: number;
  healthPercentage: string;
  issueTypes: Record<InboxIssueType, number>;
}

export interface CategorizedInboxes {
  critical: ProcessedInbox[];
  high: ProcessedInbox[];
  medium: ProcessedInbox[];
  healthy: ProcessedInbox[];
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
    // Raw data for full view pages
    rawCampaigns?: Array<{
      name: string;
      id: string;
      status: string;
      sent: number;
      contacted: number;
      uncontacted: number;
      totalLeads: number;
      replies: number;
      replyRate: number;
      opportunities: number;
      replyToOpp: number;
      bounced: number;
      bounceRate: number;
      positiveReplies: number;
      meetings: number;
      posReplyToMeeting: number;
      classification: string;
      reason: string;
      action: string;
      urgency: string;
    }>;
    rawAccounts?: Array<{
      email: string;
      status: string;
      statusMessage?: string;
      warmupStatus: number;
      healthScore: number;
      dailyLimit: number;
      issues: string[];
      severity: string;
      affectedCampaigns: string[];
      actions: string[];
    }>;
    summary?: {
      total: number;
      healthy: number;
      issues: number;
      disconnected: number;
      lowHealth: number;
    };
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

// Command aliases mapping - comprehensive natural language support
export const COMMAND_ALIASES: Record<string, CommandType> = {
  // ============ CAMPAIGN LIST ============
  'list': 'campaigns',
  'campaigns': 'campaigns',
  'list all active campaigns': 'campaigns',
  'show all campaigns': 'campaigns',
  'campaign list': 'campaigns',
  'active campaigns': 'campaigns',
  'all campaigns': 'campaigns',
  'list campaigns': 'campaigns',
  'running campaigns': 'campaigns',
  'what campaigns are running': 'campaigns',
  'show campaigns': 'campaigns',
  'campaign analytics': 'campaigns',
  'campaign performance': 'campaigns',
  'stats': 'campaigns',
  'performance': 'campaigns',
  
  // ============ DAILY COMMANDS ============
  'd': 'daily',
  'daily': 'daily',
  'show daily tasks': 'daily',
  'what do i need to do today': 'daily',
  'today': 'daily',
  'daily stats': 'daily',
  'today\'s metrics': 'daily',
  'today\'s data': 'daily',
  'daily analytics': 'daily',
  'today\'s performance': 'daily',
  
  // Daily report (comprehensive form answers)
  'daily report': 'daily_report',
  'daily tasks': 'daily_report',
  'what tasks today': 'daily_report',
  'summary of tasks today': 'daily_report',
  'generate daily report': 'daily_report',
  'form daily': 'form_daily',
  
  // ============ SEND VOLUME ============
  'send volume': 'send_volume',
  'check send volume': 'send_volume',
  'is send volume low': 'send_volume',
  'volume': 'send_volume',
  'sending': 'send_volume',
  'how many emails sent': 'send_volume',
  'emails sent today': 'send_volume',
  'send rate': 'send_volume',
  
  // 7-day send volume
  'send volume 7d': 'send_volume_7d',
  'send volume 7 days': 'send_volume_7d',
  'weekly send volume': 'send_volume_7d',
  'is send volume abnormally low for the past 7 days': 'send_volume_7d',
  'send trend': 'send_volume_7d',
  
  // ============ LOW LEADS ============
  'low leads': 'low_leads',
  'campaigns under 3000 leads': 'low_leads',
  'which campaigns need leads': 'low_leads',
  'show campaigns with low leads': 'low_leads',
  'need leads': 'low_leads',
  'campaigns with low leads': 'low_leads',
  'which campaigns have under 3000 leads': 'low_leads',
  'campaigns that need new list': 'low_leads',
  'leads running low': 'low_leads',
  'need new list': 'low_leads',
  
  // ============ BLOCKED DOMAINS / ESP CHECK ============
  'blocked domains': 'blocked_domains',
  'check microsoft proofpoint mimecast cisco': 'blocked_domains',
  'scan for blocked emails': 'blocked_domains',
  'blocked email providers': 'blocked_domains',
  'blocked': 'blocked_domains',
  'esp check': 'esp_check',
  'microsoft leads': 'esp_check',
  'proofpoint leads': 'esp_check',
  'mimecast leads': 'esp_check',
  'cisco leads': 'esp_check',
  'do any campaigns have microsoft proofpoint mimecast or cisco leads': 'esp_check',
  'campaigns launched today with microsoft': 'esp_check',
  
  // ============ WEEKLY COMMANDS ============
  'w': 'weekly',
  'weekly': 'weekly',
  'this week': 'weekly',
  'last 7 days': 'weekly',
  '7 day': 'weekly',
  'week report': 'weekly',
  'weekly stats': 'weekly',
  'weekly analytics': 'weekly',
  '7 day stats': 'weekly',
  'week data': 'weekly',
  'past week': 'weekly',
  
  // Weekly report (comprehensive form answers)
  'weekly report': 'weekly_report',
  'wednesday checklist': 'weekly_report',
  'wednesday tasks': 'weekly_report',
  'generate weekly report': 'weekly_report',
  'form weekly': 'form_weekly',
  
  // Weekly summary (full checklist)
  'weekly summary': 'weekly_summary',
  'show wednesday checklist': 'weekly_summary',
  'full weekly': 'weekly_summary',
  'all weekly checks': 'weekly_summary',
  
  // ============ BENCHMARKS ============
  'benchmarks': 'benchmarks',
  'campaigns below benchmarks': 'benchmarks',
  'benchmark check': 'benchmarks',
  'which campaigns not hitting targets': 'benchmarks',
  'are campaigns hitting benchmarks': 'benchmarks',
  'below target': 'benchmarks',
  'underperforming campaigns': 'underperforming',
  'underperforming': 'underperforming',
  'not hitting benchmarks': 'underperforming',
  'campaigns not performing': 'underperforming',
  
  // ============ CONVERSION ============
  'conversion': 'conversion',
  'positive reply to meeting': 'conversion',
  'sub 40% conversion': 'conversion',
  'meeting conversion rates': 'conversion',
  'subsequences': 'conversion',
  'low conversion': 'low_conversion',
  'sub 40%': 'low_conversion',
  'campaigns with sub 40% positive reply to meeting ratio': 'low_conversion',
  'broken subsequences': 'low_conversion',
  'booking rate': 'conversion',
  'meeting rate': 'conversion',
  'meetings booked': 'meetings_booked',
  'how many meetings': 'meetings_booked',
  
  // ============ INBOX HEALTH ============
  'inbox health': 'inbox_health',
  'disconnected inboxes': 'inbox_health',
  'inbox errors': 'inbox_health',
  'check inbox status': 'inbox_health',
  'inboxes': 'inbox_health',
  'inbox issues': 'inbox_issues',
  'sending errors': 'inbox_issues',
  'are there disconnected inboxes or inboxes with sending errors': 'inbox_issues',
  'inbox status': 'inbox_health',
  'email accounts': 'inbox_health',
  'accounts': 'inbox_health',
  'list accounts': 'inbox_health',
  'all inboxes': 'inbox_health',
  
  // Removed inboxes
  'removed inboxes': 'removed_inboxes',
  'tag removal report': 'removed_inboxes',
  'inboxes removed this week': 'removed_inboxes',
  'removed': 'removed_inboxes',
  
  // Warmup
  'warmup': 'warmup_status',
  'warmup status': 'warmup_status',
  'warmup analytics': 'warmup_status',
  'health scores': 'warmup_status',
  
  // ============ REPLY TRENDS ============
  'reply trends': 'reply_trends',
  'trending downward': 'reply_trends',
  'reply rate trends': 'reply_trends',
  'check trends': 'reply_trends',
  'trends': 'reply_trends',
  'are reply rates trending downward': 'reply_trends',
  'are reply rates declining': 'reply_trends',
  'reply rate over time': 'reply_trends',
  
  // Bad variants
  'bad variants': 'bad_variants',
  'underperforming variants': 'bad_variants',
  'variant analytics': 'bad_variants',
  'step performance': 'bad_variants',
  'worst variants': 'bad_variants',
  'trim variants': 'bad_variants',
  
  // ============ LEADS ============
  'leads': 'leads',
  'list leads': 'leads',
  'all leads': 'leads',
  'contacts': 'leads',
  'interested': 'interested',
  'interested leads': 'interested',
  'positive leads': 'interested',
  'positive replies': 'interested',
  'who is interested': 'interested',
  
  // ============ LEAD LISTS ============
  'lead lists': 'lead_lists',
  'lists': 'lead_lists',
  'show lead lists': 'lead_lists',
  'available lists': 'lead_lists',
  'my lists': 'lead_lists',
  
  // ============ TAGS ============
  'tags': 'tags',
  'custom tags': 'tags',
  'list tags': 'tags',
  'inbox tags': 'tags',
  'campaign tags': 'tags',
  'accounts by tag': 'accounts_by_tag',
  'inboxes by tag': 'accounts_by_tag',
  'filter by tag': 'accounts_by_tag',
  
  // ============ BLOCK LIST ============
  'block list': 'block_list',
  'blocklist': 'block_list',
  'blocked list': 'block_list',
  'show blocked': 'block_list',
  'blocked entries': 'block_list',
  
  // ============ TEMPLATES ============
  'templates': 'templates',
  'email templates': 'templates',
  'show templates': 'templates',
  'my templates': 'templates',
  
  // ============ SUBSEQUENCES ============
  'campaign subsequences': 'subsequences',
  'follow ups': 'subsequences',
  'follow up sequences': 'subsequences',
  
  // ============ WORKSPACE ============
  'workspace': 'workspace',
  'my workspace': 'workspace',
  'workspace info': 'workspace',
  'team': 'team',
  'team members': 'team',
  'workspace members': 'team',
  'audit log': 'audit_log',
  'activity log': 'audit_log',
  'history': 'audit_log',
  'billing': 'billing',
  'usage': 'billing',
  'api usage': 'billing',
  
  // ============ DIAGNOSTICS ============
  'diagnose': 'diagnose',
  'analyze': 'diagnose',
  'what\'s wrong with': 'diagnose',
  'why is': 'diagnose',
  'verify email': 'verify_email',
  'check email': 'verify_email',
  'validate email': 'verify_email',
  
  // ============ UTILITY ============
  'help': 'help',
  '?': 'help',
  'commands': 'help',
  'status': 'status',
  'api status': 'status',
  'connection': 'status',
  'test connection': 'status',
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
  MIN_REPLY_RATE: 0.45,        // 0.45% minimum reply rate
  TARGET_CONVERSION: 40,        // 40% positive reply to meeting
  MIN_HEALTH_SCORE: 93,         // Inbox health threshold
  // LEADS: uncontacted = total_leads - contacted
  // CRITICAL = uncontacted < 3,000
  LOW_LEADS_CRITICAL: 3000,     // CRITICAL threshold - need new list urgently
  LOW_LEADS_WARNING: 5000,      // Warning threshold - plan for new list soon
  SEND_VOLUME_THRESHOLD: -20,   // % below average = abnormally low
  TREND_SIGNIFICANT: 5,         // % change to be significant
  MIN_DATA_THRESHOLD: 10000,    // Minimum sends for classification
  NOT_VIABLE_THRESHOLD: 20000,  // Sends threshold for viability check
  NOT_VIABLE_OPP_MAX: 2,        // Max opportunities for "not viable"
};

// Campaign classification types
export type CampaignClassification = 
  | 'NEED NEW LIST'
  | 'NOT PRIORITY'
  | 'REVIEW'
  | 'NO ACTION'
  | 'PENDING';

export interface ClassifiedCampaign {
  name: string;
  id: string;
  status: string;
  
  // Lead metrics
  sent: number;
  contacted: number;
  uncontacted: number;
  totalLeads: number;
  
  // Performance metrics
  replies: number;
  replyRate: number;
  opportunities: number;
  replyToOpp: number;
  bounced: number;
  bounceRate: number;
  
  // Conversion metrics
  positiveReplies: number;
  meetings: number;
  posReplyToMeeting: number;
  
  // Classification
  classification: CampaignClassification;
  reason: string;
  action: string;
  urgency: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  benchmark?: string;
}

export interface CampaignListSummary {
  total: number;
  byClassification: Record<CampaignClassification, string[]>;
  belowBenchmarks: {
    replyRate: string[];
    conversion: string[];
    viability: string[];
  };
  needLeads: Array<{ name: string; remaining: number }>;
  urgent: Array<{ name: string; issue: string; action: string }>;
}

// Diagnostic steps for declining reply rates
export const DIAGNOSTIC_STEPS = [
  'Step 1: Check first line (<12 words?)',
  'Step 2: Test new mechanism reframe',
  'Step 3: Narrow targeting if too broad',
  'Step 4: A/B test new angle',
];

// ============ NEW INTERFACES FOR EXPANDED COMMANDS ============

// Lead list interface
export interface LeadList {
  id: string;
  name: string;
  lead_count: number;
  created_at?: string;
  updated_at?: string;
}

// Block list entry
export interface BlockListEntry {
  id: string;
  value: string;  // email or domain
  type: 'email' | 'domain';
  created_at?: string;
}

// Email template
export interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
  body?: string;
  created_at?: string;
  updated_at?: string;
}

// Subsequence
export interface CampaignSubsequence {
  id: string;
  campaign_id: string;
  name: string;
  trigger_type?: string;
  steps_count?: number;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  user_email?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Workspace info
export interface WorkspaceInfo {
  id: string;
  name: string;
  owner_email?: string;
  plan?: string;
  member_count?: number;
}

// Team member
export interface TeamMember {
  email: string;
  role: string;
  joined_at?: string;
  last_active?: string;
}

// Billing info
export interface BillingInfo {
  plan: string;
  api_calls_used?: number;
  api_calls_limit?: number;
  leads_used?: number;
  leads_limit?: number;
}

// Daily report data for form generation
export interface DailyReportData {
  tasksSummary: Array<{ campaign: string; action: string }>;
  sendVolumeStatus: {
    isLow: boolean;
    sent7Days: number;
    average: number;
    percentChange: number;
  };
  lowLeadsCampaigns: Array<{ name: string; uncontacted: number; action: string }>;
  espCheckResults: Array<{ campaign: string; providers: string[] }>;
  benchmarkIssues: Array<{ campaign: string; metric: string; value: number }>;
  conversionIssues: Array<{ campaign: string; positiveReplies: number; meetings: number; rate: number }>;
  inboxIssues: {
    disconnected: number;
    errors: number;
    byTag: Array<{ tag: string; count: number }>;
  };
  replyTrends: {
    declining: boolean;
    campaigns: Array<{ name: string; change: number }>;
  };
}

// Weekly report data for form generation  
export interface WeeklyReportData extends DailyReportData {
  badVariants: Array<{ campaign: string; variant: string; rate: number }>;
  meetingBookingRate: {
    overall: number;
    below40: Array<{ campaign: string; rate: number }>;
  };
}

// Natural language query patterns
export interface QueryPattern {
  pattern: RegExp;
  command: CommandType;
  extractParams?: (match: RegExpMatchArray) => Record<string, string>;
}

// Query patterns for enhanced natural language processing
export const QUERY_PATTERNS: QueryPattern[] = [
  // Campaign specific queries
  { pattern: /show me (?:the )?(.+?) campaign/i, command: 'campaign_detail', extractParams: (m) => ({ name: m[1] }) },
  { pattern: /tell me (?:more )?about (.+?) campaign/i, command: 'campaign_detail', extractParams: (m) => ({ name: m[1] }) },
  { pattern: /how is (.+?) doing/i, command: 'campaign_detail', extractParams: (m) => ({ name: m[1] }) },
  { pattern: /(.+?) stats/i, command: 'campaign_detail', extractParams: (m) => ({ name: m[1] }) },
  
  // Diagnose specific campaign
  { pattern: /diagnose (.+)/i, command: 'diagnose', extractParams: (m) => ({ campaign: m[1] }) },
  { pattern: /what'?s wrong with (.+)/i, command: 'diagnose', extractParams: (m) => ({ campaign: m[1] }) },
  { pattern: /why is (.+?) (?:not )?(?:performing|working)/i, command: 'diagnose', extractParams: (m) => ({ campaign: m[1] }) },
  { pattern: /analyze (.+)/i, command: 'diagnose', extractParams: (m) => ({ campaign: m[1] }) },
  
  // Lead specific queries
  { pattern: /leads (?:in|for) (.+)/i, command: 'leads_campaign', extractParams: (m) => ({ campaign: m[1] }) },
  { pattern: /how many leads (?:in|for) (.+)/i, command: 'leads_campaign', extractParams: (m) => ({ campaign: m[1] }) },
  
  // Tag specific queries
  { pattern: /(?:show|list) (?:accounts|inboxes) (?:with|tagged) (.+)/i, command: 'accounts_by_tag', extractParams: (m) => ({ tag: m[1] }) },
  { pattern: /inboxes tagged (.+)/i, command: 'accounts_by_tag', extractParams: (m) => ({ tag: m[1] }) },
  
  // Block check
  { pattern: /is (.+?) blocked/i, command: 'block_list', extractParams: (m) => ({ search: m[1] }) },
  { pattern: /check if (.+?) (?:is )?blocked/i, command: 'block_list', extractParams: (m) => ({ search: m[1] }) },
  
  // Email verification
  { pattern: /verify (.+?@.+?\..+)/i, command: 'verify_email', extractParams: (m) => ({ email: m[1] }) },
  { pattern: /check email (.+?@.+?\..+)/i, command: 'verify_email', extractParams: (m) => ({ email: m[1] }) },
  { pattern: /is (.+?@.+?\..+) valid/i, command: 'verify_email', extractParams: (m) => ({ email: m[1] }) },
  
  // Date specific queries
  { pattern: /(?:data|stats|analytics) for today/i, command: 'daily' },
  { pattern: /(?:data|stats|analytics) (?:for )?(?:this|last) week/i, command: 'weekly' },
  { pattern: /(?:data|stats|analytics) (?:for )?(?:last )?7 days/i, command: 'weekly' },
  { pattern: /what happened today/i, command: 'daily' },
  { pattern: /what happened this week/i, command: 'weekly' },
  
  // Question patterns
  { pattern: /which campaigns (?:need|require) (?:new )?leads/i, command: 'low_leads' },
  { pattern: /which campaigns are (?:under)?performing/i, command: 'underperforming' },
  { pattern: /which campaigns (?:are )?not hitting (?:their )?(?:benchmarks|targets)/i, command: 'underperforming' },
  { pattern: /which inboxes (?:are )?(?:disconnected|down|broken)/i, command: 'inbox_issues' },
  { pattern: /which inboxes have (?:sending )?errors/i, command: 'inbox_issues' },
  { pattern: /are (?:there )?(?:any )?(?:disconnected inboxes|inbox errors)/i, command: 'inbox_issues' },
  { pattern: /how (?:many|much) (?:emails )?sent/i, command: 'send_volume' },
  { pattern: /how (?:are|is) (?:the )?campaigns (?:doing|performing)/i, command: 'campaigns' },
  { pattern: /what (?:are )?(?:my )?tasks (?:for )?today/i, command: 'daily_report' },
  { pattern: /what do i need to do/i, command: 'daily_report' },
  
  // Form generation
  { pattern: /fill (?:out )?(?:the )?daily (?:form|checklist)/i, command: 'form_daily' },
  { pattern: /fill (?:out )?(?:the )?weekly (?:form|checklist)/i, command: 'form_weekly' },
  { pattern: /generate (?:the )?daily report/i, command: 'form_daily' },
  { pattern: /generate (?:the )?weekly report/i, command: 'form_weekly' },
];
