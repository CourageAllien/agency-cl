/**
 * Data Transformer
 * Transforms Instantly API data into the app's internal format
 * 
 * KEY RULES:
 * - Use ACTIVE campaigns only for classification and priority
 * - Inboxes are NOT clients - shared across campaigns
 * - "Interd" = "Interdependence" 
 * - Lifetime data only for TAM exhaustion check
 */

import { BENCHMARKS } from "@/lib/engine/benchmarks";
import { BUCKET_CONFIGS, type IssueBucket, type ClientClassification } from "@/types/analysis";
import type { 
  InstantlyCampaign, 
  InstantlyAccount, 
  InstantlyCampaignAnalytics,
  InstantlyCustomTag,
  InstantlyTagMapping,
} from "./instantly";

// Re-export types
export type { 
  InstantlyCampaign, 
  InstantlyAccount, 
  InstantlyCampaignAnalytics,
  InstantlyCustomTag,
  InstantlyTagMapping,
};

// ============ CLIENT NAME MAPPINGS ============
// Map campaign name patterns to actual client names
const CLIENT_NAME_MAPPINGS: Record<string, string> = {
  'interd': 'Interdependence',
  'interdr': 'Interdependence',
  'interdependence': 'Interdependence',
  'wisdom ai': 'Wisdom AI',
  'wisdomai': 'Wisdom AI',
  // Add more mappings as discovered
};

// Transformed types for the app
export interface TransformedClient {
  id: string;
  name: string;
  campaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>;
  activeCampaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>;
  metrics: {
    // Active campaign metrics (used for classification)
    totalSent: number;
    totalOpened: number;
    totalReplied: number;
    totalBounced: number;
    replyRate: number;
    openRate: number;
    bounceRate: number;
    positiveReplies: number;
    opportunities: number;
    conversionRate: number;
    uncontactedLeads: number;
    avgInboxHealth: number;
    leadsCount: number;
    contactedCount: number;
    completedCount: number;
    totalInterested: number;
    totalMeetingBooked: number;
    totalMeetingCompleted: number;
    totalClosed: number;
    positiveReplyRate: number;
    posReplyToMeeting: number;
    // Campaign counts
    activeCampaignCount: number;
    totalCampaignCount: number;
  };
  // Lifetime metrics (for TAM exhaustion check)
  lifetimeMetrics: {
    totalSent: number;
    totalLeads: number;
    uncontactedLeads: number;
  };
  classification: ClientClassification;
  healthScore: number;
}

export interface TransformedAccount {
  id: string;
  email: string;
  // Note: Inboxes are shared, not specific to a client
  status: "connected" | "disconnected" | "warmup" | "error";
  healthScore: number;
  healthScoreLabel: string;
  dailySendLimit: number;
  sentToday: number;
  provider: string;
  tags: string[];
  warmupStatus?: string;
  warmupScore: number;
  landedInbox: number;
  landedSpam: number;
  sendingError?: boolean;
  errorMessage?: string;
  lastUsed?: string;
}

/**
 * Extract client name from campaign name
 * NEVER use inbox email as client name
 */
export function extractClientName(campaignName: string): string {
  const nameLower = campaignName.toLowerCase().trim();
  
  // Check for known client name mappings FIRST
  for (const [pattern, clientName] of Object.entries(CLIENT_NAME_MAPPINGS)) {
    if (nameLower.includes(pattern)) {
      return clientName;
    }
  }

  let name = campaignName;
  
  // Remove common prefixes
  name = name.replace(/^\(barracuda\)\s*/i, '');
  name = name.replace(/^\(baracuda\)\s*/i, '');
  
  // Remove common suffixes
  name = name.replace(/\s*-\s*RR.*$/i, '');
  name = name.replace(/\s*RR\s+.*$/i, '');
  name = name.replace(/\s*V\d+.*$/i, '');
  name = name.replace(/\s*Trial.*$/i, '');
  name = name.replace(/\s*Rerun.*$/i, '');
  name = name.replace(/\s*\(copy\).*$/i, '');
  name = name.replace(/\s*Recycled.*$/i, '');
  name = name.replace(/\s*Final\s+Consumer.*$/i, '');
  name = name.replace(/\s+Run$/i, '');
  name = name.replace(/\s+rewarm$/i, '');
  name = name.replace(/\s+Outlook.*$/i, '');
  name = name.replace(/\s+hypertide.*$/i, '');
  name = name.replace(/\s+generic\d*$/i, '');
  
  // Try to extract from patterns
  const patterns = [
    /^(.+?)\s*[-–—|]\s*/,
    /^\[(.+?)\]\s*/,
    /^(.+?):\s*/,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      name = match[1].trim();
      break;
    }
  }

  // NEVER use email as client name
  if (name.includes('@')) {
    // Extract from campaign name before the email part
    const words = campaignName.split(/\s+/).filter(w => !w.includes('@'));
    name = words.slice(0, 2).join(' ') || 'Unknown';
  }

  // Use first 2-3 meaningful words as the client name
  const words = name.trim().split(/\s+/).filter(w => w.length > 1);
  if (words.length >= 2) {
    return words.slice(0, 2).join(' ');
  }
  
  return name.trim() || 'Unknown';
}

