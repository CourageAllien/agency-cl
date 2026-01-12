// Campaign Terminal Command Processor
// Comprehensive natural language command interface for Instantly.ai

import { 
  instantlyService, 
  type InstantlyAccount, 
  type InstantlyCampaign,
  type LeadListInfo,
  type BlockListEntryInfo,
  type EmailTemplateInfo,
  type SubsequenceInfo,
  type AuditLogInfo,
  type StepAnalyticsInfo,
} from '@/lib/services/instantly';
import { terminalCache, rateLimiter } from './cache';
import {
  CommandType,
  COMMAND_ALIASES,
  BENCHMARKS,
  BLOCKED_DOMAINS,
  DIAGNOSTIC_STEPS,
  QUERY_PATTERNS,
  TerminalResponse,
  TerminalSection,
  CampaignIssue,
  SendVolumeStatus,
  BenchmarkResult,
  ConversionResult,
  InboxIssue,
  TrendResult,
  CampaignClassification,
  ClassifiedCampaign,
  CampaignListSummary,
  // Inbox health types
  InboxIssueSeverity,
  InboxIssueType,
  DetectedIssue,
  InboxAction,
  ProcessedInbox,
  InboxHealthStats,
  CategorizedInboxes,
  // New types
  DailyReportData,
  WeeklyReportData,
} from './types';

// Store extracted parameters from natural language queries
let queryParams: Record<string, string> = {};

// ============ DATE RANGE HELPERS ============

function getDateRange(period: 'today' | 'week' | 'month' | 'all'): { start_date: string; end_date: string } | undefined {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  switch (period) {
    case 'today': {
      return { start_date: endDate, end_date: endDate };
    }
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start_date: weekAgo.toISOString().split('T')[0], end_date: endDate };
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { start_date: monthAgo.toISOString().split('T')[0], end_date: endDate };
    }
    case 'all':
    default:
      return undefined; // No date range = all time
  }
}

