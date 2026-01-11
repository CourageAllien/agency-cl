/**
 * Data Transformer
 * Transforms Instantly API data into the app's internal format
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

// Transformed types for the app
export interface TransformedClient {
  id: string;
  name: string;
  campaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>;
  metrics: {
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
    // New fields from overview
    totalInterested: number;
    totalMeetingBooked: number;
    totalMeetingCompleted: number;
    totalClosed: number;
    positiveReplyRate: number;
    posReplyToMeeting: number;
  };
  classification: ClientClassification;
  healthScore: number;
}

export interface TransformedAccount {
  id: string;
  email: string;
  clientName: string;
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
 */
export function extractClientName(campaignName: string): string {
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
  
  const patterns = [
    /^(.+?)\s*[-–—|]\s*/,
    /^\[(.+?)\]\s*/,
    /^(.+?):\s*/,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.slice(0, 2).join(" ");
  }
  return campaignName;
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
 */
export function calculateClientMetrics(
  campaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>
): TransformedClient["metrics"] {
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

  campaigns.forEach((campaign) => {
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

  const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  
  // Positive replies = interested responses
  const positiveReplies = totalInterested > 0 ? totalInterested : Math.floor(totalReplied * 0.5);
  const conversionRate = positiveReplies > 0 ? (opportunities / positiveReplies) * 100 : 0;
  const positiveReplyRate = totalReplied > 0 ? (totalInterested / totalReplied) * 100 : 0;
  const posReplyToMeeting = totalInterested > 0 ? (totalMeetingBooked / totalInterested) * 100 : 0;

  const uncontactedLeads = Math.max(0, leadsCount - contactedCount);

  return {
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
  };
}

/**
 * Classify a client into an issue bucket based on their metrics
 */
export function classifyClient(clientName: string, metrics: TransformedClient["metrics"]): ClientClassification {
  const { replyRate, conversionRate, totalSent, uncontactedLeads, avgInboxHealth, bounceRate, posReplyToMeeting } = metrics;

  let bucket: IssueBucket = "PERFORMING_WELL";
  let severity: "low" | "medium" | "high" | "critical" = "low";
  let reasoning: string[] = [];

  // Too Early - not enough data
  if (totalSent < 1000) {
    bucket = "TOO_EARLY";
    severity = "low";
    reasoning = [`Only ${totalSent} emails sent, need more data for analysis`];
  }
  // Deliverability Issues
  else if (bounceRate > 5 || avgInboxHealth < BENCHMARKS.HEALTHY_INBOX) {
    bucket = "DELIVERABILITY_ISSUE";
    severity = bounceRate > 10 || avgInboxHealth < 50 ? "critical" : "high";
    reasoning = [];
    if (bounceRate > 5) reasoning.push(`High bounce rate: ${bounceRate.toFixed(1)}%`);
    if (avgInboxHealth < BENCHMARKS.HEALTHY_INBOX) reasoning.push(`Low inbox health: ${avgInboxHealth}%`);
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
  // TAM Exhausted
  else if (uncontactedLeads < BENCHMARKS.WARNING_UNCONTACTED) {
    bucket = "TAM_EXHAUSTED";
    severity = uncontactedLeads < BENCHMARKS.CRITICAL_UNCONTACTED ? "critical" : "high";
    reasoning = [`Only ${uncontactedLeads} uncontacted leads remaining`];
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
    activeCampaigns: 1,
    activeInboxes: 2,
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
  const { replyRate, conversionRate, bounceRate, avgInboxHealth, posReplyToMeeting } = metrics;
  
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
 */
export function transformCampaignsToClients(
  campaigns: Array<InstantlyCampaign & { analytics?: InstantlyCampaignAnalytics }>
): TransformedClient[] {
  const clientMap = groupCampaignsByClient(campaigns);
  const clients: TransformedClient[] = [];

  clientMap.forEach((clientCampaigns, clientName) => {
    const metrics = calculateClientMetrics(clientCampaigns);
    const classification = classifyClient(clientName, metrics);
    const healthScore = calculateHealthScore(metrics);

    clients.push({
      id: clientName.toLowerCase().replace(/\s+/g, "-"),
      name: clientName,
      campaigns: clientCampaigns,
      metrics,
      classification,
      healthScore,
    });
  });

  return clients.sort((a, b) => a.healthScore - b.healthScore);
}

/**
 * Transform Instantly accounts into app's account format
 */
export function transformAccounts(accounts: InstantlyAccount[], clients: TransformedClient[]): TransformedAccount[] {
  return accounts.map((account) => {
    const emailDomain = account.email.split("@")[1]?.split(".")[0] || "";
    let clientName = "Unknown";
    
    // Try to find matching client by email domain or tags
    for (const client of clients) {
      if (
        client.name.toLowerCase().includes(emailDomain.toLowerCase()) ||
        emailDomain.toLowerCase().includes(client.name.toLowerCase().split(" ")[0])
      ) {
        clientName = client.name;
        break;
      }
    }

    // If account has tags, try matching by tag name
    if (clientName === "Unknown" && account.tags.length > 0) {
      for (const client of clients) {
        if (account.tags.some(tag => 
          tag.toLowerCase().includes(client.name.toLowerCase()) ||
          client.name.toLowerCase().includes(tag.toLowerCase())
        )) {
          clientName = client.name;
          break;
        }
      }
    }

    return {
      id: account.id || account.email,
      email: account.email,
      clientName,
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
    };
  });
}

/**
 * Calculate portfolio-level metrics
 */
export function calculatePortfolioMetrics(clients: TransformedClient[], accounts: TransformedAccount[]) {
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.metrics.totalSent > 0).length;
  
  let totalSent = 0;
  let totalReplied = 0;
  let totalOpportunities = 0;
  let totalInterested = 0;
  let totalMeetingBooked = 0;
  let healthSum = 0;

  clients.forEach(client => {
    totalSent += client.metrics.totalSent;
    totalReplied += client.metrics.totalReplied;
    totalOpportunities += client.metrics.opportunities;
    totalInterested += client.metrics.totalInterested;
    totalMeetingBooked += client.metrics.totalMeetingBooked;
    healthSum += client.healthScore;
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

  clients.forEach((client) => {
    const { bucket, severity } = client.classification;
    const tasks = BUCKET_TASKS[bucket];

    if (!tasks) return;

    if (severity === "critical" || severity === "high") {
      tasks.daily.forEach((taskTitle, index) => {
        daily.push({
          id: `${client.id}-daily-${index}`,
          title: taskTitle,
          description: `Action required for ${client.name}`,
          clientId: client.id,
          clientName: client.name,
          bucket,
          priority: severity,
          dueDate: today,
          completed: false,
        });
      });
    }

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