/**
 * Group campaigns by client name
 */
export function groupCampaignsByClient(
  campaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>
): Map<string, Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>> {
  const clientMap = new Map<string, Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>>();

  campaigns.forEach((campaign) => {
    const clientName = extractClientName(campaign.name);
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, []);
    }
    clientMap.get(clientName)!.push(campaign);
  });

  return clientMap;
}

/**
 * Calculate metrics for a client's campaigns
 * Uses ONLY ACTIVE campaigns for primary metrics
 */
export function calculateClientMetrics(
  activeCampaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>,
  allCampaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>
): { metrics: TransformedClient["metrics"]; lifetimeMetrics: TransformedClient["lifetimeMetrics"] } {
  
  // Calculate metrics from ACTIVE campaigns only
  let totalSent = 0;
  let totalOpened = 0;
  let totalReplied = 0;
  let totalBounced = 0;
  let opportunities = 0;
  let leadsCount = 0;
  let contactedCount = 0;
  let totalInterested = 0;
  let totalMeetingBooked = 0;
  let totalMeetingCompleted = 0;
  let totalClosed = 0;

  activeCampaigns.forEach((campaign) => {
    if (campaign.analytics) {
      totalSent += campaign.analytics.sent || campaign.analytics.total_sent || 0;
      totalOpened += campaign.analytics.unique_opened || campaign.analytics.total_opened || 0;
      totalReplied += campaign.analytics.unique_replies || campaign.analytics.total_replied || 0;
      totalBounced += campaign.analytics.bounced || campaign.analytics.total_bounced || 0;
      opportunities += campaign.analytics.total_opportunities || 0;
      leadsCount += campaign.analytics.total_leads || campaign.analytics.leads_count || 0;
      contactedCount += campaign.analytics.contacted || campaign.analytics.contacted_count || 0;
      totalInterested += campaign.analytics.total_interested || 0;
      totalMeetingBooked += campaign.analytics.total_meeting_booked || 0;
      totalMeetingCompleted += campaign.analytics.total_meeting_completed || 0;
      totalClosed += campaign.analytics.total_closed || 0;
    }
  });

  // Calculate lifetime metrics from ALL campaigns (for TAM check)
  let lifetimeSent = 0;
  let lifetimeLeads = 0;
  let lifetimeContacted = 0;

  allCampaigns.forEach((campaign) => {
    if (campaign.analytics) {
      lifetimeSent += campaign.analytics.sent || campaign.analytics.total_sent || 0;
      lifetimeLeads += campaign.analytics.total_leads || campaign.analytics.leads_count || 0;
      lifetimeContacted += campaign.analytics.contacted || campaign.analytics.contacted_count || 0;
    }
  });

  const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  
  const positiveReplies = totalInterested > 0 ? totalInterested : Math.floor(totalReplied * 0.5);
  const conversionRate = positiveReplies > 0 ? (opportunities / positiveReplies) * 100 : 0;
  const positiveReplyRate = totalReplied > 0 ? (totalInterested / totalReplied) * 100 : 0;
  const posReplyToMeeting = totalInterested > 0 ? (totalMeetingBooked / totalInterested) * 100 : 0;

  const uncontactedLeads = Math.max(0, leadsCount - contactedCount);

  return {
    metrics: {
      totalSent,
      totalOpened,
      totalReplied,
      totalBounced,
      replyRate: Number(replyRate.toFixed(2)),
      openRate: Number(openRate.toFixed(2)),
      bounceRate: Number(bounceRate.toFixed(2)),
      positiveReplies,
      opportunities,
      conversionRate: Number(conversionRate.toFixed(2)),
      uncontactedLeads,
      avgInboxHealth: 85,
      leadsCount,
      contactedCount,
      completedCount: 0,
      totalInterested,
      totalMeetingBooked,
      totalMeetingCompleted,
      totalClosed,
      positiveReplyRate: Number(positiveReplyRate.toFixed(2)),
      posReplyToMeeting: Number(posReplyToMeeting.toFixed(2)),
      activeCampaignCount: activeCampaigns.length,
      totalCampaignCount: allCampaigns.length,
    },
    lifetimeMetrics: {
      totalSent: lifetimeSent,
      totalLeads: lifetimeLeads,
      uncontactedLeads: Math.max(0, lifetimeLeads - lifetimeContacted),
    },
  };
}