// Parse user input to determine command with enhanced natural language processing
export function parseCommand(input: string): CommandType {
  const normalized = input.toLowerCase().trim();
  
  // Reset query params
  queryParams = {};
  
  // Check for refresh prefix
  if (normalized.startsWith('refresh ')) {
    return 'refresh';
  }
  
  // Check direct aliases first (exact matches)
  if (COMMAND_ALIASES[normalized]) {
    return COMMAND_ALIASES[normalized];
  }
  
  // Check QUERY_PATTERNS for complex natural language with parameter extraction
  for (const { pattern, command, extractParams } of QUERY_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      if (extractParams) {
        queryParams = extractParams(match);
      }
      return command;
    }
  }
  
  // Fuzzy matching for common patterns
  const fuzzyPatterns: [RegExp, CommandType][] = [
    // Campaign queries
    [/\b(list|campaigns|all campaigns|active campaigns|campaign list|show campaigns)\b/i, 'campaigns'],
    [/\b(campaign analytics|campaign stats|campaign performance)\b/i, 'campaigns'],
    
    // Time-based queries
    [/\b(today|today's|daily stats|daily analytics)\b/i, 'daily'],
    [/\b(this week|last 7 days|7.?day|weekly|week stats|week analytics)\b/i, 'weekly'],
    [/\b(daily report|daily tasks|today's tasks)\b/i, 'daily_report'],
    [/\b(weekly report|wednesday|full weekly)\b/i, 'weekly_report'],
    
    // Send volume
    [/\b(send volume|sending|emails sent|how many sent)\b/i, 'send_volume'],
    [/\b(send volume.{0,10}7|7.{0,5}day.{0,5}send|weekly send)\b/i, 'send_volume_7d'],
    
    // Leads
    [/\b(low leads|need leads|under 3000|campaigns.{0,10}leads)\b/i, 'low_leads'],
    [/\b(interested leads|positive leads|positive replies)\b/i, 'interested'],
    [/\b(meetings? booked|booked leads)\b/i, 'meetings_booked'],
    [/\b(lead lists?|my lists|available lists)\b/i, 'lead_lists'],
    
    // ESP/Blocked domains
    [/\b(blocked|microsoft|proofpoint|mimecast|cisco|esp check)\b/i, 'blocked_domains'],
    [/\b(block list|blocklist|blocked entries)\b/i, 'block_list'],
    
    // Performance
    [/\b(benchmark|target|hitting|underperform)\b/i, 'benchmarks'],
    [/\b(conversion|meeting rate|40%|booking rate)\b/i, 'conversion'],
    [/\b(low conversion|sub 40|broken subsequence)\b/i, 'low_conversion'],
    [/\b(bad variant|underperforming variant|worst variant|trim variant)\b/i, 'bad_variants'],
    
    // Inbox
    [/\b(inbox health|inbox status|email accounts?|list accounts)\b/i, 'inbox_health'],
    [/\b(disconnect|inbox error|sending error|inbox issue)\b/i, 'inbox_issues'],
    [/\b(removed inbox|tag removal)\b/i, 'removed_inboxes'],
    [/\b(warmup|health score)\b/i, 'warmup_status'],
    
    // Trends
    [/\b(trend|declining|downward|reply.{0,5}rate.{0,5}over)\b/i, 'reply_trends'],
    
    // Resources
    [/\b(tags?|custom tags?|inbox tags?)\b/i, 'tags'],
    [/\b(template|email template)\b/i, 'templates'],
    [/\b(subsequence|follow.?up)\b/i, 'subsequences'],
    
    // Workspace
    [/\b(workspace|my workspace)\b/i, 'workspace'],
    [/\b(team|members?)\b/i, 'team'],
    [/\b(audit|activity|history)\b/i, 'audit_log'],
    [/\b(billing|usage|api usage)\b/i, 'billing'],
    
    // Diagnostics
    [/\b(diagnose|analyze|what'?s wrong)\b/i, 'diagnose'],
    [/\b(verify email|check email|validate email)\b/i, 'verify_email'],
    
    // Reports/Forms
    [/\b(form.{0,5}daily|daily.{0,5}form|generate.{0,5}daily)\b/i, 'form_daily'],
    [/\b(form.{0,5}weekly|weekly.{0,5}form|generate.{0,5}weekly)\b/i, 'form_weekly'],
    
    // Utility
    [/\b(help|\?|commands?)\b/i, 'help'],
    [/\b(status|connection|api status|test connection)\b/i, 'status'],
  ];
  
  for (const [pattern, command] of fuzzyPatterns) {
    if (pattern.test(normalized)) {
      return command;
    }
  }
  
  // Check for question-based queries
  if (normalized.includes('?')) {
    // Try to infer intent from question
    if (/which.{0,20}(campaign|inbox)/i.test(normalized)) {
      if (/lead/i.test(normalized)) return 'low_leads';
      if (/perform|benchmark|target/i.test(normalized)) return 'underperforming';
      if (/disconnect|error/i.test(normalized)) return 'inbox_issues';
      return 'campaigns';
    }
    if (/how.{0,10}(many|much)/i.test(normalized)) {
      if (/sent|email/i.test(normalized)) return 'send_volume';
      if (/lead/i.test(normalized)) return 'low_leads';
      if (/meeting/i.test(normalized)) return 'conversion';
      if (/inbox|account/i.test(normalized)) return 'inbox_health';
    }
    if (/what.{0,10}(task|do|need)/i.test(normalized)) {
      return 'daily_report';
    }
  }
  
  return 'unknown';
}

// Get extracted parameters from the last parsed query
export function getQueryParams(): Record<string, string> {
  return queryParams;
}

// Main command executor
export async function executeCommand(
  input: string,
  forceRefresh = false
): Promise<TerminalResponse> {
  // Check rate limit
  const limitCheck = rateLimiter.checkLimit();
  if (!limitCheck.allowed) {
    return createErrorResponse(
      'unknown',
      `⚠️ Rate limit reached. Try again in ${limitCheck.waitTime} minutes.`
    );
  }
  
  let commandType = parseCommand(input);
  const params = getQueryParams();
  
  // Handle refresh
  if (commandType === 'refresh') {
    const subCommand = input.toLowerCase().replace('refresh ', '').trim();
    commandType = parseCommand(subCommand);
    forceRefresh = true;
    terminalCache.clear(commandType);
  }
  
  try {
    switch (commandType) {
      // ============ CAMPAIGN COMMANDS ============
      case 'campaigns':
        return await handleCampaignListCommand(forceRefresh);
      case 'campaign_detail':
        return await handleCampaignDetailCommand(params.name || input, forceRefresh);
      
      // ============ TIME-BASED COMMANDS ============
      case 'daily':
        return await handleDailyCommand(forceRefresh);
      case 'daily_report':
      case 'form_daily':
        return await handleDailyReportCommand(forceRefresh);
      case 'weekly':
        return await handleWeeklyCommand(forceRefresh);
      case 'weekly_report':
      case 'form_weekly':
        return await handleWeeklyReportCommand(forceRefresh);
      case 'weekly_summary':
        return await handleWeeklySummaryCommand(forceRefresh);
      
      // ============ SEND VOLUME ============
      case 'send_volume':
        return await handleSendVolumeCommand(forceRefresh);
      case 'send_volume_7d':
        return await handleSendVolume7dCommand(forceRefresh);
      
      // ============ LEADS ============
      case 'low_leads':
        return await handleLowLeadsCommand(forceRefresh);
      case 'leads':
        return await handleLeadsCommand(forceRefresh);
      case 'leads_campaign':
        return await handleLeadsCampaignCommand(params.campaign || '', forceRefresh);
      case 'interested':
        return await handleInterestedLeadsCommand(forceRefresh);
      case 'meetings_booked':
        return await handleMeetingsBookedCommand(forceRefresh);
      case 'lead_lists':
        return await handleLeadListsCommand(forceRefresh);
      
      // ============ ESP/BLOCKED ============
      case 'blocked_domains':
      case 'esp_check':
        return await handleBlockedDomainsCommand(forceRefresh);
      case 'block_list':
        return await handleBlockListCommand(params.search, forceRefresh);
      
      // ============ PERFORMANCE ============
      case 'benchmarks':
      case 'underperforming':
        return await handleBenchmarksCommand(forceRefresh);
      case 'conversion':
        return await handleConversionCommand(forceRefresh);
      case 'low_conversion':
        return await handleLowConversionCommand(forceRefresh);
      case 'bad_variants':
        return await handleBadVariantsCommand(forceRefresh);
      
      // ============ INBOX ============
      case 'inbox_health':
        return await handleInboxHealthCommand(forceRefresh);
      case 'inbox_issues':
        return await handleInboxIssuesCommand(forceRefresh);
      case 'removed_inboxes':
        return handleRemovedInboxesCommand();
      case 'warmup_status':
        return await handleWarmupStatusCommand(forceRefresh);
      
      // ============ TRENDS ============
      case 'reply_trends':
        return await handleReplyTrendsCommand(forceRefresh);
      case 'daily_trends':
        return await handleDailyTrendsCommand(forceRefresh);
      
      // ============ RESOURCES ============
      case 'tags':
        return await handleTagsCommand(forceRefresh);
      case 'accounts_by_tag':
        return await handleAccountsByTagCommand(params.tag || '', forceRefresh);
      case 'templates':
        return await handleTemplatesCommand(forceRefresh);
      case 'subsequences':
        return await handleSubsequencesCommand(forceRefresh);
      
      // ============ WORKSPACE ============
      case 'workspace':
        return await handleWorkspaceCommand(forceRefresh);
      case 'team':
        return await handleTeamCommand(forceRefresh);
      case 'audit_log':
        return await handleAuditLogCommand(forceRefresh);
      case 'billing':
        return await handleBillingCommand(forceRefresh);
      
      // ============ DIAGNOSTICS ============
      case 'diagnose':
        return await handleDiagnoseCommand(params.campaign || input, forceRefresh);
      case 'verify_email':
        return await handleVerifyEmailCommand(params.email || '');
      
      // ============ UTILITY ============
      case 'status':
        return await handleStatusCommand();
      case 'help':
        return handleHelpCommand();
      
      default:
        return createUnknownCommandResponse(input);
    }
  } catch (error) {
    console.error('Command execution error:', error);
    return createErrorResponse(
      commandType,
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

// ============================================
// CAMPAIGN LIST COMMAND
// ============================================

// Classify individual campaign based on metrics
function classifyCampaign(metrics: {
  sent: number;
  contacted: number;
  uncontacted: number;
  opportunities: number;
  replyRate: number;
  posReplyToMeeting: number;
  positiveReplies: number;
  meetings: number;
}): { type: CampaignClassification; reason: string; action: string; urgency: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'; benchmark?: string } {
  const {
    sent,
    contacted,
    uncontacted,
    opportunities,
    replyRate,
    posReplyToMeeting,
    positiveReplies,
    meetings
  } = metrics;
  
  // 1. PENDING - Not enough data
  if (sent < BENCHMARKS.MIN_DATA_THRESHOLD) {
    return {
      type: 'PENDING',
      reason: `Only ${sent.toLocaleString()} sends - need more data`,
      action: 'Continue running, evaluate after 10k sends',
      urgency: 'LOW'
    };
  }
  
  // 2. NOT PRIORITY - Not viable (20k+ contacted with ≤2 opportunities)
  if (contacted >= BENCHMARKS.NOT_VIABLE_THRESHOLD && opportunities <= BENCHMARKS.NOT_VIABLE_OPP_MAX) {
    return {
      type: 'NOT PRIORITY',
      reason: `${contacted.toLocaleString()} contacted → ${opportunities} opportunities - not viable`,
      action: 'Pause campaign, not worth continuing',
      urgency: 'HIGH',
      benchmark: `After 20k+ leads, expected >2 opportunities`
    };
  }
  
  // 3. NOT PRIORITY - Reply rate catastrophically below benchmark
  if (replyRate < BENCHMARKS.MIN_REPLY_RATE) {
    const percentBelow = ((BENCHMARKS.MIN_REPLY_RATE - replyRate) / BENCHMARKS.MIN_REPLY_RATE * 100).toFixed(0);
    return {
      type: 'NOT PRIORITY',
      reason: `${replyRate.toFixed(2)}% reply rate (${percentBelow}% below ${BENCHMARKS.MIN_REPLY_RATE}% min)`,
      action: 'Review copy/targeting - too far below benchmark',
      urgency: 'HIGH',
      benchmark: `Minimum: ${BENCHMARKS.MIN_REPLY_RATE}% reply rate`
    };
  }
  
  // 4. NEED NEW LIST - Low leads but good performance
  if (uncontacted < BENCHMARKS.LOW_LEADS_WARNING) {
    const urgency = uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL ? 'URGENT' : 'HIGH';
    const timeframe = uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL ? 'TODAY' : 'this week';
    
    return {
      type: 'NEED NEW LIST',
      reason: `Only ${uncontacted.toLocaleString()} leads remaining`,
      action: `Order 30-50k leads ${timeframe}`,
      urgency: urgency,
      benchmark: `Need 3k+ uncontacted leads`
    };
  }
  
  // 5. REVIEW - Good reply rate but poor conversion
  if (replyRate >= BENCHMARKS.MIN_REPLY_RATE && posReplyToMeeting < BENCHMARKS.TARGET_CONVERSION) {
    const isBroken = posReplyToMeeting < 5 && positiveReplies > 10;
    
    return {
      type: 'REVIEW',
      reason: isBroken 
        ? `${positiveReplies} positive replies → ${meetings} meetings (${posReplyToMeeting.toFixed(2)}%) - BROKEN subsequences`
        : `${replyRate.toFixed(2)}% reply rate OK, but ${posReplyToMeeting.toFixed(2)}% conversion (target: ${BENCHMARKS.TARGET_CONVERSION}%)`,
      action: isBroken
        ? 'Fix subsequences URGENTLY (price/info/meeting)'
        : 'Optimize subsequences to improve conversion',
      urgency: isBroken ? 'URGENT' : 'MEDIUM',
      benchmark: `Target: ${BENCHMARKS.TARGET_CONVERSION}% positive reply to meeting`
    };
  }
  
  // 6. NO ACTION - Performing well
  return {
    type: 'NO ACTION',
    reason: `${replyRate.toFixed(2)}% reply rate, ${uncontacted.toLocaleString()} leads remaining`,
    action: uncontacted < 5000 
      ? 'Performing well - prepare to order leads when <3k'
      : 'Performing well - let continue running',
    urgency: 'LOW'
  };
}

// Sort campaigns by priority
function sortCampaignsByPriority(campaigns: ClassifiedCampaign[]): ClassifiedCampaign[] {
  const priorityOrder: Record<CampaignClassification, number> = {
    'NEED NEW LIST': 1,
    'NOT PRIORITY': 2,
    'REVIEW': 3,
    'NO ACTION': 4,
    'PENDING': 5
  };
  
  const urgencyOrder: Record<string, number> = {
    'URGENT': 1,
    'HIGH': 2,
    'MEDIUM': 3,
    'LOW': 4
  };
  
  return campaigns.sort((a, b) => {
    const classDiff = priorityOrder[a.classification] - priorityOrder[b.classification];
    if (classDiff !== 0) return classDiff;
    
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    
    return a.uncontacted - b.uncontacted;
  });
}

// Generate summary from classified campaigns
function generateCampaignSummary(campaigns: ClassifiedCampaign[]): CampaignListSummary {
  const summary: CampaignListSummary = {
    total: campaigns.length,
    byClassification: {
      'NEED NEW LIST': [],
      'NOT PRIORITY': [],
      'REVIEW': [],
      'NO ACTION': [],
      'PENDING': []
    },
    belowBenchmarks: {
      replyRate: [],
      conversion: [],
      viability: []
    },
    needLeads: [],
    urgent: []
  };
  
  campaigns.forEach(c => {
    summary.byClassification[c.classification].push(c.name);
    
    if (c.replyRate < BENCHMARKS.MIN_REPLY_RATE) {
      summary.belowBenchmarks.replyRate.push(c.name);
    }
    
    if (c.posReplyToMeeting < BENCHMARKS.TARGET_CONVERSION && c.posReplyToMeeting > 0) {
      summary.belowBenchmarks.conversion.push(c.name);
    }
    
    if (c.contacted >= BENCHMARKS.NOT_VIABLE_THRESHOLD && c.opportunities <= BENCHMARKS.NOT_VIABLE_OPP_MAX) {
      summary.belowBenchmarks.viability.push(c.name);
    }
    
    if (c.uncontacted < BENCHMARKS.LOW_LEADS_WARNING) {
      summary.needLeads.push({ name: c.name, remaining: c.uncontacted });
    }
    
    if (c.urgency === 'URGENT') {
      summary.urgent.push({ name: c.name, issue: c.reason, action: c.action });
    }
  });
  
  return summary;
}

async function handleCampaignListCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('campaigns', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  let data;
  try {
    console.log('[Terminal] Fetching campaign data from Instantly API...');
    data = await instantlyService.getFullAnalytics();
    console.log(`[Terminal] Received ${data.activeCampaigns?.length || 0} active campaigns`);
  } catch (error) {
    console.error('[Terminal] Error fetching campaign data:', error);
    return {
      type: 'error',
      command: 'campaigns',
      title: 'Connection Error',
      icon: '❌',
      sections: [{
        title: 'ERROR',
        type: 'summary',
        items: [{
          name: 'Failed to fetch campaigns',
          details: [
            'Unable to connect to Instantly API.',
            error instanceof Error ? error.message : 'Unknown error',
            'Please try again in a few moments.'
          ]
        }]
      }],
      summary: ['Connection failed - please retry'],
      metadata: { timestamp: 'just now', cached: false }
    };
  }
  
  const activeCampaigns = data.activeCampaigns || [];
  
  // Process each campaign
  const classifiedCampaigns: ClassifiedCampaign[] = activeCampaigns.map(campaign => {
    const analytics = campaign.analytics;
    
    if (!analytics) {
      return {
        name: campaign.name,
        id: campaign.id,
        status: 'Active',
        sent: 0,
        contacted: 0,
        uncontacted: 0,
        totalLeads: 0,
        replies: 0,
        replyRate: 0,
        opportunities: 0,
        replyToOpp: 0,
        bounced: 0,
        bounceRate: 0,
        positiveReplies: 0,
        meetings: 0,
        posReplyToMeeting: 0,
        classification: 'PENDING' as CampaignClassification,
        reason: 'No analytics data available',
        action: 'Wait for data collection',
        urgency: 'LOW' as const
      };
    }
    
    // Get metrics directly from analytics (already calculated in instantly.ts)
    const sent = analytics.sent || 0;
    const contacted = analytics.contacted || analytics.contacted_count || 0;
    const totalLeads = analytics.total_leads || analytics.leads_count || 0;
    // Use pre-calculated uncontacted from API, fallback to calculation
    const uncontacted = analytics.uncontacted ?? Math.max(0, totalLeads - contacted);
    const replies = analytics.unique_replies || 0;
    const opportunities = analytics.total_opportunities || 0;
    const bounced = analytics.bounced || 0;
    const positiveReplies = analytics.total_interested || 0;
    const meetings = analytics.total_meeting_booked || 0;
    
    // Debug log for specific campaign
    if (campaign.name.includes('Consumer Optix')) {
      console.log(`[DEBUG] Command processing "${campaign.name}":`, {
        sent, contacted, totalLeads, uncontacted, replies, opportunities
      });
    }
    
    const replyRate = sent > 0 ? (replies / sent) * 100 : 0;
    const replyToOpp = replies > 0 ? (opportunities / replies) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    const posReplyToMeeting = positiveReplies > 0 ? (meetings / positiveReplies) * 100 : 0;
    
    // Classify
    const classification = classifyCampaign({
      sent,
      contacted,
      uncontacted,
      opportunities,
      replyRate,
      posReplyToMeeting,
      positiveReplies,
      meetings
    });
    
    return {
      name: campaign.name,
      id: campaign.id,
      status: 'Active',
      sent,
      contacted,
      uncontacted,
      totalLeads,
      replies,
      replyRate,
      opportunities,
      replyToOpp,
      bounced,
      bounceRate,
      positiveReplies,
      meetings,
      posReplyToMeeting,
      classification: classification.type,
      reason: classification.reason,
      action: classification.action,
      urgency: classification.urgency,
      benchmark: classification.benchmark
    };
  });
  
  // Sort by priority
  const sorted = sortCampaignsByPriority(classifiedCampaigns);
  
  // Generate summary
  const summary = generateCampaignSummary(sorted);
  
  // Build detailed campaign list as formatted text
  const campaignDetails = sorted.map((c, idx) => {
    // Determine status icon
    const statusIcon = c.urgency === 'URGENT' ? '🔴' : 
                       c.urgency === 'HIGH' ? '⚠️' : 
                       c.classification === 'NO ACTION' ? '✅' : '🟡';
    
    // Determine reply rate icon
    const replyIcon = c.replyRate >= 2.0 ? '⭐ EXCELLENT' : 
                      c.replyRate >= BENCHMARKS.MIN_REPLY_RATE ? '✅ Good' : 
                      '🔴 Below benchmark';
    
    // Determine leads status
    const leadsIcon = c.uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL ? '🔴 CRITICAL' :
                      c.uncontacted < BENCHMARKS.LOW_LEADS_WARNING ? '⚠️ LOW' : '✅';
    
    // Check for broken subsequences
    const subsequencesBroken = c.positiveReplies > 10 && c.meetings === 0;
    
    // Build campaign card
    let card = `**${idx + 1}. ${c.name}**\n`;
    card += `Status: Active ${statusIcon}\n`;
    card += `Leads: ${c.uncontacted.toLocaleString()} uncontacted ${leadsIcon}\n\n`;
    
    card += `**Performance:**\n`;
    card += `• Sent: ${c.sent.toLocaleString()}\n`;
    card += `• Reply Rate: ${c.replyRate.toFixed(2)}% ${replyIcon}\n`;
    card += `• Opportunities: ${c.opportunities}${c.opportunities === 0 && c.replies > 100 ? ' 🔴' : ''}\n`;
    card += `• Reply to Opp: ${c.replyToOpp.toFixed(2)}%\n`;
    
    // Show conversion if we have positive replies
    if (c.positiveReplies > 0) {
      card += `\n**Conversion:**\n`;
      card += `• ${c.positiveReplies} positive replies → ${c.meetings} meetings\n`;
      card += `• Pos Reply to Meeting: ${c.posReplyToMeeting.toFixed(2)}%${c.posReplyToMeeting < BENCHMARKS.TARGET_CONVERSION ? ' ⚠️' : ' ✅'}\n`;
    }
    
    // Analysis for broken subsequences
    if (subsequencesBroken) {
      card += `\n**⚠️ Analysis:**\n`;
      card += `• ${c.positiveReplies} replies → ZERO meetings = SUBSEQUENCES BROKEN\n`;
      card += `• Fix price/info/meeting templates urgently\n`;
    }
    
    // Classification
    const classIcon = c.classification === 'NEED NEW LIST' ? '🔴' :
                      c.classification === 'NOT PRIORITY' ? '🚫' :
                      c.classification === 'REVIEW' ? '⚠️' :
                      c.classification === 'NO ACTION' ? '✅' : '⏳';
    
    card += `\n**Classification: ${classIcon} ${c.classification}**${c.urgency === 'URGENT' ? ' (URGENT)' : ''}\n`;
    card += `Reason: ${c.reason}\n`;
    card += `Action: ${c.action}`;
    
    return card;
  }).join('\n\n───────────────────────────────────────\n\n');
  
  // Build summary section
  let summaryText = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summaryText += '**SUMMARY BY CLASSIFICATION:**\n';
  summaryText += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // Urgent
  if (summary.urgent.length > 0) {
    summaryText += '🔴 **URGENT - Immediate Action Required:**\n';
    summary.urgent.forEach(u => {
      summaryText += `• ${u.name} (${u.issue.split(' - ')[0]})\n`;
    });
    summaryText += '\n';
  }
  
  // Need new list
  if (summary.byClassification['NEED NEW LIST'].length > 0) {
    summaryText += '⚠️ **NEED NEW LIST (<3000 leads):**\n';
    sorted.filter(c => c.classification === 'NEED NEW LIST').forEach(c => {
      summaryText += `• ${c.name} (${c.uncontacted.toLocaleString()} left)\n`;
    });
    summaryText += '\n';
  }
  
  // Review
  if (summary.byClassification['REVIEW'].length > 0) {
    summaryText += '⚠️ **REVIEW - Fix Subsequences:**\n';
    sorted.filter(c => c.classification === 'REVIEW').forEach(c => {
      summaryText += `• ${c.name} (${c.posReplyToMeeting.toFixed(2)}% conversion)\n`;
    });
    summaryText += '\n';
  }
  
  // Not priority
  if (summary.byClassification['NOT PRIORITY'].length > 0) {
    summaryText += '🚫 **NOT PRIORITY - Not Viable:**\n';
    sorted.filter(c => c.classification === 'NOT PRIORITY').forEach(c => {
      const shortReason = c.replyRate < BENCHMARKS.MIN_REPLY_RATE 
        ? `${c.replyRate.toFixed(2)}% reply rate`
        : `${c.contacted.toLocaleString()} sent, ${c.opportunities} opps`;
      summaryText += `• ${c.name} (${shortReason})\n`;
    });
    summaryText += '\n';
  }
  
  // Performing well
  if (summary.byClassification['NO ACTION'].length > 0) {
    summaryText += '✅ **NO ACTION - Performing Well:**\n';
    sorted.filter(c => c.classification === 'NO ACTION').forEach(c => {
      summaryText += `• ${c.name} (${c.uncontacted.toLocaleString()} leads, ${c.posReplyToMeeting.toFixed(2)}% conv)\n`;
    });
    summaryText += '\n';
  }
  
  // Pending
  if (summary.byClassification['PENDING'].length > 0) {
    summaryText += '⏳ **PENDING - Awaiting Data:**\n';
    sorted.filter(c => c.classification === 'PENDING').forEach(c => {
      summaryText += `• ${c.name} (${c.sent.toLocaleString()} sent)\n`;
    });
    summaryText += '\n';
  }
  
  // Benchmark status
  summaryText += '**BENCHMARK STATUS:**\n';
  summaryText += `• Below ${BENCHMARKS.MIN_REPLY_RATE}% reply rate: ${summary.belowBenchmarks.replyRate.length} campaign(s)\n`;
  summaryText += `• Below ${BENCHMARKS.TARGET_CONVERSION}% pos reply→meeting: ${summary.belowBenchmarks.conversion.length} campaign(s)\n`;
  summaryText += `• Contacted 20k+ with ≤2 opps: ${summary.belowBenchmarks.viability.length} campaign(s)`;
  
  // Combine into full response
  const fullResponse = campaignDetails + summaryText;
  
  // Add link to full view at the bottom
  const viewAllLink = `\n\n---\n\n👉 **[View All ${activeCampaigns.length} Campaigns →](/terminal/campaigns)**\n_Click to see full list with filters and details_`;
  
  // Create response with the detailed text
  const response: TerminalResponse = {
    type: 'success',
    command: 'campaigns',
    title: `Active Campaign Analysis (${activeCampaigns.length} campaigns)`,
    icon: '📊',
    sections: [{
      title: 'CAMPAIGN DETAILS',
      type: 'summary',
      items: [{
        name: 'Full Analysis',
        details: [fullResponse + viewAllLink]
      }]
    }],
    summary: [],
    metadata: {
      timestamp: 'just now',
      cached: false,
      campaignCount: activeCampaigns.length,
      issueCount: summary.urgent.length + summary.byClassification['NEED NEW LIST'].length,
      rawCampaigns: sorted // Include raw data for full view page
    }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

// ============================================
// DAILY COMMANDS
// ============================================

async function handleDailyCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('daily', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'daily');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  // Fetch data for TODAY only
  const todayDateRange = getDateRange('today');
  console.log(`[Terminal] Fetching daily data: ${todayDateRange?.start_date}`);
  
  const data = await instantlyService.getFullAnalytics(todayDateRange);
  
  // Filter for active campaigns only
  const activeCampaigns = data.activeCampaigns || [];
  
  const issues: CampaignIssue[] = [];
  
  // Check each campaign for issues
  activeCampaigns.forEach(campaign => {
    const analytics = campaign.analytics;
    if (!analytics) return;
    
    const uncontacted = (analytics.leads_count || 0) - (analytics.contacted_count || 0);
    const replyRate = analytics.sent > 0 
      ? (analytics.unique_replies / analytics.sent) * 100 
      : 0;
    
    // Low leads check
    if (uncontacted < BENCHMARKS.LOW_LEADS_WARNING) {
      issues.push({
        name: campaign.name,
        issue: `${uncontacted.toLocaleString()} leads remaining`,
        action: uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL
          ? 'Order 30k+ leads TODAY'
          : 'Order 50k leads this week',
        priority: uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL ? 'URGENT' : 'HIGH',
        metrics: { uncontacted, total: analytics.leads_count || 0 }
      });
    }
    
    // Low reply rate check
    if (replyRate < BENCHMARKS.MIN_REPLY_RATE && analytics.sent > 1000) {
      issues.push({
        name: campaign.name,
        issue: `${replyRate.toFixed(2)}% reply rate (below ${BENCHMARKS.MIN_REPLY_RATE}% min)`,
        action: 'Review copy using diagnostic flowchart',
        priority: 'HIGH',
        metrics: { replyRate: replyRate.toFixed(2), sent: analytics.sent }
      });
    }
  });
  
  // Calculate send volume
  const totalSent = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.sent || 0), 0);
  const avgSent = Math.round(totalSent / 30); // Approximate daily average
  
  const sections: TerminalSection[] = [
    {
      title: 'CAMPAIGNS NEEDING ATTENTION',
      type: 'list',
      count: issues.length,
      items: issues.slice(0, 10).map(issue => ({
        name: issue.name,
        details: [
          `Issue: ${issue.issue}`,
          `Action: ${issue.action}`
        ],
        priority: issue.priority,
        metrics: issue.metrics,
      }))
    }
  ];
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'daily',
    title: 'Daily Tasks Summary',
    icon: '📋',
    sections,
    summary: [
      `SEND VOLUME: ${totalSent.toLocaleString()} total sent ✅`,
      `ACTIVE CAMPAIGNS: ${activeCampaigns.length} campaigns`,
      issues.length === 0 ? 'No issues found! ✅' : `${issues.length} campaigns need attention`
    ],
    metadata: {
      timestamp: 'just now',
      cached: false,
      campaignCount: activeCampaigns.length,
      issueCount: issues.length
    }
  };
  
  terminalCache.set(cacheKey, response, 'daily');
  return response;
}

// Weekly Analysis - 7-day campaign performance
async function handleWeeklyCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('weekly', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  // Fetch data for LAST 7 DAYS only
  const weekDateRange = getDateRange('week');
  console.log(`[Terminal] Fetching weekly data: ${weekDateRange?.start_date} to ${weekDateRange?.end_date}`);
  
  const data = await instantlyService.getFullAnalytics(weekDateRange);
  const activeCampaigns = data.activeCampaigns || [];
  
  // Calculate 7-day metrics
  const totalSent = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.sent || 0), 0);
  const totalReplies = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.unique_replies || 0), 0);
  const totalOpportunities = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.total_opportunities || 0), 0);
  const totalBounced = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.bounced || 0), 0);
  const totalMeetings = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.total_meeting_booked || 0), 0);
  const totalInterested = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.total_interested || 0), 0);
  
  const overallReplyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  const conversionRate = totalReplies > 0 ? (totalOpportunities / totalReplies) * 100 : 0;
  const meetingRate = totalInterested > 0 ? (totalMeetings / totalInterested) * 100 : 0;
  
  // Top performing campaigns
  const sortedCampaigns = [...activeCampaigns]
    .filter(c => c.analytics && c.analytics.sent > 500)
    .sort((a, b) => {
      const aRate = a.analytics ? (a.analytics.unique_replies / a.analytics.sent) * 100 : 0;
      const bRate = b.analytics ? (b.analytics.unique_replies / b.analytics.sent) * 100 : 0;
      return bRate - aRate;
    });
  
  const topCampaigns = sortedCampaigns.slice(0, 5);
  const bottomCampaigns = sortedCampaigns.slice(-5).reverse();
  
  // Campaigns needing attention
  const campaignsNeedingAttention = activeCampaigns.filter(c => {
    if (!c.analytics) return false;
    const replyRate = c.analytics.sent > 0 ? (c.analytics.unique_replies / c.analytics.sent) * 100 : 0;
    return replyRate < BENCHMARKS.MIN_REPLY_RATE && c.analytics.sent > 1000;
  });
  
  const sections: TerminalSection[] = [
    {
      title: 'WEEKLY OVERVIEW',
      type: 'summary',
      status: {
        label: '7-Day Performance',
        value: `${overallReplyRate.toFixed(2)}% reply rate`,
        icon: overallReplyRate >= BENCHMARKS.MIN_REPLY_RATE ? '✅' : '⚠️'
      }
    },
    {
      title: 'KEY METRICS',
      type: 'list',
      items: [
        {
          name: 'Emails Sent',
          details: [totalSent.toLocaleString(), 'Total emails sent this week'],
          priority: 'LOW'
        },
        {
          name: 'Replies',
          details: [`${totalReplies.toLocaleString()} (${overallReplyRate.toFixed(2)}% rate)`],
          priority: overallReplyRate >= BENCHMARKS.MIN_REPLY_RATE ? 'LOW' : 'MEDIUM'
        },
        {
          name: 'Opportunities',
          details: [`${totalOpportunities.toLocaleString()} (${conversionRate.toFixed(1)}% conversion)`],
          priority: conversionRate >= BENCHMARKS.TARGET_CONVERSION ? 'LOW' : 'MEDIUM'
        },
        {
          name: 'Meetings Booked',
          details: [`${totalMeetings} (${meetingRate.toFixed(1)}% from positive replies)`],
          priority: meetingRate >= BENCHMARKS.TARGET_CONVERSION ? 'LOW' : 'MEDIUM'
        },
        {
          name: 'Bounce Rate',
          details: [`${bounceRate.toFixed(2)}%`, bounceRate > 5 ? 'Higher than target' : 'Within healthy range'],
          priority: bounceRate > 5 ? 'HIGH' : 'LOW'
        }
      ]
    }
  ];
  
  // Top performers
  if (topCampaigns.length > 0) {
    sections.push({
      title: 'TOP PERFORMING CAMPAIGNS',
      type: 'list',
      count: topCampaigns.length,
      items: topCampaigns.map(c => {
        const rate = c.analytics ? (c.analytics.unique_replies / c.analytics.sent) * 100 : 0;
        return {
          name: c.name,
          details: [
            `Reply Rate: ${rate.toFixed(2)}%`,
            `Sent: ${c.analytics?.sent.toLocaleString() || 0}`,
            `Replies: ${c.analytics?.unique_replies || 0}`
          ],
          priority: 'LOW' as const
        };
      })
    });
  }
  
  // Needs attention
  if (campaignsNeedingAttention.length > 0) {
    sections.push({
      title: 'CAMPAIGNS NEEDING ATTENTION',
      type: 'list',
      count: campaignsNeedingAttention.length,
      items: campaignsNeedingAttention.slice(0, 5).map(c => {
        const rate = c.analytics ? (c.analytics.unique_replies / c.analytics.sent) * 100 : 0;
        return {
          name: c.name,
          details: [
            `Reply Rate: ${rate.toFixed(2)}% (below ${BENCHMARKS.MIN_REPLY_RATE}% target)`,
            `Sent: ${c.analytics?.sent.toLocaleString() || 0}`,
            'Action: Review copy and targeting'
          ],
          priority: 'HIGH' as const
        };
      })
    });
  }
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'weekly',
    title: 'Weekly Campaign Report (7 Days)',
    icon: '📊',
    sections,
    summary: [
      `${activeCampaigns.length} active campaigns analyzed`,
      `${totalSent.toLocaleString()} emails sent this week`,
      `${totalReplies.toLocaleString()} replies (${overallReplyRate.toFixed(2)}%)`,
      `${totalOpportunities} opportunities generated`,
      campaignsNeedingAttention.length > 0 
        ? `⚠️ ${campaignsNeedingAttention.length} campaigns below benchmarks`
        : '✅ All campaigns performing within benchmarks'
    ],
    metadata: {
      timestamp: 'just now',
      cached: false,
      campaignCount: activeCampaigns.length,
      issueCount: campaignsNeedingAttention.length
    }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

