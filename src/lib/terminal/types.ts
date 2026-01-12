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

// Command aliases mapping - NATURAL LANGUAGE QUESTIONS
export const COMMAND_ALIASES: Record<string, CommandType> = {
  // ============ CAMPAIGN QUESTIONS ============
  // Primary question format
  'what campaigns are active?': 'campaigns',
  'what campaigns are running?': 'campaigns',
  'how are my campaigns doing?': 'campaigns',
  'show me all campaigns': 'campaigns',
  'what is the status of all campaigns?': 'campaigns',
  // Short aliases
  'list': 'campaigns',
  'campaigns': 'campaigns',
  'active campaigns': 'campaigns',
  'all campaigns': 'campaigns',
  'stats': 'campaigns',
  'performance': 'campaigns',
  
  // ============ DAILY QUESTIONS ============
  // Primary question format
  'what happened today?': 'daily',
  'how did we do today?': 'daily',
  'what are today\'s numbers?': 'daily',
  'show me today\'s metrics': 'daily',
  'what is today\'s performance?': 'daily',
  // Short aliases
  'daily': 'daily',
  'today': 'daily',
  
  // Daily report (form answers)
  'what are my tasks today?': 'daily_report',
  'what do i need to do today?': 'daily_report',
  'what should i check today?': 'daily_report',
  'daily report': 'daily_report',
  'daily tasks': 'daily_report',
  
  // ============ SEND VOLUME QUESTIONS ============
  // Primary question format
  'is send volume normal?': 'send_volume',
  'how many emails did we send?': 'send_volume',
  'what is the send volume?': 'send_volume',
  'are we sending enough emails?': 'send_volume',
  // Short aliases
  'send volume': 'send_volume',
  'volume': 'send_volume',
  
  // 7-day send volume
  'is send volume abnormally low for the past 7 days?': 'send_volume_7d',
  'how is the weekly send volume?': 'send_volume_7d',
  'what is the 7 day send trend?': 'send_volume_7d',
  'send volume 7d': 'send_volume_7d',
  
  // ============ LOW LEADS QUESTIONS ============
  // Primary question format
  'which campaigns need leads?': 'low_leads',
  'what campaigns are low on leads?': 'low_leads',
  'which campaigns have under 3000 leads?': 'low_leads',
  'who needs a new list?': 'low_leads',
  'are any campaigns running out of leads?': 'low_leads',
  // Short aliases
  'low leads': 'low_leads',
  'need leads': 'low_leads',
  
  // ============ BLOCKED DOMAINS QUESTIONS ============
  // Primary question format
  'do any campaigns have blocked leads?': 'blocked_domains',
  'are there microsoft or proofpoint leads?': 'blocked_domains',
  'do any campaigns have microsoft proofpoint mimecast or cisco leads?': 'esp_check',
  'which campaigns have esp blocked leads?': 'esp_check',
  // Short aliases
  'blocked': 'blocked_domains',
  'esp check': 'esp_check',
  
  // ============ WEEKLY QUESTIONS ============
  // Primary question format
  'how was this week?': 'weekly',
  'what happened this week?': 'weekly',
  'how did we do this week?': 'weekly',
  'what are the weekly numbers?': 'weekly',
  'show me the last 7 days': 'weekly',
  // Short aliases
  'weekly': 'weekly',
  'this week': 'weekly',
  'last 7 days': 'weekly',
  
  // Weekly report (form answers)
  'what should i check this week?': 'weekly_report',
  'what are my weekly tasks?': 'weekly_report',
  'wednesday checklist': 'weekly_report',
  'weekly report': 'weekly_report',
  
  // Weekly summary (full checklist)
  'weekly summary': 'weekly_summary',
  
  // ============ BENCHMARK QUESTIONS ============
  // Primary question format
  'are campaigns hitting benchmarks?': 'benchmarks',
  'which campaigns are underperforming?': 'benchmarks',
  'what campaigns are below target?': 'benchmarks',
  'are any campaigns not hitting targets?': 'underperforming',
  // Short aliases
  'benchmarks': 'benchmarks',
  'underperforming': 'underperforming',
  
  // ============ CONVERSION QUESTIONS ============
  // Primary question format
  'what is the positive reply to meeting rate?': 'conversion',
  'how is our booking conversion?': 'conversion',
  'which campaigns have low conversion?': 'low_conversion',
  'what campaigns have sub 40% conversion?': 'low_conversion',
  'are subsequences working?': 'low_conversion',
  // Short aliases
  'conversion': 'conversion',
  'low conversion': 'low_conversion',
  
  // Meetings
  'how many meetings did we book?': 'meetings_booked',
  'what meetings were booked?': 'meetings_booked',
  'meetings booked': 'meetings_booked',
  
  // ============ INBOX HEALTH QUESTIONS ============
  // Primary question format
  'are there any inbox issues?': 'inbox_health',
  'what is the inbox health?': 'inbox_health',
  'are there disconnected inboxes?': 'inbox_issues',
  'which inboxes have errors?': 'inbox_issues',
  'are there disconnected inboxes or inboxes with sending errors?': 'inbox_issues',
  'what inboxes have problems?': 'inbox_issues',
  // Short aliases
  'inbox health': 'inbox_health',
  'inboxes': 'inbox_health',
  'inbox issues': 'inbox_issues',
  
  // Removed inboxes
  'which inboxes were removed?': 'removed_inboxes',
  'removed inboxes': 'removed_inboxes',
  
  // Warmup
  'what is the warmup status?': 'warmup_status',
  'how are inbox health scores?': 'warmup_status',
  'warmup': 'warmup_status',
  
  // ============ TREND QUESTIONS ============
  // Primary question format
  'are reply rates declining?': 'reply_trends',
  'are reply rates trending downward?': 'reply_trends',
  'how are reply rate trends?': 'reply_trends',
  'what is the reply rate trend?': 'reply_trends',
  // Short aliases
  'reply trends': 'reply_trends',
  'trends': 'reply_trends',
  
  // Bad variants
  'which email variants are underperforming?': 'bad_variants',
  'what variants should i trim?': 'bad_variants',
  'bad variants': 'bad_variants',
  
  // ============ LEAD QUESTIONS ============
  // Primary question format
  'how many leads do we have?': 'leads',
  'what is the lead status?': 'leads',
  'who is interested?': 'interested',
  'which leads are interested?': 'interested',
  'who showed interest?': 'interested',
  // Short aliases
  'leads': 'leads',
  'interested': 'interested',
  
  // Lead lists
  'what lead lists are available?': 'lead_lists',
  'show me the lead lists': 'lead_lists',
  'lead lists': 'lead_lists',
  
  // ============ RESOURCE QUESTIONS ============
  // Tags
  'what tags do we have?': 'tags',
  'show me all tags': 'tags',
  'tags': 'tags',
  
  // Block list
  'what is on the block list?': 'block_list',
  'show blocked entries': 'block_list',
  'block list': 'block_list',
  
  // Templates
  'what email templates do we have?': 'templates',
  'show me the templates': 'templates',
  'templates': 'templates',
  
  // Subsequences
  'what subsequences exist?': 'subsequences',
  'show follow up sequences': 'subsequences',
  'subsequences': 'subsequences',
  
  // ============ WORKSPACE QUESTIONS ============
  'what workspace am i in?': 'workspace',
  'show workspace info': 'workspace',
  'workspace': 'workspace',
  
  'who is on my team?': 'team',
  'show team members': 'team',
  'team': 'team',
  
  'what activity happened recently?': 'audit_log',
  'show audit log': 'audit_log',
  'audit log': 'audit_log',
  
  'what is my api usage?': 'billing',
  'billing': 'billing',
  
  // ============ DIAGNOSTIC QUESTIONS ============
  'why is this campaign underperforming?': 'diagnose',
  'what is wrong with this campaign?': 'diagnose',
  'diagnose': 'diagnose',
  
  'is this email valid?': 'verify_email',
  'verify email': 'verify_email',
  
  // ============ UTILITY ============
  'what commands are available?': 'help',
  'how do i use this?': 'help',
  'help': 'help',
  '?': 'help',
  
  'is the api connected?': 'status',
  'test connection': 'status',
  'status': 'status',
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