/**
 * Classify a client into an issue bucket based on their ACTIVE campaign metrics
 */
export function classifyClient(
  clientName: string, 
  metrics: TransformedClient["metrics"],
  lifetimeMetrics: TransformedClient["lifetimeMetrics"]
): ClientClassification {
  const { replyRate, conversionRate, totalSent, uncontactedLeads, avgInboxHealth, bounceRate, posReplyToMeeting, activeCampaignCount } = metrics;

  let bucket: IssueBucket = "PERFORMING_WELL";
  let severity: "low" | "medium" | "high" | "critical" = "low";
  let reasoning: string[] = [];

  // No active campaigns
  if (activeCampaignCount === 0) {
    bucket = "TOO_EARLY";
    severity = "low";
    reasoning = ["No active campaigns running"];
  }
  // Too Early - not enough data from ACTIVE campaigns
  else if (totalSent < 1000) {
    bucket = "TOO_EARLY";
    severity = "low";
    reasoning = [`Only ${totalSent} emails sent from active campaigns, need more data`];
  }
  // Deliverability Issues - ONLY check bounce rate
  // Note: Inbox health is shared across clients, not client-specific
  else if (bounceRate > 5) {
    bucket = "DELIVERABILITY_ISSUE";
    severity = bounceRate > 10 ? "critical" : "high";
    reasoning = [`High bounce rate: ${bounceRate.toFixed(1)}%`];
  }
  // Copy Issues - low reply rate
  else if (replyRate < BENCHMARKS.CRITICAL_REPLY_RATE) {
    bucket = "COPY_ISSUE";
    severity = replyRate < 0.3 ? "critical" : "high";
    reasoning = [`Reply rate ${replyRate.toFixed(2)}% below critical threshold of ${BENCHMARKS.CRITICAL_REPLY_RATE}%`];
  }
  // Subsequence Issues - replies but low positive reply to meeting ratio
  else if (replyRate >= BENCHMARKS.GOOD_REPLY_RATE && posReplyToMeeting < 40) {
    bucket = "SUBSEQUENCE_ISSUE";
    severity = posReplyToMeeting < 20 ? "high" : "medium";
    reasoning = [
      `Good reply rate (${replyRate.toFixed(2)}%) but low pos-reply-to-meeting (${posReplyToMeeting.toFixed(2)}%)`,
      "Subsequence emails or booking process needs optimization"
    ];
  }
  // Volume Issues - low send volume
  else if (totalSent < 5000 && replyRate >= BENCHMARKS.GOOD_REPLY_RATE) {
    bucket = "VOLUME_ISSUE";
    severity = "medium";
    reasoning = ["Good performance but low volume", "Consider scaling up sending"];
  }
  // TAM Exhausted - check LIFETIME uncontacted leads
  else if (lifetimeMetrics.uncontactedLeads < BENCHMARKS.WARNING_UNCONTACTED) {
    bucket = "TAM_EXHAUSTED";
    severity = lifetimeMetrics.uncontactedLeads < BENCHMARKS.CRITICAL_UNCONTACTED ? "critical" : "high";
    reasoning = [`Only ${lifetimeMetrics.uncontactedLeads} uncontacted leads remaining (lifetime)`];
  }
  // Performing Well
  else if (replyRate >= BENCHMARKS.GOOD_REPLY_RATE && conversionRate >= BENCHMARKS.TARGET_CONVERSION) {
    bucket = "PERFORMING_WELL";
    severity = "low";
    reasoning = [
      `Reply rate ${replyRate.toFixed(2)}% meets target`,
      `Conversion rate ${conversionRate.toFixed(2)}% is healthy`
    ];
  }
  // Moderate performance
  else {
    bucket = "PERFORMING_WELL";
    severity = "medium";
    reasoning = ["Performance is acceptable but could be improved"];
  }

  const fullMetrics = {
    ...metrics,
    totalReplies: metrics.totalReplied,
    totalLeads: metrics.leadsCount,
    activeCampaigns: metrics.activeCampaignCount,
    activeInboxes: 0,
    disconnectedInboxes: 0,
    lowHealthInboxes: 0,
  };

  const bucketConfig = BUCKET_CONFIGS[bucket];

  return {
    clientId: clientName.toLowerCase().replace(/\s+/g, "-"),
    clientName,
    bucket,
    severity,
    reason: reasoning.join(". "),
    metrics: fullMetrics,
    autoTask: {
      title: `Review ${bucketConfig?.label || bucket}`,
      description: reasoning[0] || "Check client metrics",
      category: bucket,
    },
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Calculate overall health score for a client
 */
export function calculateHealthScore(metrics: TransformedClient["metrics"]): number {
  const { replyRate, conversionRate, bounceRate, avgInboxHealth, posReplyToMeeting, activeCampaignCount } = metrics;
  
  // No active campaigns = low health
  if (activeCampaignCount === 0) {
    return 30;
  }

  const replyWeight = 0.30;
  const conversionWeight = 0.20;
  const bounceWeight = 0.15;
  const inboxWeight = 0.15;
  const meetingWeight = 0.20;

  const replyScore = Math.min(100, (replyRate / BENCHMARKS.GOOD_REPLY_RATE) * 100);
  const conversionScore = Math.min(100, (conversionRate / BENCHMARKS.TARGET_CONVERSION) * 100);
  const bounceScore = Math.max(0, 100 - (bounceRate * 10));
  const inboxScore = avgInboxHealth;
  const meetingScore = Math.min(100, (posReplyToMeeting / 40) * 100);

  const healthScore = 
    replyScore * replyWeight +
    conversionScore * conversionWeight +
    bounceScore * bounceWeight +
    inboxScore * inboxWeight +
    meetingScore * meetingWeight;

  return Math.round(Math.min(100, Math.max(0, healthScore)));
}

/**
 * Transform Instantly campaigns into app's client format
 * Uses ACTIVE campaigns for classification
 */
export function transformCampaignsToClients(
  allCampaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>,
  activeCampaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>
): TransformedClient[] {
  // Group ALL campaigns by client
  const allClientMap = groupCampaignsByClient(allCampaigns);
  
  // Group ACTIVE campaigns by client
  const activeClientMap = groupCampaignsByClient(activeCampaigns);
  
  const clients: TransformedClient[] = [];

  // Process all clients (even those without active campaigns)
  allClientMap.forEach((clientCampaigns, clientName) => {
    const activeClientCampaigns = activeClientMap.get(clientName) || [];
    
    const { metrics, lifetimeMetrics } = calculateClientMetrics(activeClientCampaigns, clientCampaigns);
    const classification = classifyClient(clientName, metrics, lifetimeMetrics);
    const healthScore = calculateHealthScore(metrics);

    clients.push({
      id: clientName.toLowerCase().replace(/\s+/g, "-"),
      name: clientName,
      campaigns: clientCampaigns,
      activeCampaigns: activeClientCampaigns,
      metrics,
      lifetimeMetrics,
      classification,
      healthScore,
    });
  });

  // Sort by health score (worst first for priority)
  return clients.sort((a, b) => a.healthScore - b.healthScore);
}

/**
 * Transform Instantly accounts into app's account format
 * Note: Inboxes are shared, not specific to clients
 */
export function transformAccounts(accounts: InstantlyAccount[]): TransformedAccount[] {
  return accounts.map((account) => ({
    id: account.id || account.email,
    email: account.email,
    status: account.statusLabel,
    healthScore: account.health_score,
    healthScoreLabel: account.health_score_label,
    dailySendLimit: account.daily_limit || 50,
    sentToday: 0,
    provider: account.providerLabel || "Unknown",
    tags: account.tags || [],
    warmupStatus: account.warmup_enabled ? "active" : "inactive",
    warmupScore: account.warmup_score || 0,
    landedInbox: account.landed_inbox || 0,
    landedSpam: account.landed_spam || 0,
    sendingError: account.has_error,
    errorMessage: account.error_message,
    lastUsed: account.last_used,
  }));
}

/**
 * Calculate portfolio-level metrics
 */
export function calculatePortfolioMetrics(clients: TransformedClient[], accounts: TransformedAccount[]) {
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.metrics.activeCampaignCount > 0).length;
  
  let totalSent = 0;
  let totalReplied = 0;
  let totalOpportunities = 0;
  let totalInterested = 0;
  let totalMeetingBooked = 0;
  let healthSum = 0;
  let totalActiveCampaigns = 0;

  clients.forEach(client => {
    totalSent += client.metrics.totalSent;
    totalReplied += client.metrics.totalReplied;
    totalOpportunities += client.metrics.opportunities;
    totalInterested += client.metrics.totalInterested;
    totalMeetingBooked += client.metrics.totalMeetingBooked;
    healthSum += client.healthScore;
    totalActiveCampaigns += client.metrics.activeCampaignCount;
  });

  const avgReplyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
  const avgHealthScore = totalClients > 0 ? healthSum / totalClients : 0;
  const posReplyToMeeting = totalInterested > 0 ? (totalMeetingBooked / totalInterested) * 100 : 0;

  const connectedInboxes = accounts.filter(a => a.status === "connected").length;
  const warmupInboxes = accounts.filter(a => a.status === "warmup").length;
  const disconnectedInboxes = accounts.filter(a => a.status === "disconnected").length;
  const avgInboxHealth = accounts.length > 0 
    ? accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length 
    : 0;

  return {
    totalClients,
    activeClients,
    totalActiveCampaigns,
    totalSent,
    totalReplied,
    totalOpportunities,
    totalInterested,
    totalMeetingBooked,
    avgReplyRate: Number(avgReplyRate.toFixed(2)),
    avgConversionRate: totalReplied > 0 
      ? Number(((totalOpportunities / totalReplied) * 100).toFixed(2))
      : 0,
    posReplyToMeeting: Number(posReplyToMeeting.toFixed(2)),
    avgHealthScore: Math.round(avgHealthScore),
    activeInboxes: connectedInboxes,
    warmupInboxes,
    disconnectedInboxes,
    totalInboxes: accounts.length,
    avgInboxHealth: Math.round(avgInboxHealth),
  };
}

// Task templates based on bucket type
const BUCKET_TASKS: Record<IssueBucket, { daily: string[]; weekly: string[] }> = {
  VOLUME_ISSUE: {
    daily: ["Add more leads to campaign"],
    weekly: ["Review lead sourcing strategy", "Check list quality"],
  },
  COPY_ISSUE: {
    daily: ["Review and update email copy", "A/B test subject lines"],
    weekly: ["Analyze reply patterns", "Update email templates"],
  },
  SUBSEQUENCE_ISSUE: {
    daily: ["Review subsequence emails", "Check follow-up timing", "Review booking process"],
    weekly: ["Optimize conversion flow", "Review meeting booking process", "Check calendar availability"],
  },
  DELIVERABILITY_ISSUE: {
    daily: ["Check inbox health", "Warm up inboxes"],
    weekly: ["Review bounce rates", "Clean email lists"],
  },
  TAM_EXHAUSTED: {
    daily: ["Add new lead lists", "Recycle old leads"],
    weekly: ["Expand target market", "Review ICP"],
  },
  NOT_VIABLE: {
    daily: ["Review campaign viability"],
    weekly: ["Consider pausing campaign", "Discuss with client"],
  },
  PERFORMING_WELL: {
    daily: [],
    weekly: ["Maintain performance", "Scale if possible"],
  },
  TOO_EARLY: {
    daily: [],
    weekly: ["Monitor initial performance"],
  },
};

/**
 * Generate tasks based on client classifications
 * Prioritizes clients with ACTIVE campaigns and issues
 */
export function generateTasksFromClassifications(clients: TransformedClient[]) {
  const daily: Array<{
    id: string;
    title: string;
    description: string;
    clientId: string;
    clientName: string;
    bucket: IssueBucket;
    priority: "low" | "medium" | "high" | "critical";
    dueDate: string;
    completed: boolean;
  }> = [];

  const weekly: typeof daily = [];

  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Only generate tasks for clients with active campaigns
  const activeClients = clients.filter(c => c.metrics.activeCampaignCount > 0);

  activeClients.forEach((client) => {
    const { bucket, severity } = client.classification;
    const tasks = BUCKET_TASKS[bucket];

    if (!tasks) return;

    // Generate daily tasks for critical/high severity issues
    if (severity === "critical" || severity === "high") {
      tasks.daily.forEach((taskTitle, index) => {
        daily.push({
          id: `${client.id}-daily-${index}`,
          title: taskTitle,
          description: `Action required for ${client.name} (${client.metrics.activeCampaignCount} active campaigns)`,
          clientId: client.id,
          clientName: client.name,
          bucket,
          priority: severity,
          dueDate: today,
          completed: false,
        });
      });
    }

    // Generate weekly tasks
    tasks.weekly.forEach((taskTitle, index) => {
      weekly.push({
        id: `${client.id}-weekly-${index}`,
        title: taskTitle,
        description: `Weekly review for ${client.name}`,
        clientId: client.id,
        clientName: client.name,
        bucket,
        priority: severity === "critical" ? "high" : severity,
        dueDate: nextWeek,
        completed: false,
      });
    });
  });

  return { daily, weekly };
}