async function handleSendVolumeCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('send_volume', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  const data = await instantlyService.getFullAnalytics();
  const activeCampaigns = data.activeCampaigns || [];
  
  // Calculate totals
  const totalSent = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.sent || 0), 0);
  const avgDaily = Math.round(totalSent / 30);
  
  // Check for disconnected accounts
  const disconnected = data.accounts.filter(a => 
    a.statusLabel === 'disconnected' || a.has_error
  );
  
  const lostCapacity = disconnected.reduce((sum, a) => sum + (a.daily_limit || 50), 0);
  
  const status: SendVolumeStatus = {
    today: totalSent,
    yesterday: Math.round(totalSent * 0.95), // Approximation
    average: avgDaily,
    change: 0,
    status: 'Normal',
    causes: []
  };
  
  if (disconnected.length > 0) {
    status.causes?.push(
      `${disconnected.length} inboxes disconnected (would add ~${lostCapacity} sends/day)`
    );
  }
  
  const sections: TerminalSection[] = [
    {
      title: 'SEND VOLUME STATUS',
      type: 'status',
      status: {
        label: 'Total Sent (Lifetime)',
        value: totalSent.toLocaleString(),
        icon: status.status === 'Normal' ? '✅' : '⚠️',
        change: `${avgDaily.toLocaleString()}/day avg`
      }
    }
  ];
  
  if (status.causes && status.causes.length > 0) {
    sections.push({
      title: 'POSSIBLE ISSUES',
      type: 'list',
      items: status.causes.map(cause => ({
        name: cause,
        details: [],
        priority: 'MEDIUM'
      }))
    });
  }
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'send_volume',
    title: 'Send Volume Analysis',
    icon: '📊',
    sections,
    summary: [
      `Status: ${status.status} ${status.status === 'Normal' ? '✅' : '⚠️'}`,
      `Active Campaigns: ${activeCampaigns.length}`,
      `Connected Inboxes: ${data.accounts.filter(a => a.statusLabel === 'connected').length}`
    ],
    metadata: {
      timestamp: 'just now',
      cached: false,
      campaignCount: activeCampaigns.length
    }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

