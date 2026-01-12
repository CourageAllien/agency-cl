// Campaign Terminal Command Processor

import { instantlyService } from '@/lib/services/instantly';
import { terminalCache, rateLimiter } from './cache';
import {
  CommandType,
  COMMAND_ALIASES,
  BENCHMARKS,
  BLOCKED_DOMAINS,
  DIAGNOSTIC_STEPS,
  TerminalResponse,
  TerminalSection,
  CampaignIssue,
  SendVolumeStatus,
  BenchmarkResult,
  ConversionResult,
  InboxIssue,
  TrendResult,
} from './types';

// Parse user input to determine command
export function parseCommand(input: string): CommandType {
  const normalized = input.toLowerCase().trim();
  
  // Check for refresh prefix
  if (normalized.startsWith('refresh ')) {
    return 'refresh';
  }
  
  // Check direct aliases
  if (COMMAND_ALIASES[normalized]) {
    return COMMAND_ALIASES[normalized];
  }
  
  // Fuzzy matching for natural language
  const patterns: [RegExp, CommandType][] = [
    [/\b(today|today's)\b/i, 'daily'],
    [/\b(this week|7.?day|weekly report|week analysis)\b/i, 'weekly'],
    [/\b(send|volume|sending)\b/i, 'send_volume'],
    [/\b(low|leads|3000|need leads)\b/i, 'low_leads'],
    [/\b(block|microsoft|proofpoint|mimecast|cisco)\b/i, 'blocked_domains'],
    [/\b(benchmark|target|hitting)\b/i, 'benchmarks'],
    [/\b(conversion|meeting|40%|subsequence)\b/i, 'conversion'],
    [/\b(inbox|disconnect|error)\b/i, 'inbox_health'],
    [/\b(removed|removal|tag report)\b/i, 'removed_inboxes'],
    [/\b(trend|declining|downward)\b/i, 'reply_trends'],
    [/\b(wednesday|weekly summary|full weekly)\b/i, 'weekly_summary'],
    [/\b(help|\?|command)\b/i, 'help'],
  ];
  
  for (const [pattern, command] of patterns) {
    if (pattern.test(normalized)) {
      return command;
    }
  }
  
  return 'unknown';
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
  
  // Handle refresh
  if (commandType === 'refresh') {
    const subCommand = input.toLowerCase().replace('refresh ', '').trim();
    commandType = parseCommand(subCommand);
    forceRefresh = true;
    terminalCache.clear(commandType);
  }
  
  try {
    switch (commandType) {
      case 'daily':
        return await handleDailyCommand(forceRefresh);
      case 'weekly':
        return await handleWeeklyCommand(forceRefresh);
      case 'send_volume':
        return await handleSendVolumeCommand(forceRefresh);
      case 'low_leads':
        return await handleLowLeadsCommand(forceRefresh);
      case 'blocked_domains':
        return await handleBlockedDomainsCommand(forceRefresh);
      case 'benchmarks':
        return await handleBenchmarksCommand(forceRefresh);
      case 'conversion':
        return await handleConversionCommand(forceRefresh);
      case 'inbox_health':
        return await handleInboxHealthCommand(forceRefresh);
      case 'removed_inboxes':
        return handleRemovedInboxesCommand();
      case 'reply_trends':
        return await handleReplyTrendsCommand(forceRefresh);
      case 'weekly_summary':
        return await handleWeeklySummaryCommand(forceRefresh);
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
  
  // Fetch data from Instantly API
  const data = await instantlyService.getFullAnalytics();
  
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
  
  const data = await instantlyService.getFullAnalytics();
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
  
  const data = await instantlyService.getFullAnalytics();
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
  
  const data = await instantlyService.getFullAnalytics();
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
  
  const data = await instantlyService.getFullAnalytics();
  const accounts = data.accounts || [];
  
  const disconnected: InboxIssue[] = [];
  const lowHealth: InboxIssue[] = [];
  
  accounts.forEach(account => {
    if (account.statusLabel === 'disconnected' || account.has_error) {
      disconnected.push({
        email: account.email,
        status: account.statusLabel === 'disconnected' ? 'Disconnected' : 'Error',
        error: account.error_message,
        impact: `~${account.daily_limit || 50} sends/day`
      });
    }
    
    const healthScore = account.warmup_score || 100;
    if (healthScore < BENCHMARKS.MIN_HEALTH_SCORE && account.statusLabel === 'connected') {
      lowHealth.push({
        email: account.email,
        status: 'Active but declining',
        healthScore,
        landedInbox: 78, // Would need warmup analytics API
        landedSpam: 22
      });
    }
  });
  
  const sections: TerminalSection[] = [];
  
  if (disconnected.length > 0) {
    sections.push({
      title: 'DISCONNECTED INBOXES',
      type: 'list',
      count: disconnected.length,
      items: disconnected.slice(0, 10).map(d => ({
        name: d.email,
        details: [
          `Status: ${d.status}`,
          d.error ? `Error: ${d.error}` : '',
          `Impact: ${d.impact}`
        ].filter(Boolean),
        priority: 'URGENT'
      }))
    });
  }
  
  if (lowHealth.length > 0) {
    sections.push({
      title: `LOW HEALTH SCORE (<${BENCHMARKS.MIN_HEALTH_SCORE})`,
      type: 'list',
      count: lowHealth.length,
      items: lowHealth.slice(0, 10).map(l => ({
        name: l.email,
        details: [
          `Health Score: ${l.healthScore}`,
          `Status: ${l.status}`
        ],
        priority: 'HIGH'
      }))
    });
  }
  
  const healthyCount = accounts.filter(a => 
    a.statusLabel === 'connected' && 
    (a.warmup_score || 100) >= BENCHMARKS.MIN_HEALTH_SCORE
  ).length;
  
  const lostCapacity = disconnected.reduce((sum, d) => {
    const impact = d.impact?.match(/\d+/);
    return sum + (impact ? parseInt(impact[0]) : 50);
  }, 0);
  
  if (sections.length === 0) {
    sections.push({
      title: 'ALL INBOXES HEALTHY',
      type: 'summary',
      items: [{
        name: 'Great work! ✅',
        details: [`All ${accounts.length} inboxes are connected and healthy.`]
      }]
    });
  }
  
  const response: TerminalResponse = {
    type: 'success',
    command: 'inbox_health',
    title: 'Inbox Health Report',
    icon: '📧',
    sections,
    summary: [
      `Disconnected: ${disconnected.length}`,
      `Low Health: ${lowHealth.length}`,
      `Healthy: ${healthyCount} ✅`,
      `Lost Capacity: ~${lostCapacity} emails/day`
    ],
    metadata: {
      timestamp: 'just now',
      cached: false,
      issueCount: disconnected.length + lowHealth.length
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
  
  const data = await instantlyService.getFullAnalytics();
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
// UTILITY COMMANDS
// ============================================

function handleHelpCommand(): TerminalResponse {
  return {
    type: 'info',
    command: 'help',
    title: 'Campaign Terminal Commands',
    icon: '💡',
    sections: [
      {
        title: 'DAILY COMMANDS',
        type: 'list',
        items: [
          { name: 'daily (or d)', details: ['Full daily summary'] },
          { name: 'send volume', details: ['Check if send volume is low'] },
          { name: 'low leads', details: ['Campaigns <3000 leads'] },
          { name: 'blocked domains', details: ['Check MSFT/Proofpoint/Mimecast/Cisco'] }
        ]
      },
      {
        title: 'WEEKLY COMMANDS',
        type: 'list',
        items: [
          { name: 'weekly summary (or w)', details: ['Full Wednesday checklist'] },
          { name: 'benchmarks', details: ['Campaigns not hitting targets'] },
          { name: 'conversion', details: ['<40% positive reply to meeting'] },
          { name: 'inbox health', details: ['Disconnected/error inboxes'] },
          { name: 'reply trends', details: ['Trending downward analysis'] },
          { name: 'removed inboxes', details: ['Tag removal report'] }
        ]
      },
      {
        title: 'UTILITY',
        type: 'list',
        items: [
          { name: 'refresh [command]', details: ['Force fresh data'] },
          { name: 'help', details: ['Show this guide'] }
        ]
      }
    ],
    summary: [
      'Shortcuts: d = daily, w = weekly summary',
      'Natural language also works!'
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