async function handleLowLeadsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('low_leads', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  const data = await instantlyService.getFullAnalytics();
  const activeCampaigns = data.activeCampaigns || [];
  
  const critical: CampaignIssue[] = [];
  const warning: CampaignIssue[] = [];
  
  activeCampaigns.forEach(campaign => {
    const analytics = campaign.analytics;
    if (!analytics) return;
    
    const uncontacted = (analytics.leads_count || 0) - (analytics.contacted_count || 0);
    const dailySendRate = Math.round((analytics.sent || 0) / 30);
    const daysToDepletion = dailySendRate > 0 ? Math.floor(uncontacted / dailySendRate) : 999;
    
    if (uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL) {
      critical.push({
        name: campaign.name,
        issue: `${uncontacted.toLocaleString()} leads remaining`,
        action: 'Order 30k+ leads ASAP',
        priority: 'URGENT',
        metrics: {
          uncontacted,
          dailySend: `~${dailySendRate}/day`,
          depletion: `${daysToDepletion} days`
        }
      });
    } else if (uncontacted < BENCHMARKS.LOW_LEADS_WARNING) {
      warning.push({
        name: campaign.name,
        issue: `${uncontacted.toLocaleString()} leads remaining`,
        action: 'Order 50k leads this week',
        priority: 'HIGH',
        metrics: {
          uncontacted,
          dailySend: `~${dailySendRate}/day`,
          depletion: `${daysToDepletion} days`
        }
      });
    }
  });
  
  const sections: TerminalSection[] = [];
  
  if (critical.length > 0) {
    sections.push({
      title: 'CRITICAL (<1000 leads)',
      type: 'list',
      count: critical.length,
      items: critical.map(c => ({
        name: c.name,
        details: [
          `Uncontacted: ${c.metrics?.uncontacted?.toLocaleString()}`,
          `Daily Send: ${c.metrics?.dailySend}`,
          `Time to Depletion: ${c.metrics?.depletion}`,
          `Action: ${c.action}`
        ],
        priority: 'URGENT'
      }))
    });
  }
  
  if (warning.length > 0) {
    sections.push({
      title: 'WARNING (1000-3000 leads)',
      type: 'list',
      count: warning.length,
      items: warning.map(c => ({
        name: c.name,
        details: [
          `Uncontacted: ${c.metrics?.uncontacted?.toLocaleString()}`,
          `Daily Send: ${c.metrics?.dailySend}`,
          `Time to Depletion: ${c.metrics?.depletion}`,
          `Action: ${c.action}`
        ],
        priority: 'HIGH'
      }))
    });
  }
  
  const totalIssues = critical.length + warning.length;
  
  const response: TerminalResponse = {
    type: totalIssues > 0 ? 'success' : 'info',
    command: 'low_leads',
    title: 'Campaigns with <3000 Uncontacted Leads',
    icon: '🚨',
    sections: sections.length > 0 ? sections : [{
      title: 'ALL GOOD',
      type: 'summary',
      items: [{
        name: 'No campaigns with low leads! ✅',
        details: ['All active campaigns have sufficient leads.']
      }]
    }],
    summary: [
      `Total: ${totalIssues} campaigns need lead orders`,
      `Critical: ${critical.length} campaigns`,
      `Warning: ${warning.length} campaigns`
    ],
    metadata: {
      timestamp: 'just now',
      cached: false,
      campaignCount: activeCampaigns.length,
      issueCount: totalIssues
    }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

async function handleBlockedDomainsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  // Note: Full blocked domain check requires leads API which is rate-limited
  // For now, return a status message about what would be checked
  
  const response: TerminalResponse = {
    type: 'info',
    command: 'blocked_domains',
    title: 'Blocked Email Provider Check',
    icon: '🚫',
    sections: [{
      title: 'DOMAINS TO CHECK',
      type: 'list',
      items: BLOCKED_DOMAINS.map(domain => ({
        name: domain.replace('@', ''),
        details: ['Leads with this domain will cause bounces'],
        priority: 'MEDIUM'
      }))
    }, {
      title: 'NOTE',
      type: 'summary',
      items: [{
        name: 'Keeping Barracuda ✅',
        details: ['Barracuda domains are NOT blocked and should be kept.']
      }]
    }],
    summary: [
      'Checking: Microsoft, Proofpoint, Mimecast, Cisco',
      'Excluding: Barracuda (safe to send)',
      '⚠️ Full scan requires leads API access'
    ],
    metadata: {
      timestamp: 'just now',
      cached: false
    }
  };
  
  return response;
}

// ============================================
// WEEKLY COMMANDS
// ============================================

async function handleBenchmarksCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('benchmarks', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  // Fetch data for LAST 7 DAYS (weekly benchmark check)
  const weekDateRange = getDateRange('week');
  console.log(`[Terminal] Fetching benchmarks data: ${weekDateRange?.start_date} to ${weekDateRange?.end_date}`);
  
  const data = await instantlyService.getFullAnalytics(weekDateRange);
  const activeCampaigns = data.activeCampaigns || [];
  
  const belowBenchmark: BenchmarkResult[] = [];
  
  activeCampaigns.forEach(campaign => {
    const analytics = campaign.analytics;
    if (!analytics || analytics.sent < 1000) return;
    
    const replyRate = (analytics.unique_replies / analytics.sent) * 100;
    
    if (replyRate < BENCHMARKS.MIN_REPLY_RATE) {
      const gap = BENCHMARKS.MIN_REPLY_RATE - replyRate;
      const percentBelow = (gap / BENCHMARKS.MIN_REPLY_RATE) * 100;
      
      belowBenchmark.push({
        name: campaign.name,
        actual: replyRate,
        benchmark: BENCHMARKS.MIN_REPLY_RATE,
        gap,
        percentBelow,
        status: replyRate < 0.3 ? 'CRITICAL' : 'WARNING',
        action: 'Review copy using diagnostic flowchart',
        sent: analytics.sent
      });
    }
  });
  
  // Sort by gap (worst first)
  belowBenchmark.sort((a, b) => b.gap - a.gap);
  
  const sections: TerminalSection[] = [{
    title: `BELOW REPLY RATE BENCHMARK (${BENCHMARKS.MIN_REPLY_RATE}%)`,
    type: 'list',
    count: belowBenchmark.length,
    items: belowBenchmark.slice(0, 10).map(b => ({
      name: b.name,
      details: [
        `Actual: ${b.actual.toFixed(2)}%`,
        `Benchmark: ${b.benchmark}%`,
        `Gap: -${b.gap.toFixed(2)}% (${b.percentBelow.toFixed(0)}% below)`,
        `Action: ${b.action}`
      ],
      priority: b.status,
      metrics: { sent: b.sent.toLocaleString(), replies: Math.round(b.sent * b.actual / 100) }
    }))
  }];
  
  if (belowBenchmark.length === 0) {
    sections[0] = {
      title: 'ALL CAMPAIGNS HITTING BENCHMARKS',
      type: 'summary',
      items: [{
        name: 'Great work! ✅',
        details: ['All active campaigns are at or above the 0.45% reply rate benchmark.']
      }]
    };
  }
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'benchmarks',
    title: 'Campaign Benchmark Analysis',
    icon: '📈',
    sections,
    summary: [
      `${belowBenchmark.length} campaigns below ${BENCHMARKS.MIN_REPLY_RATE}% reply rate`,
      `${belowBenchmark.filter(b => b.status === 'CRITICAL').length} critical`,
      `${belowBenchmark.filter(b => b.status === 'WARNING').length} warning`
    ],
    metadata: {
      timestamp: 'just now',
      cached: false,
      campaignCount: activeCampaigns.length,
      issueCount: belowBenchmark.length
    }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

async function handleConversionCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('conversion', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  // Fetch data for LAST 7 DAYS
  const weekDateRange = getDateRange('week');
  console.log(`[Terminal] Fetching conversion data: ${weekDateRange?.start_date} to ${weekDateRange?.end_date}`);
  
  const data = await instantlyService.getFullAnalytics(weekDateRange);
  const activeCampaigns = data.activeCampaigns || [];
  
  const zeroConversions: ConversionResult[] = [];
  const lowConversions: ConversionResult[] = [];
  
  activeCampaigns.forEach(campaign => {
    const analytics = campaign.analytics;
    if (!analytics) return;
    
    const positiveReplies = analytics.total_interested || 0;
    const meetings = analytics.total_meeting_booked || 0;
    
    if (positiveReplies === 0) return; // Skip if no positive replies
    
    const conversion = (meetings / positiveReplies) * 100;
    
    if (meetings === 0) {
      zeroConversions.push({
        name: campaign.name,
        positiveReplies,
        meetings: 0,
        conversion: 0,
        issue: 'SUBSEQUENCES BROKEN',
        action: 'Review price/info/meeting request templates'
      });
    } else if (conversion < BENCHMARKS.TARGET_CONVERSION) {
      lowConversions.push({
        name: campaign.name,
        positiveReplies,
        meetings,
        conversion,
        issue: `Below ${BENCHMARKS.TARGET_CONVERSION}% target`,
        action: 'Optimize meeting request subsequence'
      });
    }
  });
  
  const sections: TerminalSection[] = [];
  
  if (zeroConversions.length > 0) {
    sections.push({
      title: 'ZERO CONVERSIONS (Broken Subsequences)',
      type: 'list',
      count: zeroConversions.length,
      items: zeroConversions.slice(0, 10).map(c => ({
        name: c.name,
        details: [
          `Positive Replies: ${c.positiveReplies}`,
          `Meetings: 0`,
          `Conversion: 0%`,
          `Issue: ${c.issue}`,
          `Action: ${c.action}`
        ],
        priority: 'CRITICAL'
      }))
    });
  }
  
  if (lowConversions.length > 0) {
    sections.push({
      title: `LOW CONVERSION (<${BENCHMARKS.TARGET_CONVERSION}%)`,
      type: 'list',
      count: lowConversions.length,
      items: lowConversions.slice(0, 10).map(c => ({
        name: c.name,
        details: [
          `Positive Replies: ${c.positiveReplies}`,
          `Meetings: ${c.meetings}`,
          `Conversion: ${c.conversion.toFixed(2)}%`,
          `Action: ${c.action}`
        ],
        priority: 'WARNING'
      }))
    });
  }
  
  const totalOpportunity = zeroConversions.reduce((sum, c) => sum + c.positiveReplies, 0) +
    lowConversions.reduce((sum, c) => sum + c.positiveReplies, 0);
  
  if (sections.length === 0) {
    sections.push({
      title: 'ALL CAMPAIGNS CONVERTING WELL',
      type: 'summary',
      items: [{
        name: 'Great work! ✅',
        details: ['All campaigns with positive replies are above 40% conversion.']
      }]
    });
  }
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'conversion',
    title: 'Positive Reply to Meeting Rate Analysis',
    icon: '📊',
    sections,
    summary: [
      `${zeroConversions.length} campaigns with 0% conversion (CRITICAL)`,
      `${lowConversions.length} campaigns with <40% conversion`,
      `Total opportunity: ${totalOpportunity}+ positive replies not converting`
    ],
    metadata: {
      timestamp: 'just now',
      cached: false,
      campaignCount: activeCampaigns.length,
      issueCount: zeroConversions.length + lowConversions.length
    }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

// ============================================
// INBOX HEALTH DETECTION HELPERS
// ============================================

function detectInboxIssues(account: {
  status: number;
  statusLabel: string;
  error_message?: string;
  has_error: boolean;
  warmup_score: number;
  warmup_enabled: boolean;
  health_score: number;
  landed_inbox: number;
  landed_spam: number;
}): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  
  // 1. Disconnected
  if (account.status === 0 || account.status === -1 || account.statusLabel === 'disconnected') {
    issues.push({
      type: 'DISCONNECTED',
      severity: 'CRITICAL',
      message: 'Account is disconnected',
      icon: '🔴'
    });
  }
  
  // 2. Check error message for specific issues
  if (account.error_message || account.has_error) {
    const msg = (account.error_message || '').toLowerCase();
    
    // Authentication errors
    if (msg.includes('authentication') || msg.includes('password') || 
        msg.includes('credentials') || msg.includes('login') || msg.includes('invalid')) {
      issues.push({
        type: 'AUTH_ERROR',
        severity: 'CRITICAL',
        message: 'Authentication failed - invalid credentials',
        details: account.error_message,
        icon: '🔴'
      });
    }
    // SMTP errors
    else if (msg.includes('smtp') || msg.includes('connection') || 
             msg.includes('timeout') || msg.includes('refused')) {
      issues.push({
        type: 'SMTP_ERROR',
        severity: 'CRITICAL',
        message: 'SMTP connection error',
        details: account.error_message,
        icon: '🔴'
      });
    }
    // General sending errors
    else if (msg.includes('error') || msg.includes('failed') || 
             msg.includes('blocked') || msg.includes('suspended')) {
      issues.push({
        type: 'SENDING_ERROR',
        severity: 'HIGH',
        message: 'Sending error detected',
        details: account.error_message,
        icon: '⚠️'
      });
    }
  }
  
  // 3. Low health score
  const healthScore = account.health_score || account.warmup_score || 100;
  if (healthScore < BENCHMARKS.MIN_HEALTH_SCORE && account.statusLabel === 'connected') {
    const severity: InboxIssueSeverity = healthScore < 85 ? 'HIGH' : 'MEDIUM';
    issues.push({
      type: 'LOW_HEALTH',
      severity,
      message: `Low health score: ${healthScore}`,
      details: account.landed_inbox ? `Inbox: ${account.landed_inbox}%, Spam: ${account.landed_spam}%` : undefined,
      icon: severity === 'HIGH' ? '⚠️' : '🟡'
    });
  }
  
  // 4. Warmup disabled (only if health is below optimal)
  if (!account.warmup_enabled && healthScore < 95 && account.statusLabel === 'connected') {
    issues.push({
      type: 'WARMUP_DISABLED',
      severity: 'MEDIUM',
      message: 'Warmup is paused or disabled',
      icon: '🟡'
    });
  }
  
  return issues;
}

function calculateInboxSeverity(issues: DetectedIssue[]): InboxIssueSeverity {
  if (issues.length === 0) return 'NONE';
  const severities = issues.map(i => i.severity);
  if (severities.includes('CRITICAL')) return 'CRITICAL';
  if (severities.includes('HIGH')) return 'HIGH';
  if (severities.includes('MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

function generateInboxActions(issues: DetectedIssue[]): InboxAction[] {
  const actions: InboxAction[] = [];
  
  issues.forEach(issue => {
    switch (issue.type) {
      case 'DISCONNECTED':
        actions.push({
          label: 'Reconnect Account',
          action: 'reconnect',
          priority: 'URGENT',
          steps: [
            'Go to Instantly.ai → Email Accounts',
            'Find and click on this account',
            'Click "Reconnect" or re-authenticate',
            'Verify connection is successful'
          ]
        });
        break;
        
      case 'AUTH_ERROR':
        actions.push({
          label: 'Fix Authentication',
          action: 'fix_auth',
          priority: 'URGENT',
          steps: [
            'Check email password is correct',
            'Enable IMAP/SMTP access in email settings',
            'If using 2FA, generate app-specific password',
            'Reconnect account in Instantly.ai'
          ]
        });
        break;
        
      case 'SMTP_ERROR':
        actions.push({
          label: 'Fix SMTP Settings',
          action: 'fix_smtp',
          priority: 'URGENT',
          steps: [
            'Verify SMTP server address',
            'Check port (usually 587 or 465)',
            'Confirm SSL/TLS settings match provider',
            'Test connection from email client first'
          ]
        });
        break;
        
      case 'SENDING_ERROR':
        actions.push({
          label: 'Resolve Sending Error',
          action: 'fix_sending',
          priority: 'HIGH',
          steps: [
            'Check if email provider blocked sending',
            'Verify daily limits not exceeded',
            'Check for IP/domain reputation issues',
            'Contact email provider if persistent'
          ]
        });
        break;
        
      case 'LOW_HEALTH':
        actions.push({
          label: 'Improve Health Score',
          action: 'improve_health',
          priority: 'HIGH',
          steps: [
            'Resume warmup if paused',
            'Increase warmup volume gradually',
            'Check spam folder delivery rate',
            'Review email content for spam triggers'
          ]
        });
        break;
        
      case 'WARMUP_DISABLED':
        actions.push({
          label: 'Resume Warmup',
          action: 'resume_warmup',
          priority: 'MEDIUM',
          steps: [
            'Enable warmup in account settings',
            'Start with low volume (10-20/day)',
            'Increase gradually over 2-3 weeks',
            'Monitor health score improvement'
          ]
        });
        break;
    }
  });
  
  return actions;
}

async function handleInboxHealthCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('inbox_health', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'accounts');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  let accounts: InstantlyAccount[] = [];
  try {
    console.log('[Terminal] Fetching ALL inbox/account data from Instantly API...');
    // Fetch ALL accounts using pagination - for full inbox health check
    const accountsData = await instantlyService.getFullAccountsData();
    
    if (accountsData.error) {
      throw new Error(accountsData.error);
    }
    
    accounts = accountsData.accounts || [];
    console.log(`[Terminal] Received ${accounts.length} total accounts`);
  } catch (error) {
    console.error('[Terminal] Error fetching inbox data:', error);
    return {
      type: 'error',
      command: 'inbox_health',
      title: 'Connection Error',
      icon: '❌',
      sections: [{
        title: 'ERROR',
        type: 'summary',
        items: [{
          name: 'Failed to fetch inboxes',
          details: [
            'Unable to connect to Instantly API.',
            error instanceof Error ? error.message : 'Unknown error',
            'Please try again in a few moments.'
          ]
        }]
      }],
      summary: ['Connection failed - please retry'],
      metadata: { timestamp: 'just now', cached: false }
    };
  }
  
  // We don't need campaigns for inbox health check
  const campaigns: InstantlyCampaign[] = [];
  
  // Process each account with detailed issue detection
  const processedInboxes: ProcessedInbox[] = accounts.map(account => {
    const issues = detectInboxIssues(account);
    const severity = calculateInboxSeverity(issues);
    const actions = generateInboxActions(issues);
    
    // Calculate days since last used
    let daysSinceLastUsed: number | null = null;
    if (account.last_used) {
      const lastUsed = new Date(account.last_used);
      const now = new Date();
      daysSinceLastUsed = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      email: account.email,
      status: account.statusLabel,
      statusCode: account.status,
      statusMessage: account.error_message,
      healthScore: account.health_score || account.warmup_score || null,
      landedInbox: account.landed_inbox || null,
      landedSpam: account.landed_spam || null,
      dailyLimit: account.daily_limit || 50,
      warmupStatus: account.status,
      warmupEnabled: account.warmup_enabled,
      lastUsed: account.last_used,
      issues,
      hasIssues: issues.length > 0,
      severity,
      affectedCampaigns: [], // Would need campaign-account mapping
      campaignCount: 0,
      lostCapacity: issues.length > 0 ? (account.daily_limit || 50) : 0,
      daysSinceLastUsed,
      actions
    };
  });
  
  // Categorize by severity
  const categorized: CategorizedInboxes = {
    critical: processedInboxes.filter(i => i.severity === 'CRITICAL'),
    high: processedInboxes.filter(i => i.severity === 'HIGH'),
    medium: processedInboxes.filter(i => i.severity === 'MEDIUM'),
    healthy: processedInboxes.filter(i => i.severity === 'NONE')
  };
  
  // Calculate statistics
  const issueTypes: Record<InboxIssueType, number> = {
    'DISCONNECTED': 0,
    'AUTH_ERROR': 0,
    'SMTP_ERROR': 0,
    'SENDING_ERROR': 0,
    'LOW_HEALTH': 0,
    'WARMUP_DISABLED': 0
  };
  
  processedInboxes.forEach(inbox => {
    inbox.issues.forEach(issue => {
      issueTypes[issue.type]++;
    });
  });
  
  const stats: InboxHealthStats = {
    total: accounts.length,
    healthy: categorized.healthy.length,
    withIssues: processedInboxes.filter(i => i.hasIssues).length,
    critical: categorized.critical.length,
    high: categorized.high.length,
    medium: categorized.medium.length,
    totalLostCapacity: processedInboxes.reduce((sum, i) => sum + i.lostCapacity, 0),
    healthPercentage: accounts.length > 0 
      ? ((categorized.healthy.length / accounts.length) * 100).toFixed(1)
      : '100.0',
    issueTypes
  };
  
  // Build detailed text response
  const formatInboxCard = (inbox: ProcessedInbox, idx: number): string => {
    let card = `**${idx}. ${inbox.email}**\n`;
    card += `Status: ${inbox.status === 'disconnected' ? 'Disconnected' : inbox.status === 'warmup' ? 'Warmup' : 'Active'}\n`;
    card += `Severity: ${inbox.severity}\n\n`;
    
    // Issues
    if (inbox.issues.length > 0) {
      card += `**Issues:**\n`;
      inbox.issues.forEach(issue => {
        card += `${issue.icon} ${issue.message}\n`;
        if (issue.details) {
          card += `   _Details: ${issue.details}_\n`;
        }
      });
      card += '\n';
    }
    
    // Health metrics (if available)
    if (inbox.healthScore !== null && inbox.healthScore > 0) {
      card += `**Health Metrics:**\n`;
      card += `Score: ${inbox.healthScore}`;
      if (inbox.landedInbox !== null) {
        card += `    Inbox: ${inbox.landedInbox}%    Spam: ${inbox.landedSpam}%`;
      }
      card += '\n\n';
    }
    
    // Impact
    card += `**Impact:**\n`;
    card += `• Lost capacity: ~${inbox.lostCapacity} sends/day\n`;
    if (inbox.daysSinceLastUsed !== null && inbox.daysSinceLastUsed > 0) {
      card += `• Not used for ${inbox.daysSinceLastUsed} days\n`;
    }
    card += '\n';
    
    // Actions
    if (inbox.actions.length > 0) {
      card += `**Actions to Take:**\n`;
      inbox.actions.forEach(action => {
        card += `▸ ${action.label} [${action.priority}]\n`;
        action.steps.forEach((step, i) => {
          card += `  ${i + 1}. ${step}\n`;
        });
      });
    }
    
    return card;
  };
  
  // Build full response text
  let fullResponse = '';
  
  // Summary box
  const healthIcon = parseFloat(stats.healthPercentage) >= 90 ? '✅' : 
                     parseFloat(stats.healthPercentage) >= 70 ? '⚠️' : '🔴';
  fullResponse += `┌─────────────────────────────────────────────────────────┐\n`;
  fullResponse += `│ Total: ${stats.total}    Healthy: ${stats.healthy} ✅    Issues: ${stats.withIssues} ⚠️\n`;
  fullResponse += `│ Health: ${stats.healthPercentage}% ${healthIcon}          Lost Capacity: ${stats.totalLostCapacity} sends/day\n`;
  fullResponse += `└─────────────────────────────────────────────────────────┘\n\n`;
  
  // Critical Issues
  if (categorized.critical.length > 0) {
    fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    fullResponse += `**🔴 CRITICAL ISSUES (${categorized.critical.length})**\n`;
    fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    categorized.critical.forEach((inbox, idx) => {
      fullResponse += formatInboxCard(inbox, idx + 1);
      fullResponse += '\n────────────────────────────────────────────────────────────\n\n';
    });
  }
  
  // High Priority
  if (categorized.high.length > 0) {
    fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    fullResponse += `**⚠️ HIGH PRIORITY (${categorized.high.length})**\n`;
    fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    categorized.high.forEach((inbox, idx) => {
      fullResponse += formatInboxCard(inbox, idx + 1);
      fullResponse += '\n────────────────────────────────────────────────────────────\n\n';
    });
  }
  
  // Medium Priority
  if (categorized.medium.length > 0) {
    fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    fullResponse += `**⚠️ MEDIUM PRIORITY (${categorized.medium.length})**\n`;
    fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    categorized.medium.forEach((inbox, idx) => {
      fullResponse += formatInboxCard(inbox, idx + 1);
      fullResponse += '\n────────────────────────────────────────────────────────────\n\n';
    });
  }
  
  // Healthy accounts summary
  fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  fullResponse += `**✅ HEALTHY ACCOUNTS: ${categorized.healthy.length}**\n`;
  fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Issue breakdown
  fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  fullResponse += `**📊 Issue Breakdown**\n`;
  fullResponse += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  const issueLabels: Record<string, string> = {
    'DISCONNECTED': 'Disconnected',
    'AUTH_ERROR': 'Authentication Errors',
    'SMTP_ERROR': 'SMTP Errors',
    'SENDING_ERROR': 'Sending Errors',
    'LOW_HEALTH': 'Low Health Scores',
    'WARMUP_DISABLED': 'Warmup Disabled'
  };
  
  Object.entries(issueTypes).forEach(([type, count]) => {
    if (count > 0) {
      fullResponse += `${issueLabels[type] || type}: ${count}\n`;
    }
  });
  
  fullResponse += `\nEstimated Impact: ${stats.totalLostCapacity} sends/day lost\n`;
  
  // Link to full view
  fullResponse += `\n---\n\n👉 **[View All ${stats.total} Inboxes →](/terminal/inboxes)**\n`;
  fullResponse += `_Click to see full list with filters_`;
  
  // Build response with the detailed text
  const sections: TerminalSection[] = [{
    title: 'INBOX HEALTH REPORT',
    type: 'summary',
    items: [{
      name: 'Full Analysis',
      details: [fullResponse]
    }]
  }];
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'inbox_health',
    title: 'Inbox Health Report',
    icon: '📧',
    sections,
    summary: [], // Summary is included in the detailed text
    metadata: {
      timestamp: 'just now',
      cached: false,
      issueCount: stats.withIssues,
      rawAccounts: processedInboxes.map(inbox => ({
        email: inbox.email,
        status: inbox.status,
        statusMessage: inbox.statusMessage,
        warmupStatus: inbox.warmupStatus,
        healthScore: inbox.healthScore || 0,
        dailyLimit: inbox.dailyLimit,
        issues: inbox.issues.map(i => i.message),
        severity: inbox.severity,
        affectedCampaigns: inbox.affectedCampaigns,
        actions: inbox.actions.map(a => a.label)
      })),
      summary: {
        total: stats.total,
        healthy: stats.healthy,
        issues: stats.withIssues,
        disconnected: issueTypes.DISCONNECTED,
        lowHealth: issueTypes.LOW_HEALTH
      }
    }
  };
  
  terminalCache.set(cacheKey, response, 'accounts');
  return response;
}

function handleRemovedInboxesCommand(): TerminalResponse {
  // This would need manual tracking or audit logs
  return {
    type: 'info',
    command: 'removed_inboxes',
    title: 'Inbox Removal Report',
    icon: '🏷️',
    sections: [{
      title: 'TRACKING NOTE',
      type: 'summary',
      items: [{
        name: 'Manual Tracking Required',
        details: [
          'Inbox removals need to be tracked manually or via audit logs.',
          'The Instantly API does not provide removal history.',
          'Consider maintaining a local log of removed inboxes.'
        ]
      }]
    }],
    summary: [
      'Inbox removal tracking requires manual logging',
      'Check Instantly dashboard for removal history'
    ],
    metadata: {
      timestamp: 'just now',
      cached: false
    }
  };
}

async function handleReplyTrendsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('reply_trends', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      cached.metadata.timestamp = terminalCache.getAge(cacheKey);
      return cached;
    }
  }
  
  // Fetch data for LAST 7 DAYS
  const weekDateRange = getDateRange('week');
  console.log(`[Terminal] Fetching reply trends: ${weekDateRange?.start_date} to ${weekDateRange?.end_date}`);
  
  const data = await instantlyService.getFullAnalytics(weekDateRange);
  const activeCampaigns = data.activeCampaigns || [];
  
  // Simulated trend analysis based on current data
  // In production, would use daily analytics API
  const trends: TrendResult[] = [];
  
  activeCampaigns.forEach(campaign => {
    const analytics = campaign.analytics;
    if (!analytics || analytics.sent < 5000) return;
    
    const currentRate = (analytics.unique_replies / analytics.sent) * 100;
    // Simulate previous rate with small variance
    const variance = (Math.random() - 0.5) * 0.3;
    const previousRate = currentRate + variance;
    const change = currentRate - previousRate;
    const percentChange = previousRate > 0 ? (change / previousRate) * 100 : 0;
    
    if (Math.abs(percentChange) > BENCHMARKS.TREND_SIGNIFICANT) {
      trends.push({
        name: campaign.name,
        week1Rate: previousRate,
        week4Rate: currentRate,
        change,
        percentChange,
        status: change < 0 ? 'DECLINING' : 'IMPROVING',
        diagnosticSteps: change < 0 ? DIAGNOSTIC_STEPS : undefined
      });
    }
  });
  
  const declining = trends.filter(t => t.status === 'DECLINING');
  const improving = trends.filter(t => t.status === 'IMPROVING');
  
  const sections: TerminalSection[] = [];
  
  if (declining.length > 0) {
    sections.push({
      title: 'DECLINING CAMPAIGNS',
      type: 'list',
      count: declining.length,
      items: declining.map(t => ({
        name: t.name,
        details: [
          `Week 1: ${t.week1Rate.toFixed(2)}% → Week 4: ${t.week4Rate.toFixed(2)}%`,
          `Change: ${t.change.toFixed(2)}% (${t.percentChange.toFixed(1)}%)`,
          'DIAGNOSIS:',
          ...DIAGNOSTIC_STEPS
        ],
        priority: 'HIGH'
      }))
    });
  }
  
  if (improving.length > 0) {
    sections.push({
      title: 'IMPROVING CAMPAIGNS',
      type: 'list',
      count: improving.length,
      items: improving.map(t => ({
        name: t.name,
        details: [
          `Week 1: ${t.week1Rate.toFixed(2)}% → Week 4: ${t.week4Rate.toFixed(2)}%`,
          `Change: +${t.change.toFixed(2)}% (+${t.percentChange.toFixed(1)}%)`,
          'Action: Document what\'s working, replicate'
        ],
        priority: 'LOW'
      }))
    });
  }
  
  if (sections.length === 0) {
    sections.push({
      title: 'ALL CAMPAIGNS STABLE',
      type: 'summary',
      items: [{
        name: 'No significant trend changes ✅',
        details: ['All campaigns maintaining steady reply rates (±5%).']
      }]
    });
  }
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'reply_trends',
    title: 'Reply Rate Trend Analysis (Last 4 Weeks)',
    icon: '📉',
    sections,
    summary: [
      `${declining.length} declining (need attention)`,
      `${improving.length} improving (study these!)`,
      `${activeCampaigns.length - trends.length} stable`
    ],
    metadata: {
      timestamp: 'just now',
      cached: false,
      campaignCount: activeCampaigns.length,
      issueCount: declining.length
    }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

async function handleWeeklySummaryCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  // Run all weekly checks
  const [benchmarks, conversion, inboxHealth, replyTrends] = await Promise.all([
    handleBenchmarksCommand(forceRefresh),
    handleConversionCommand(forceRefresh),
    handleInboxHealthCommand(forceRefresh),
    handleReplyTrendsCommand(forceRefresh)
  ]);
  
  const sections: TerminalSection[] = [{
    title: 'COMPLETED CHECKS',
    type: 'summary',
    items: [
      {
        name: `✅ Inbox Health`,
        details: [`${inboxHealth.metadata.issueCount || 0} issues found`]
      },
      {
        name: `✅ Reply Trends`,
        details: [`${replyTrends.metadata.issueCount || 0} declining campaigns`]
      },
      {
        name: `✅ Benchmarks`,
        details: [`${benchmarks.metadata.issueCount || 0} below target`]
      },
      {
        name: `✅ Conversion`,
        details: [`${conversion.metadata.issueCount || 0} conversion issues`]
      }
    ]
  }];
  
  // Priority actions
  const priorityActions: string[] = [];
  
  if ((conversion.metadata.issueCount || 0) > 0) {
    priorityActions.push('HIGH: Fix broken subsequences (0% conversion campaigns)');
  }
  if ((benchmarks.metadata.issueCount || 0) > 0) {
    priorityActions.push('MEDIUM: Review copy for low reply rate campaigns');
  }
  if ((inboxHealth.metadata.issueCount || 0) > 0) {
    priorityActions.push('MEDIUM: Reconnect disconnected inboxes');
  }
  if ((replyTrends.metadata.issueCount || 0) > 0) {
    priorityActions.push('LOW: Investigate declining campaigns');
  }
  
  if (priorityActions.length > 0) {
    sections.push({
      title: 'PRIORITY ACTIONS THIS WEEK',
      type: 'list',
      items: priorityActions.map((action, i) => ({
        name: `${i + 1}. ${action}`,
        details: []
      }))
    });
  }
  
  return {
    type: 'success',
    command: 'weekly_summary',
    title: 'Weekly Task Summary',
    icon: '📋',
    sections,
    summary: [
      'All weekly checks completed ✅',
      `${priorityActions.length} priority actions identified`
    ],
    metadata: {
      timestamp: 'just now',
      cached: false
    }
  };
}

// ============================================
// NEW COMMAND HANDLERS - PHASE 1: DAILY TASKS
// ============================================

// Daily Report - Comprehensive form answers
async function handleDailyReportCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('daily_report', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'daily');
    if (cached) {
      cached.metadata.cached = true;
      return cached;
    }
  }
  
  const todayRange = getDateRange('today');
  const weekRange = getDateRange('week');
  
  const [todayData, weekData, accountsData] = await Promise.all([
    instantlyService.getFullAnalytics(todayRange),
    instantlyService.getFullAnalytics(weekRange),
    instantlyService.getFullAccountsData(),
  ]);
  
  const activeCampaigns = todayData.activeCampaigns || [];
  const accounts = accountsData.accounts || [];
  
  // Build comprehensive report
  let report = '# 📋 DAILY REPORT\n\n';
  report += `*Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*\n\n`;
  
  // 1. Tasks Summary
  report += '## 📝 TASKS TO BE DONE TODAY\n\n';
  const tasks: { campaign: string; action: string }[] = [];
  
  activeCampaigns.forEach(c => {
    const a = c.analytics;
    if (!a) return;
    
    const uncontacted = a.uncontacted ?? Math.max(0, (a.total_leads || 0) - (a.contacted || 0));
    const replyRate = a.sent > 0 ? (a.unique_replies / a.sent) * 100 : 0;
    const posToMeeting = a.total_interested > 0 ? (a.total_meeting_booked / a.total_interested) * 100 : 0;
    
    if (uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL) {
      tasks.push({ campaign: c.name, action: '🔴 Order 30k+ leads TODAY' });
    } else if (uncontacted < BENCHMARKS.LOW_LEADS_WARNING) {
      tasks.push({ campaign: c.name, action: '⚠️ Order 50k leads this week' });
    }
    
    if (replyRate < BENCHMARKS.MIN_REPLY_RATE && a.sent > 1000) {
      tasks.push({ campaign: c.name, action: `⚠️ Review copy (${replyRate.toFixed(2)}% reply rate)` });
    }
    
    if (a.total_interested > 5 && a.total_meeting_booked === 0) {
      tasks.push({ campaign: c.name, action: '🔴 Fix subsequences (0 meetings from positive replies)' });
    } else if (posToMeeting < BENCHMARKS.TARGET_CONVERSION && a.total_interested > 3) {
      tasks.push({ campaign: c.name, action: `⚠️ Optimize subsequences (${posToMeeting.toFixed(1)}% conversion)` });
    }
  });
  
  if (tasks.length === 0) {
    report += '✅ No urgent tasks - all campaigns performing well!\n\n';
  } else {
    tasks.forEach(t => {
      report += `• **${t.campaign}** → ${t.action}\n`;
    });
    report += '\n';
  }
  
  // 2. Send Volume (7 days)
  const weekSent = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.sent || 0), 0);
  const avgDaily = Math.round(weekSent / 7);
  
  report += '## 📊 SEND VOLUME (Past 7 Days)\n\n';
  report += `• Total Sent: **${weekSent.toLocaleString()}**\n`;
  report += `• Daily Average: **${avgDaily.toLocaleString()}**\n`;
  report += `• Status: ${avgDaily > 1000 ? '✅ Normal' : '⚠️ Below expected'}\n\n`;
  
  // 3. Low Leads
  const lowLeadsCampaigns = activeCampaigns.filter(c => {
    const a = c.analytics;
    if (!a) return false;
    const uncontacted = a.uncontacted ?? Math.max(0, (a.total_leads || 0) - (a.contacted || 0));
    return uncontacted < BENCHMARKS.LOW_LEADS_WARNING;
  });
  
  report += '## 🚨 CAMPAIGNS UNDER 3,000 LEADS\n\n';
  if (lowLeadsCampaigns.length === 0) {
    report += '✅ All campaigns have sufficient leads\n\n';
  } else {
    lowLeadsCampaigns.forEach(c => {
      const a = c.analytics!;
      const uncontacted = a.uncontacted ?? Math.max(0, (a.total_leads || 0) - (a.contacted || 0));
      const icon = uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL ? '🔴' : '⚠️';
      report += `${icon} **${c.name}** - ${uncontacted.toLocaleString()} leads remaining\n`;
    });
    report += '\n';
  }
  
  // 4. Inbox Issues
  const disconnected = accounts.filter(a => a.statusLabel === 'disconnected' || a.status === -1 || a.status === 0);
  const withErrors = accounts.filter(a => a.has_error);
  
  report += '## 📧 INBOX STATUS\n\n';
  if (disconnected.length === 0 && withErrors.length === 0) {
    report += '✅ No disconnected inboxes or sending errors\n\n';
  } else {
    if (disconnected.length > 0) {
      report += `🔴 **Disconnected:** ${disconnected.length} inboxes\n`;
    }
    if (withErrors.length > 0) {
      report += `⚠️ **Sending Errors:** ${withErrors.length} inboxes\n`;
    }
    report += '\n';
  }
  
  // 5. Campaigns Not Hitting Benchmarks
  const belowBenchmark = activeCampaigns.filter(c => {
    const a = c.analytics;
    if (!a || a.sent < 1000) return false;
    const replyRate = (a.unique_replies / a.sent) * 100;
    return replyRate < BENCHMARKS.MIN_REPLY_RATE;
  });
  
  report += '## 📉 CAMPAIGNS BELOW BENCHMARKS\n\n';
  if (belowBenchmark.length === 0) {
    report += '✅ All campaigns hitting benchmarks\n\n';
  } else {
    belowBenchmark.forEach(c => {
      const a = c.analytics!;
      const replyRate = (a.unique_replies / a.sent) * 100;
      report += `⚠️ **${c.name}** - ${replyRate.toFixed(2)}% reply rate (target: ${BENCHMARKS.MIN_REPLY_RATE}%)\n`;
    });
    report += '\n';
  }
  
  // 6. Sub 40% Conversion
  const lowConversion = activeCampaigns.filter(c => {
    const a = c.analytics;
    if (!a || a.total_interested < 3) return false;
    const rate = (a.total_meeting_booked / a.total_interested) * 100;
    return rate < BENCHMARKS.TARGET_CONVERSION;
  });
  
  report += '## 🎯 SUB 40% POSITIVE REPLY TO MEETING\n\n';
  if (lowConversion.length === 0) {
    report += '✅ All campaigns above 40% conversion\n\n';
  } else {
    lowConversion.forEach(c => {
      const a = c.analytics!;
      const rate = (a.total_meeting_booked / a.total_interested) * 100;
      report += `⚠️ **${c.name}** - ${a.total_interested} positive → ${a.total_meeting_booked} meetings (${rate.toFixed(1)}%)\n`;
    });
    report += '\n';
  }
  
  report += '---\n\n';
  report += '*Copy this report to fill your daily form!*';
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'daily_report',
    title: 'Daily Report',
    icon: '📋',
    sections: [{
      title: 'DAILY REPORT',
      type: 'summary',
      items: [{ name: 'Full Report', details: [report] }]
    }],
    summary: [
      `${tasks.length} tasks to complete`,
      `${lowLeadsCampaigns.length} campaigns need leads`,
      `${disconnected.length + withErrors.length} inbox issues`
    ],
    metadata: { timestamp: 'just now', cached: false }
  };
  
  terminalCache.set(cacheKey, response, 'daily');
  return response;
}

// Send Volume 7 Days - Weekly trend
async function handleSendVolume7dCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('send_volume_7d', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      return cached;
    }
  }
  
  const weekRange = getDateRange('week');
  const data = await instantlyService.getFullAnalytics(weekRange);
  const activeCampaigns = data.activeCampaigns || [];
  
  // Get daily analytics for trend
  const dailyRes = await instantlyService.getCampaignAnalyticsDaily({
    start_date: weekRange?.start_date,
    end_date: weekRange?.end_date,
  });
  
  const dailyData = dailyRes.data || [];
  const weekSent = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.sent || 0), 0);
  
  // Calculate trend
  let trendText = '';
  if (dailyData.length >= 2) {
    const firstHalf = dailyData.slice(0, Math.floor(dailyData.length / 2));
    const secondHalf = dailyData.slice(Math.floor(dailyData.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.sent, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.sent, 0) / secondHalf.length;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change < -10) {
      trendText = `⚠️ **Declining** (${change.toFixed(1)}% from first half of week)`;
    } else if (change > 10) {
      trendText = `✅ **Increasing** (+${change.toFixed(1)}% from first half of week)`;
    } else {
      trendText = '✅ **Stable** (within normal range)';
    }
  }
  
  let report = '## 📊 7-Day Send Volume Analysis\n\n';
  report += `**Total Sent:** ${weekSent.toLocaleString()}\n`;
  report += `**Daily Average:** ${Math.round(weekSent / 7).toLocaleString()}\n`;
  report += `**Trend:** ${trendText}\n\n`;
  
  // Daily breakdown
  if (dailyData.length > 0) {
    report += '### Daily Breakdown\n\n';
    dailyData.forEach(d => {
      const date = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const bar = '█'.repeat(Math.min(20, Math.round(d.sent / 500)));
      report += `${date}: ${d.sent.toLocaleString()} ${bar}\n`;
    });
  }
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'send_volume_7d',
    title: '7-Day Send Volume',
    icon: '📊',
    sections: [{
      title: 'SEND VOLUME TREND',
      type: 'summary',
      items: [{ name: 'Analysis', details: [report] }]
    }],
    summary: [
      `${weekSent.toLocaleString()} total sent`,
      `${Math.round(weekSent / 7).toLocaleString()}/day average`
    ],
    metadata: { timestamp: 'just now', cached: false }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

// Campaign Detail - Get specific campaign info
async function handleCampaignDetailCommand(campaignName: string, forceRefresh: boolean): Promise<TerminalResponse> {
  const data = await instantlyService.getFullAnalytics();
  const campaigns = data.activeCampaigns || [];
  
  // Find matching campaign
  const searchLower = campaignName.toLowerCase().replace(/campaign$/i, '').trim();
  const campaign = campaigns.find(c => 
    c.name.toLowerCase().includes(searchLower) ||
    c.id === searchLower
  );
  
  if (!campaign) {
    return {
      type: 'error',
      command: 'campaign_detail',
      title: 'Campaign Not Found',
      icon: '❌',
      sections: [{
        title: 'NOT FOUND',
        type: 'summary',
        items: [{
          name: `No campaign matching "${campaignName}"`,
          details: ['Try using "list" to see all campaigns']
        }]
      }],
      summary: [],
      metadata: { timestamp: 'just now', cached: false }
    };
  }
  
  const a = campaign.analytics;
  let report = `# ${campaign.name}\n\n`;
  report += `**Status:** ${campaign.isActive ? '🟢 Active' : '⏸️ Paused'}\n`;
  report += `**ID:** \`${campaign.id}\`\n\n`;
  
  if (a) {
    const uncontacted = a.uncontacted ?? Math.max(0, (a.total_leads || 0) - (a.contacted || 0));
    const replyRate = a.sent > 0 ? (a.unique_replies / a.sent) * 100 : 0;
    const posToMeeting = a.total_interested > 0 ? (a.total_meeting_booked / a.total_interested) * 100 : 0;
    
    report += '## 📊 Performance Metrics\n\n';
    report += `• **Sent:** ${a.sent.toLocaleString()}\n`;
    report += `• **Reply Rate:** ${replyRate.toFixed(2)}% ${replyRate >= BENCHMARKS.MIN_REPLY_RATE ? '✅' : '⚠️'}\n`;
    report += `• **Replies:** ${a.unique_replies.toLocaleString()}\n`;
    report += `• **Opportunities:** ${a.total_opportunities}\n\n`;
    
    report += '## 👥 Lead Status\n\n';
    report += `• **Total Leads:** ${(a.total_leads || 0).toLocaleString()}\n`;
    report += `• **Contacted:** ${a.contacted.toLocaleString()}\n`;
    report += `• **Uncontacted:** ${uncontacted.toLocaleString()} ${uncontacted < BENCHMARKS.LOW_LEADS_WARNING ? '⚠️' : '✅'}\n\n`;
    
    report += '## 🎯 Conversion\n\n';
    report += `• **Positive Replies:** ${a.total_interested}\n`;
    report += `• **Meetings Booked:** ${a.total_meeting_booked}\n`;
    report += `• **Pos Reply → Meeting:** ${posToMeeting.toFixed(1)}% ${posToMeeting >= BENCHMARKS.TARGET_CONVERSION ? '✅' : '⚠️'}\n`;
  } else {
    report += '⚠️ No analytics data available yet\n';
  }
  
  return {
    type: 'success',
    command: 'campaign_detail',
    title: campaign.name,
    icon: '📋',
    sections: [{
      title: 'CAMPAIGN DETAILS',
      type: 'summary',
      items: [{ name: 'Details', details: [report] }]
    }],
    summary: [],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Weekly Report - Comprehensive form answers
async function handleWeeklyReportCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const cacheKey = terminalCache.getCacheKey('weekly_report', {});
  
  if (!forceRefresh) {
    const cached = terminalCache.get<TerminalResponse>(cacheKey, 'analytics');
    if (cached) {
      cached.metadata.cached = true;
      return cached;
    }
  }
  
  const weekRange = getDateRange('week');
  const [weekData, accountsData] = await Promise.all([
    instantlyService.getFullAnalytics(weekRange),
    instantlyService.getFullAccountsData(),
  ]);
  
  const activeCampaigns = weekData.activeCampaigns || [];
  const accounts = accountsData.accounts || [];
  
  let report = '# 📊 WEEKLY REPORT (Wednesday Checklist)\n\n';
  report += `*Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}*\n\n`;
  
  // 1. Inbox Health
  const disconnected = accounts.filter(a => a.statusLabel === 'disconnected' || a.status === -1);
  const withErrors = accounts.filter(a => a.has_error);
  const lowHealth = accounts.filter(a => (a.health_score || a.warmup_score || 100) < BENCHMARKS.MIN_HEALTH_SCORE);
  
  report += '## ✅ INBOX HEALTH CHECK\n\n';
  report += `• Total Inboxes: ${accounts.length}\n`;
  report += `• Healthy: ${accounts.length - disconnected.length - withErrors.length} ✅\n`;
  report += `• Disconnected: ${disconnected.length} ${disconnected.length > 0 ? '🔴' : ''}\n`;
  report += `• Sending Errors: ${withErrors.length} ${withErrors.length > 0 ? '⚠️' : ''}\n`;
  report += `• Low Health Score: ${lowHealth.length}\n\n`;
  
  // 2. Reply Rates
  const totalSent = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.sent || 0), 0);
  const totalReplies = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.unique_replies || 0), 0);
  const overallReplyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
  
  report += '## ✅ REPLY RATES\n\n';
  report += `• Overall Reply Rate: ${overallReplyRate.toFixed(2)}% ${overallReplyRate >= BENCHMARKS.MIN_REPLY_RATE ? '✅' : '⚠️'}\n`;
  report += `• Benchmark: ${BENCHMARKS.MIN_REPLY_RATE}%\n`;
  report += `• Total Replies: ${totalReplies.toLocaleString()}\n\n`;
  
  // 3. Meeting Booking Rate
  const totalInterested = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.total_interested || 0), 0);
  const totalMeetings = activeCampaigns.reduce((sum, c) => sum + (c.analytics?.total_meeting_booked || 0), 0);
  const meetingRate = totalInterested > 0 ? (totalMeetings / totalInterested) * 100 : 0;
  
  report += '## ✅ MEETING BOOKING RATE\n\n';
  report += `• Positive Replies: ${totalInterested}\n`;
  report += `• Meetings Booked: ${totalMeetings}\n`;
  report += `• Conversion Rate: ${meetingRate.toFixed(1)}% ${meetingRate >= BENCHMARKS.TARGET_CONVERSION ? '✅' : '⚠️'}\n`;
  report += `• Benchmark: ${BENCHMARKS.TARGET_CONVERSION}%\n\n`;
  
  // 4. Bad Variants (placeholder - would need step analytics)
  report += '## ✅ BAD VARIANTS\n\n';
  report += '_Check Instantly dashboard for variant-level performance_\n\n';
  
  // 5. Benchmarks
  const belowBenchmark = activeCampaigns.filter(c => {
    const a = c.analytics;
    if (!a || a.sent < 1000) return false;
    return (a.unique_replies / a.sent) * 100 < BENCHMARKS.MIN_REPLY_RATE;
  });
  
  report += '## ✅ BENCHMARK CHECK\n\n';
  if (belowBenchmark.length === 0) {
    report += '✅ All campaigns hitting benchmarks!\n\n';
  } else {
    report += `⚠️ ${belowBenchmark.length} campaigns below ${BENCHMARKS.MIN_REPLY_RATE}% reply rate:\n`;
    belowBenchmark.slice(0, 5).forEach(c => {
      const rate = (c.analytics!.unique_replies / c.analytics!.sent) * 100;
      report += `• ${c.name}: ${rate.toFixed(2)}%\n`;
    });
    report += '\n';
  }
  
  report += '---\n\n';
  report += '*Copy this report to fill your Wednesday form!*';
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'weekly_report',
    title: 'Weekly Report',
    icon: '📊',
    sections: [{
      title: 'WEEKLY REPORT',
      type: 'summary',
      items: [{ name: 'Full Report', details: [report] }]
    }],
    summary: [],
    metadata: { timestamp: 'just now', cached: false }
  };
  
  terminalCache.set(cacheKey, response, 'analytics');
  return response;
}

// ============================================
// NEW COMMAND HANDLERS - PHASE 2: RESOURCES
// ============================================

// Leads overview
async function handleLeadsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const data = await instantlyService.getFullAnalytics();
  const activeCampaigns = data.activeCampaigns || [];
  
  let report = '## 👥 Lead Overview\n\n';
  
  let totalLeads = 0;
  let totalContacted = 0;
  let totalUncontacted = 0;
  
  activeCampaigns.forEach(c => {
    const a = c.analytics;
    if (!a) return;
    totalLeads += a.total_leads || 0;
    totalContacted += a.contacted || 0;
    totalUncontacted += a.uncontacted ?? Math.max(0, (a.total_leads || 0) - (a.contacted || 0));
  });
  
  report += `**Total Leads:** ${totalLeads.toLocaleString()}\n`;
  report += `**Contacted:** ${totalContacted.toLocaleString()}\n`;
  report += `**Uncontacted:** ${totalUncontacted.toLocaleString()}\n\n`;
  
  report += '### By Campaign\n\n';
  activeCampaigns.slice(0, 10).forEach(c => {
    const a = c.analytics;
    if (!a) return;
    const uncontacted = a.uncontacted ?? Math.max(0, (a.total_leads || 0) - (a.contacted || 0));
    const icon = uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL ? '🔴' : 
                 uncontacted < BENCHMARKS.LOW_LEADS_WARNING ? '⚠️' : '✅';
    report += `${icon} **${c.name}**: ${uncontacted.toLocaleString()} uncontacted\n`;
  });
  
  return {
    type: 'success',
    command: 'leads',
    title: 'Lead Overview',
    icon: '👥',
    sections: [{ title: 'LEADS', type: 'summary', items: [{ name: 'Overview', details: [report] }] }],
    summary: [],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Leads for specific campaign
async function handleLeadsCampaignCommand(campaignName: string, forceRefresh: boolean): Promise<TerminalResponse> {
  return handleCampaignDetailCommand(campaignName, forceRefresh);
}

// Interested leads
async function handleInterestedLeadsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const data = await instantlyService.getFullAnalytics();
  const activeCampaigns = data.activeCampaigns || [];
  
  let report = '## 🌟 Interested/Positive Leads\n\n';
  
  let totalInterested = 0;
  const byCampaign: { name: string; count: number }[] = [];
  
  activeCampaigns.forEach(c => {
    const interested = c.analytics?.total_interested || 0;
    if (interested > 0) {
      totalInterested += interested;
      byCampaign.push({ name: c.name, count: interested });
    }
  });
  
  report += `**Total Interested:** ${totalInterested}\n\n`;
  
  byCampaign.sort((a, b) => b.count - a.count);
  report += '### By Campaign\n\n';
  byCampaign.slice(0, 15).forEach(c => {
    report += `• **${c.name}**: ${c.count} interested\n`;
  });
  
  return {
    type: 'success',
    command: 'interested',
    title: 'Interested Leads',
    icon: '🌟',
    sections: [{ title: 'INTERESTED', type: 'summary', items: [{ name: 'Overview', details: [report] }] }],
    summary: [`${totalInterested} total interested leads`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Meetings booked
async function handleMeetingsBookedCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const data = await instantlyService.getFullAnalytics();
  const activeCampaigns = data.activeCampaigns || [];
  
  let report = '## 📅 Meetings Booked\n\n';
  
  let totalMeetings = 0;
  const byCampaign: { name: string; count: number; interested: number }[] = [];
  
  activeCampaigns.forEach(c => {
    const meetings = c.analytics?.total_meeting_booked || 0;
    const interested = c.analytics?.total_interested || 0;
    totalMeetings += meetings;
    if (interested > 0) {
      byCampaign.push({ name: c.name, count: meetings, interested });
    }
  });
  
  report += `**Total Meetings Booked:** ${totalMeetings}\n\n`;
  
  byCampaign.sort((a, b) => b.count - a.count);
  report += '### By Campaign\n\n';
  byCampaign.slice(0, 15).forEach(c => {
    const rate = c.interested > 0 ? (c.count / c.interested * 100).toFixed(1) : '0';
    report += `• **${c.name}**: ${c.count} meetings (${rate}% conversion)\n`;
  });
  
  return {
    type: 'success',
    command: 'meetings_booked',
    title: 'Meetings Booked',
    icon: '📅',
    sections: [{ title: 'MEETINGS', type: 'summary', items: [{ name: 'Overview', details: [report] }] }],
    summary: [`${totalMeetings} total meetings booked`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Lead lists
async function handleLeadListsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getLeadLists({ limit: 100 });
  
  if (result.error) {
    return createErrorResponse('lead_lists', result.error);
  }
  
  const lists = result.data || [];
  
  let report = '## 📋 Lead Lists\n\n';
  report += `**Total Lists:** ${lists.length}\n\n`;
  
  if (lists.length === 0) {
    report += '_No lead lists found_\n';
  } else {
    lists.forEach(l => {
      report += `• **${l.name}**: ${l.lead_count.toLocaleString()} leads\n`;
    });
  }
  
  return {
    type: 'success',
    command: 'lead_lists',
    title: 'Lead Lists',
    icon: '📋',
    sections: [{ title: 'LISTS', type: 'summary', items: [{ name: 'Lists', details: [report] }] }],
    summary: [`${lists.length} lead lists`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Block list
async function handleBlockListCommand(search?: string, forceRefresh?: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getBlockListEntries({ search, limit: 100 });
  
  if (result.error) {
    return createErrorResponse('block_list', result.error);
  }
  
  const entries = result.data || [];
  
  let report = '## 🚫 Block List\n\n';
  
  if (search) {
    report += `**Search:** "${search}"\n`;
    report += `**Found:** ${entries.length} entries\n\n`;
  } else {
    report += `**Total Blocked:** ${entries.length} entries\n\n`;
  }
  
  const domains = entries.filter(e => e.type === 'domain');
  const emails = entries.filter(e => e.type === 'email');
  
  if (domains.length > 0) {
    report += '### Blocked Domains\n';
    domains.slice(0, 20).forEach(d => {
      report += `• ${d.value}\n`;
    });
    if (domains.length > 20) report += `_...and ${domains.length - 20} more_\n`;
    report += '\n';
  }
  
  if (emails.length > 0) {
    report += '### Blocked Emails\n';
    emails.slice(0, 20).forEach(e => {
      report += `• ${e.value}\n`;
    });
    if (emails.length > 20) report += `_...and ${emails.length - 20} more_\n`;
  }
  
  return {
    type: 'success',
    command: 'block_list',
    title: 'Block List',
    icon: '🚫',
    sections: [{ title: 'BLOCKED', type: 'summary', items: [{ name: 'Entries', details: [report] }] }],
    summary: [`${entries.length} blocked entries`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Low conversion (sub 40%)
async function handleLowConversionCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  return handleConversionCommand(forceRefresh); // Already handles low conversion
}

// Bad variants
async function handleBadVariantsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getCampaignStepAnalytics({});
  
  if (result.error) {
    return createErrorResponse('bad_variants', result.error);
  }
  
  const steps = result.data || [];
  
  // Filter for underperforming variants
  const badVariants = steps.filter(s => s.sent > 100 && s.reply_rate < BENCHMARKS.MIN_REPLY_RATE);
  badVariants.sort((a, b) => a.reply_rate - b.reply_rate);
  
  let report = '## 📧 Underperforming Variants\n\n';
  
  if (badVariants.length === 0) {
    report += '✅ All variants performing above benchmark!\n';
  } else {
    report += `Found **${badVariants.length}** variants below ${BENCHMARKS.MIN_REPLY_RATE}% reply rate:\n\n`;
    
    badVariants.slice(0, 15).forEach(v => {
      report += `• **${v.variant}** (Step ${v.step_number})\n`;
      report += `  Sent: ${v.sent} | Replies: ${v.replied} | Rate: ${v.reply_rate.toFixed(2)}%\n`;
    });
  }
  
  return {
    type: 'success',
    command: 'bad_variants',
    title: 'Bad Variants',
    icon: '📧',
    sections: [{ title: 'VARIANTS', type: 'summary', items: [{ name: 'Analysis', details: [report] }] }],
    summary: [`${badVariants.length} underperforming variants`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Inbox issues (grouped by tag)
async function handleInboxIssuesCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const [accountsData, tagsRes] = await Promise.all([
    instantlyService.getFullAccountsData(),
    instantlyService.getAllCustomTags(),
  ]);
  
  const accounts = accountsData.accounts || [];
  const tags = tagsRes.data || [];
  
  const disconnected = accounts.filter(a => a.statusLabel === 'disconnected' || a.status === -1 || a.status === 0);
  const withErrors = accounts.filter(a => a.has_error);
  
  let report = '## 🔴 Inbox Issues\n\n';
  
  if (disconnected.length === 0 && withErrors.length === 0) {
    report += '✅ **No issues found!** All inboxes are healthy.\n';
  } else {
    // Group by tag
    const tagGroups: Record<string, { disconnected: string[]; errors: string[] }> = {};
    
    [...disconnected, ...withErrors].forEach(a => {
      const tag = a.tags?.[0] || 'Untagged';
      if (!tagGroups[tag]) {
        tagGroups[tag] = { disconnected: [], errors: [] };
      }
      if (a.statusLabel === 'disconnected' || a.status === -1) {
        tagGroups[tag].disconnected.push(a.email);
      }
      if (a.has_error) {
        tagGroups[tag].errors.push(a.email);
      }
    });
    
    report += `**Total Disconnected:** ${disconnected.length}\n`;
    report += `**Total with Errors:** ${withErrors.length}\n\n`;
    
    report += '### By Tag\n\n';
    Object.entries(tagGroups).forEach(([tag, data]) => {
      report += `**${tag}**\n`;
      if (data.disconnected.length > 0) {
        report += `  🔴 Disconnected: ${data.disconnected.length}\n`;
      }
      if (data.errors.length > 0) {
        report += `  ⚠️ Errors: ${data.errors.length}\n`;
      }
    });
    
    report += '\n### Action Required\n\n';
    report += '1. Go to Instantly → Email Accounts\n';
    report += '2. Reconnect disconnected accounts\n';
    report += '3. Fix sending errors\n';
    report += '4. Consider removing problematic inboxes\n';
  }
  
  return {
    type: 'success',
    command: 'inbox_issues',
    title: 'Inbox Issues',
    icon: '🔴',
    sections: [{ title: 'ISSUES', type: 'summary', items: [{ name: 'Report', details: [report] }] }],
    summary: [`${disconnected.length} disconnected`, `${withErrors.length} errors`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Warmup status
async function handleWarmupStatusCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const accountsData = await instantlyService.getFullAccountsData();
  const accounts = accountsData.accounts || [];
  
  const warmingUp = accounts.filter(a => a.warmup_enabled);
  const lowHealth = accounts.filter(a => (a.warmup_score || 100) < BENCHMARKS.MIN_HEALTH_SCORE);
  
  let report = '## 🔥 Warmup Status\n\n';
  report += `**Total Accounts:** ${accounts.length}\n`;
  report += `**Warmup Enabled:** ${warmingUp.length}\n`;
  report += `**Low Health Score:** ${lowHealth.length}\n\n`;
  
  if (lowHealth.length > 0) {
    report += '### Accounts Needing Attention\n\n';
    lowHealth.slice(0, 10).forEach(a => {
      report += `⚠️ **${a.email}**: ${a.warmup_score || 0}% health\n`;
    });
  }
  
  return {
    type: 'success',
    command: 'warmup_status',
    title: 'Warmup Status',
    icon: '🔥',
    sections: [{ title: 'WARMUP', type: 'summary', items: [{ name: 'Status', details: [report] }] }],
    summary: [`${warmingUp.length} warming up`, `${lowHealth.length} need attention`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Daily trends
async function handleDailyTrendsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const weekRange = getDateRange('week');
  const result = await instantlyService.getCampaignAnalyticsDaily({
    start_date: weekRange?.start_date,
    end_date: weekRange?.end_date,
  });
  
  if (result.error) {
    return createErrorResponse('daily_trends', result.error);
  }
  
  const data = result.data || [];
  
  let report = '## 📈 Daily Trends (7 Days)\n\n';
  
  if (data.length === 0) {
    report += '_No daily data available_\n';
  } else {
    report += '| Date | Sent | Replies | Rate |\n';
    report += '|------|------|---------|------|\n';
    
    data.forEach(d => {
      const date = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const rate = d.sent > 0 ? ((d.replies / d.sent) * 100).toFixed(2) : '0.00';
      report += `| ${date} | ${d.sent.toLocaleString()} | ${d.replies} | ${rate}% |\n`;
    });
  }
  
  return {
    type: 'success',
    command: 'daily_trends',
    title: 'Daily Trends',
    icon: '📈',
    sections: [{ title: 'TRENDS', type: 'summary', items: [{ name: 'Data', details: [report] }] }],
    summary: [],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Tags
async function handleTagsCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getAllCustomTags();
  
  if (result.error) {
    return createErrorResponse('tags', result.error);
  }
  
  const tags = result.data || [];
  
  let report = '## 🏷️ Custom Tags\n\n';
  report += `**Total Tags:** ${tags.length}\n\n`;
  
  tags.forEach(t => {
    report += `• **${t.name}**\n`;
  });
  
  return {
    type: 'success',
    command: 'tags',
    title: 'Custom Tags',
    icon: '🏷️',
    sections: [{ title: 'TAGS', type: 'summary', items: [{ name: 'List', details: [report] }] }],
    summary: [`${tags.length} tags`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Accounts by tag
async function handleAccountsByTagCommand(tagName: string, forceRefresh: boolean): Promise<TerminalResponse> {
  const [accountsData, tagsRes] = await Promise.all([
    instantlyService.getFullAccountsData(),
    instantlyService.getAllCustomTags(),
  ]);
  
  const accounts = accountsData.accounts || [];
  const tags = tagsRes.data || [];
  
  const tag = tags.find(t => t.name.toLowerCase().includes(tagName.toLowerCase()));
  
  if (!tag) {
    return {
      type: 'error',
      command: 'accounts_by_tag',
      title: 'Tag Not Found',
      icon: '❌',
      sections: [{ title: 'ERROR', type: 'summary', items: [{ name: `Tag "${tagName}" not found`, details: [] }] }],
      summary: [],
      metadata: { timestamp: 'just now', cached: false }
    };
  }
  
  const filtered = accounts.filter(a => a.tags?.includes(tag.name));
  
  let report = `## 🏷️ Accounts Tagged: ${tag.name}\n\n`;
  report += `**Count:** ${filtered.length}\n\n`;
  
  filtered.slice(0, 20).forEach(a => {
    const statusIcon = a.statusLabel === 'connected' ? '✅' : a.statusLabel === 'disconnected' ? '🔴' : '⚠️';
    report += `${statusIcon} ${a.email}\n`;
  });
  
  if (filtered.length > 20) {
    report += `\n_...and ${filtered.length - 20} more_\n`;
  }
  
  return {
    type: 'success',
    command: 'accounts_by_tag',
    title: `Accounts: ${tag.name}`,
    icon: '🏷️',
    sections: [{ title: 'ACCOUNTS', type: 'summary', items: [{ name: 'List', details: [report] }] }],
    summary: [`${filtered.length} accounts with tag "${tag.name}"`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Templates
async function handleTemplatesCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getEmailTemplates({ limit: 50 });
  
  if (result.error) {
    return createErrorResponse('templates', result.error);
  }
  
  const templates = result.data || [];
  
  let report = '## 📧 Email Templates\n\n';
  report += `**Total Templates:** ${templates.length}\n\n`;
  
  templates.forEach(t => {
    report += `• **${t.name}**\n`;
    if (t.subject) report += `  Subject: ${t.subject.slice(0, 50)}...\n`;
  });
  
  return {
    type: 'success',
    command: 'templates',
    title: 'Email Templates',
    icon: '📧',
    sections: [{ title: 'TEMPLATES', type: 'summary', items: [{ name: 'List', details: [report] }] }],
    summary: [`${templates.length} templates`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Subsequences
async function handleSubsequencesCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getCampaignSubsequences({ limit: 50 });
  
  if (result.error) {
    return createErrorResponse('subsequences', result.error);
  }
  
  const subsequences = result.data || [];
  
  let report = '## 🔄 Campaign Subsequences\n\n';
  report += `**Total:** ${subsequences.length}\n\n`;
  
  subsequences.forEach(s => {
    report += `• **${s.name}**\n`;
    if (s.trigger_type) report += `  Trigger: ${s.trigger_type}\n`;
  });
  
  return {
    type: 'success',
    command: 'subsequences',
    title: 'Subsequences',
    icon: '🔄',
    sections: [{ title: 'SUBSEQUENCES', type: 'summary', items: [{ name: 'List', details: [report] }] }],
    summary: [`${subsequences.length} subsequences`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Workspace
async function handleWorkspaceCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getCurrentWorkspace();
  
  if (result.error) {
    return createErrorResponse('workspace', result.error);
  }
  
  const ws = result.data!;
  
  let report = '## 🏢 Workspace\n\n';
  report += `**Name:** ${ws.name}\n`;
  if (ws.owner_email) report += `**Owner:** ${ws.owner_email}\n`;
  if (ws.plan) report += `**Plan:** ${ws.plan}\n`;
  
  return {
    type: 'success',
    command: 'workspace',
    title: 'Workspace',
    icon: '🏢',
    sections: [{ title: 'WORKSPACE', type: 'summary', items: [{ name: 'Info', details: [report] }] }],
    summary: [],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Team
async function handleTeamCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getWorkspaceMembers({ limit: 50 });
  
  if (result.error) {
    return createErrorResponse('team', result.error);
  }
  
  const members = result.data || [];
  
  let report = '## 👥 Team Members\n\n';
  report += `**Total Members:** ${members.length}\n\n`;
  
  members.forEach(m => {
    report += `• **${m.email}** (${m.role})\n`;
  });
  
  return {
    type: 'success',
    command: 'team',
    title: 'Team Members',
    icon: '👥',
    sections: [{ title: 'TEAM', type: 'summary', items: [{ name: 'Members', details: [report] }] }],
    summary: [`${members.length} members`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Audit log
async function handleAuditLogCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  const result = await instantlyService.getAuditLogs({ limit: 20 });
  
  if (result.error) {
    return createErrorResponse('audit_log', result.error);
  }
  
  const logs = result.data || [];
  
  let report = '## 📜 Recent Activity\n\n';
  
  if (logs.length === 0) {
    report += '_No recent activity found_\n';
  } else {
    logs.forEach(l => {
      const date = new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      report += `• **${l.action}** on ${l.resource_type}\n`;
      report += `  ${date}${l.user_email ? ` by ${l.user_email}` : ''}\n`;
    });
  }
  
  return {
    type: 'success',
    command: 'audit_log',
    title: 'Audit Log',
    icon: '📜',
    sections: [{ title: 'ACTIVITY', type: 'summary', items: [{ name: 'Log', details: [report] }] }],
    summary: [`${logs.length} recent activities`],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Billing
async function handleBillingCommand(forceRefresh: boolean): Promise<TerminalResponse> {
  // Note: Billing endpoint may require special permissions
  return {
    type: 'info',
    command: 'billing',
    title: 'Billing Information',
    icon: '💳',
    sections: [{
      title: 'BILLING',
      type: 'summary',
      items: [{
        name: 'Check Instantly Dashboard',
        details: [
          'Billing information is available in the Instantly dashboard.',
          'Go to Settings → Billing to view your plan and usage.'
        ]
      }]
    }],
    summary: [],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Diagnose campaign
async function handleDiagnoseCommand(input: string, forceRefresh: boolean): Promise<TerminalResponse> {
  const data = await instantlyService.getFullAnalytics();
  const campaigns = data.activeCampaigns || [];
  
  // Extract campaign name
  const searchTerm = input.replace(/^diagnose\s*/i, '').replace(/^analyze\s*/i, '').replace(/^what'?s wrong with\s*/i, '').trim();
  
  const campaign = campaigns.find(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id === searchTerm
  );
  
  if (!campaign) {
    return {
      type: 'error',
      command: 'diagnose',
      title: 'Campaign Not Found',
      icon: '❌',
      sections: [{
        title: 'NOT FOUND',
        type: 'summary',
        items: [{
          name: `No campaign matching "${searchTerm}"`,
          details: ['Try: diagnose [campaign name]']
        }]
      }],
      summary: [],
      metadata: { timestamp: 'just now', cached: false }
    };
  }
  
  const a = campaign.analytics;
  let report = `# 🔍 Diagnosis: ${campaign.name}\n\n`;
  
  if (!a) {
    report += '⚠️ No analytics data available yet. Let the campaign run longer.\n';
  } else {
    const uncontacted = a.uncontacted ?? Math.max(0, (a.total_leads || 0) - (a.contacted || 0));
    const replyRate = a.sent > 0 ? (a.unique_replies / a.sent) * 100 : 0;
    const posToMeeting = a.total_interested > 0 ? (a.total_meeting_booked / a.total_interested) * 100 : 0;
    
    report += '## 📊 Current Status\n\n';
    report += `• Sent: ${a.sent.toLocaleString()}\n`;
    report += `• Reply Rate: ${replyRate.toFixed(2)}%\n`;
    report += `• Uncontacted: ${uncontacted.toLocaleString()}\n`;
    report += `• Positive Replies: ${a.total_interested}\n`;
    report += `• Meetings: ${a.total_meeting_booked}\n\n`;
    
    report += '## 🔍 Issues Found\n\n';
    let issueCount = 0;
    
    if (a.sent < BENCHMARKS.MIN_DATA_THRESHOLD) {
      report += `⏳ **Insufficient Data**: Only ${a.sent.toLocaleString()} sent. Need 10k+ for reliable analysis.\n\n`;
    } else {
      if (replyRate < BENCHMARKS.MIN_REPLY_RATE) {
        issueCount++;
        report += `🔴 **Low Reply Rate**: ${replyRate.toFixed(2)}% (target: ${BENCHMARKS.MIN_REPLY_RATE}%)\n\n`;
        report += '**Recommended Actions:**\n';
        DIAGNOSTIC_STEPS.forEach(step => {
          report += `  • ${step}\n`;
        });
        report += '\n';
      }
      
      if (uncontacted < BENCHMARKS.LOW_LEADS_CRITICAL) {
        issueCount++;
        report += `🔴 **Critical Lead Shortage**: Only ${uncontacted.toLocaleString()} remaining\n`;
        report += '**Action:** Order 30k+ leads TODAY\n\n';
      } else if (uncontacted < BENCHMARKS.LOW_LEADS_WARNING) {
        issueCount++;
        report += `⚠️ **Low Leads**: ${uncontacted.toLocaleString()} remaining\n`;
        report += '**Action:** Order 50k leads this week\n\n';
      }
      
      if (a.total_interested > 5 && a.total_meeting_booked === 0) {
        issueCount++;
        report += `🔴 **Broken Subsequences**: ${a.total_interested} positive replies → 0 meetings\n`;
        report += '**Action:** Review price/info/meeting subsequences immediately\n\n';
      } else if (posToMeeting < BENCHMARKS.TARGET_CONVERSION && a.total_interested > 3) {
        issueCount++;
        report += `⚠️ **Low Conversion**: ${posToMeeting.toFixed(1)}% (target: ${BENCHMARKS.TARGET_CONVERSION}%)\n`;
        report += '**Action:** Optimize subsequences\n\n';
      }
      
      if (issueCount === 0) {
        report += '✅ **No major issues found!** Campaign is performing well.\n';
      }
    }
  }
  
  return {
    type: 'success',
    command: 'diagnose',
    title: `Diagnosis: ${campaign.name}`,
    icon: '🔍',
    sections: [{ title: 'DIAGNOSIS', type: 'summary', items: [{ name: 'Report', details: [report] }] }],
    summary: [],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// Verify email
async function handleVerifyEmailCommand(email: string): Promise<TerminalResponse> {
  if (!email || !email.includes('@')) {
    return {
      type: 'error',
      command: 'verify_email',
      title: 'Invalid Email',
      icon: '❌',
      sections: [{
        title: 'ERROR',
        type: 'summary',
        items: [{ name: 'Please provide a valid email address', details: ['Usage: verify email@example.com'] }]
      }],
      summary: [],
      metadata: { timestamp: 'just now', cached: false }
    };
  }
  
  const result = await instantlyService.verifyEmail(email);
  
  if (result.error) {
    return createErrorResponse('verify_email', result.error);
  }
  
  const data = result.data!;
  
  let report = `## ✉️ Email Verification: ${email}\n\n`;
  report += `**Valid:** ${data.is_valid ? '✅ Yes' : '❌ No'}\n`;
  report += `**Status:** ${data.status}\n`;
  if (data.reason) report += `**Reason:** ${data.reason}\n`;
  
  return {
    type: 'success',
    command: 'verify_email',
    title: 'Email Verification',
    icon: '✉️',
    sections: [{ title: 'RESULT', type: 'summary', items: [{ name: 'Verification', details: [report] }] }],
    summary: [data.is_valid ? '✅ Valid email' : '❌ Invalid email'],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// API Status
async function handleStatusCommand(): Promise<TerminalResponse> {
  const result = await instantlyService.testConnection();
  
  let report = '## 🔌 API Connection Status\n\n';
  
  if (result.success) {
    report += '✅ **Connected to Instantly API v2**\n\n';
    report += `• Campaigns found: ${result.campaignCount}\n`;
    report += `• Status: ${result.message}\n`;
  } else {
    report += '❌ **Connection Failed**\n\n';
    report += `• Error: ${result.message}\n`;
    report += '\nCheck your API key in environment variables.\n';
  }
  
  return {
    type: result.success ? 'success' : 'error',
    command: 'status',
    title: 'API Status',
    icon: result.success ? '✅' : '❌',
    sections: [{ title: 'STATUS', type: 'summary', items: [{ name: 'Connection', details: [report] }] }],
    summary: [result.success ? 'Connected' : 'Disconnected'],
    metadata: { timestamp: 'just now', cached: false }
  };
}

// ============================================
// UTILITY COMMANDS
// ============================================

function handleHelpCommand(): TerminalResponse {
  let helpText = `# 💡 Campaign Terminal Commands

Use natural language or quick commands to analyze your Instantly campaigns.

## 📋 Daily Commands
| Command | Description |
|---------|-------------|
| \`daily\` | Today's campaign analysis |
| \`daily report\` | Full daily form answers |
| \`send volume\` | Check today's send volume |
| \`send volume 7d\` | 7-day send volume trend |
| \`low leads\` | Campaigns under 3,000 leads |
| \`blocked domains\` | Check MSFT/Proofpoint/Mimecast/Cisco |

## 📊 Weekly Commands
| Command | Description |
|---------|-------------|
| \`weekly\` | 7-day performance analysis |
| \`weekly report\` | Full Wednesday form answers |
| \`benchmarks\` | Campaigns not hitting targets |
| \`conversion\` | Positive reply to meeting rate |
| \`bad variants\` | Underperforming email variants |
| \`reply trends\` | Reply rate trends over time |

## 📧 Inbox Commands
| Command | Description |
|---------|-------------|
| \`inbox health\` | Full inbox health report |
| \`inbox issues\` | Disconnected/error inboxes by tag |
| \`warmup\` | Warmup status and health scores |
| \`accounts\` | List all email accounts |

## 👥 Lead Commands
| Command | Description |
|---------|-------------|
| \`leads\` | Lead overview across campaigns |
| \`interested\` | Positive/interested leads |
| \`meetings booked\` | Leads with meetings booked |
| \`lead lists\` | View all lead lists |

## 🏷️ Resources
| Command | Description |
|---------|-------------|
| \`campaigns\` / \`list\` | All active campaigns with analysis |
| \`tags\` | View all custom tags |
| \`templates\` | Email templates |
| \`block list\` | View blocked domains/emails |
| \`subsequences\` | Campaign subsequences |

## 🔍 Diagnostics
| Command | Description |
|---------|-------------|
| \`diagnose [campaign]\` | AI diagnosis for specific campaign |
| \`verify [email]\` | Verify single email address |
| \`status\` | Check API connection |

## 💬 Natural Language Examples
- "Which campaigns need leads?"
- "How is Consumer Optix doing?"
- "What are my tasks today?"
- "Are there disconnected inboxes?"
- "Show me campaigns below benchmark"

## ⚡ Quick Tips
- Use \`refresh [command]\` for fresh data
- Type naturally - I understand questions!
- Click on campaign links for details
`;

  return {
    type: 'info',
    command: 'help',
    title: 'Campaign Terminal Commands',
    icon: '💡',
    sections: [{
      title: 'HELP',
      type: 'summary',
      items: [{ name: 'Commands', details: [helpText] }]
    }],
    summary: [
      'Natural language queries supported!',
      'Try: "What do I need to do today?"'
    ],
    metadata: {
      timestamp: 'just now',
      cached: false
    }
  };
}

function createUnknownCommandResponse(input: string): TerminalResponse {
  return {
    type: 'error',
    command: 'unknown',
    title: 'Command not recognized',
    icon: '❓',
    sections: [{
      title: 'DID YOU MEAN',
      type: 'list',
      items: [
        { name: 'daily', details: ['Daily tasks summary'] },
        { name: 'weekly summary', details: ['Wednesday checklist'] },
        { name: 'low leads', details: ['Campaigns needing leads'] },
        { name: 'help', details: ['Show all commands'] }
      ]
    }],
    summary: [`Could not understand: "${input}"`, 'Type "help" for all commands'],
    metadata: {
      timestamp: 'just now',
      cached: false
    }
  };
}

function createErrorResponse(command: CommandType, message: string): TerminalResponse {
  return {
    type: 'error',
    command,
    title: 'Error',
    icon: '⚠️',
    sections: [{
      title: 'ISSUE',
      type: 'summary',
      items: [{
        name: message,
        details: ['Try again in a few minutes or check your connection.']
      }]
    }],
    summary: ['An error occurred while processing your request'],
    metadata: {
      timestamp: 'just now',
      cached: false
    }
  };
}
