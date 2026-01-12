"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  getMockClassifications, 
  getMockPortfolioMetrics, 
  getMockTasks,
  mockAccounts,
  getAllTags,
} from "@/lib/mock-data";
import type { IssueBucket, ClientClassification } from "@/types/analysis";
import type { AutoTask } from "@/types/task";

// ============================================================
// DUMMY DATA MODE - Campaign Manager uses mock data only
// This prevents API calls and timeouts during development
// ============================================================

interface DashboardTask {
  id: string;
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  bucket: IssueBucket;
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string;
  completed: boolean;
}

interface CustomTag {
  id: string;
  name: string;
  color?: string;
}

interface TagMapping {
  id: string;
  tag_id: string;
  resource_id: string;
  resource_type: 'account' | 'campaign';
}

export interface TransformedClient {
  id: string;
  name: string;
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
    totalInterested: number;
    totalMeetingBooked: number;
    totalMeetingCompleted: number;
    totalClosed: number;
    positiveReplyRate: number;
    posReplyToMeeting: number;
    activeCampaignCount: number;
    totalCampaignCount: number;
  };
  classification: {
    bucket: IssueBucket;
    severity: "low" | "medium" | "high" | "critical";
    reason: string;
  };
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
}

interface DashboardResponse {
  clients: TransformedClient[];
  activeClients: TransformedClient[];
  accounts: TransformedAccount[];
  portfolioMetrics: {
    totalClients: number;
    activeClients: number;
    totalActiveCampaigns: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    totalReplied: number;
    totalOpportunities: number;
    totalInterested: number;
    totalMeetingBooked: number;
    avgReplyRate: number;
    avgConversionRate: number;
    posReplyToMeeting: number;
    avgHealthScore: number;
    activeInboxes: number;
    warmupInboxes: number;
    disconnectedInboxes: number;
    totalInboxes: number;
    avgInboxHealth: number;
  };
  tasks: {
    daily: DashboardTask[];
    weekly: DashboardTask[];
  };
  bucketDistribution: Record<string, number>;
  inboxHealth: {
    total: number;
    connected: number;
    disconnected: number;
    warmup: number;
    avgHealth: number;
    lowHealth: number;
    withErrors: number;
  };
  tags: CustomTag[];
  tagMappings: TagMapping[];
  allTags: string[];
  analyticsSummary: {
    totalSent: number;
    totalReplies: number;
    totalOpportunities: number;
    totalInterested: number;
    totalMeetingBooked: number;
    avgReplyRate: number;
  };
  meta: {
    totalCampaignCount: number;
    activeCampaignCount: number;
    accountCount: number;
    clientCount: number;
    activeClientCount: number;
    analyticsCount: number;
    tagCount: number;
    lastUpdated: string;
    source: "instantly" | "partial" | "fallback" | "mock";
  };
}

// Convert AutoTask to DashboardTask
function convertToDashboardTask(task: AutoTask): DashboardTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    clientId: task.id, // Use task id as client id
    clientName: task.clientName,
    bucket: task.bucket,
    priority: task.severity as "low" | "medium" | "high" | "critical",
    dueDate: task.dueDate,
    completed: task.completed,
  };
}

// Convert ClientClassification to TransformedClient
function convertToTransformedClient(c: ClientClassification): TransformedClient {
  const healthScore = Math.round(
    (c.metrics.replyRate > 0.45 ? 25 : 0) +
    (c.metrics.conversionRate > 15 ? 25 : 0) +
    (c.bucket === 'PERFORMING_WELL' ? 50 : c.bucket === 'TOO_EARLY' ? 30 : 20)
  );

  return {
    id: c.clientId,
    name: c.clientName,
    metrics: {
      totalSent: c.metrics.totalSent,
      totalOpened: c.metrics.totalOpened,
      totalReplied: c.metrics.totalReplies,
      totalBounced: Math.round(c.metrics.totalSent * 0.02),
      replyRate: c.metrics.replyRate,
      openRate: c.metrics.openRate,
      bounceRate: 2,
      positiveReplies: c.metrics.positiveReplies,
      opportunities: c.metrics.opportunities,
      conversionRate: c.metrics.conversionRate,
      uncontactedLeads: c.metrics.uncontactedLeads,
      avgInboxHealth: c.metrics.avgInboxHealth || 85,
      leadsCount: c.metrics.totalLeads,
      contactedCount: c.metrics.totalSent,
      completedCount: c.metrics.totalSent,
      totalInterested: c.metrics.positiveReplies,
      totalMeetingBooked: Math.round(c.metrics.opportunities * 0.4),
      totalMeetingCompleted: Math.round(c.metrics.opportunities * 0.3),
      totalClosed: Math.round(c.metrics.opportunities * 0.1),
      positiveReplyRate: c.metrics.totalReplies > 0 
        ? (c.metrics.positiveReplies / c.metrics.totalReplies) * 100 
        : 0,
      posReplyToMeeting: 40,
      activeCampaignCount: c.metrics.activeCampaigns || Math.ceil(Math.random() * 3) + 1,
      totalCampaignCount: (c.metrics.activeCampaigns || 2) + Math.ceil(Math.random() * 3),
    },
    classification: {
      bucket: c.bucket,
      severity: c.severity,
      reason: c.reason,
    },
    healthScore,
  };
}

// Generate mock dashboard data from existing mock functions
function generateMockDashboardData(): DashboardResponse {
  const classifications = getMockClassifications();
  const portfolioMetrics = getMockPortfolioMetrics();
  const { daily, weekly } = getMockTasks();
  const accounts = mockAccounts;
  const allTags = getAllTags();

  // Transform classifications to clients format
  const clients: TransformedClient[] = classifications.map(convertToTransformedClient);

  // Transform accounts
  const transformedAccounts: TransformedAccount[] = accounts.map((a) => ({
    id: a.id,
    email: a.email,
    clientName: a.clientName,
    status: (a.status === 'warming' ? 'warmup' : a.status) as "connected" | "disconnected" | "warmup" | "error",
    healthScore: a.healthScore,
    healthScoreLabel: `${a.healthScore}%`,
    dailySendLimit: a.dailySendLimit,
    sentToday: a.sentToday,
    provider: a.provider,
    tags: a.tags || [],
    warmupStatus: undefined,
    warmupScore: a.healthScore,
    landedInbox: 90,
    landedSpam: 10,
    sendingError: a.sendingError,
    errorMessage: a.errorMessage,
  }));

  // Calculate bucket distribution
  const bucketDistribution = classifications.reduce((acc, c) => {
    acc[c.bucket] = (acc[c.bucket] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Inbox health
  const connectedAccounts = accounts.filter(a => a.status === 'connected');
  const disconnectedAccounts = accounts.filter(a => a.status === 'disconnected');
  const warmupAccounts = accounts.filter(a => a.status === 'warming');
  const lowHealthAccounts = accounts.filter(a => a.healthScore < 70);
  const errorAccounts = accounts.filter(a => a.sendingError);

  const inboxHealth = {
    total: accounts.length,
    connected: connectedAccounts.length,
    disconnected: disconnectedAccounts.length,
    warmup: warmupAccounts.length,
    avgHealth: portfolioMetrics.avgInboxHealth,
    lowHealth: lowHealthAccounts.length,
    withErrors: errorAccounts.length,
  };

  // Generate mock tags
  const tags: CustomTag[] = allTags.map((name, i) => ({
    id: `tag-${i}`,
    name,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
  }));

  // Convert tasks
  const dashboardDailyTasks = daily.map(convertToDashboardTask);
  const dashboardWeeklyTasks = weekly.map(convertToDashboardTask);

  return {
    clients,
    activeClients: clients.filter(c => c.metrics.activeCampaignCount > 0),
    accounts: transformedAccounts,
    portfolioMetrics: {
      totalClients: portfolioMetrics.totalClients,
      activeClients: portfolioMetrics.activeClients,
      totalActiveCampaigns: 25,
      totalCampaigns: 50,
      activeCampaigns: 25,
      totalSent: portfolioMetrics.totalSent || 500000,
      totalReplied: portfolioMetrics.totalReplies || 2500,
      totalOpportunities: portfolioMetrics.totalOpportunities,
      totalInterested: portfolioMetrics.totalOpportunities * 2,
      totalMeetingBooked: Math.round(portfolioMetrics.totalOpportunities * 0.4),
      avgReplyRate: portfolioMetrics.avgReplyRate,
      avgConversionRate: portfolioMetrics.avgConversionRate,
      posReplyToMeeting: 40,
      avgHealthScore: portfolioMetrics.avgInboxHealth,
      activeInboxes: portfolioMetrics.activeInboxes,
      warmupInboxes: warmupAccounts.length,
      disconnectedInboxes: disconnectedAccounts.length,
      totalInboxes: accounts.length,
      avgInboxHealth: portfolioMetrics.avgInboxHealth,
    },
    tasks: { 
      daily: dashboardDailyTasks, 
      weekly: dashboardWeeklyTasks 
    },
    bucketDistribution,
    inboxHealth,
    tags,
    tagMappings: [],
    allTags,
    analyticsSummary: {
      totalSent: 500000,
      totalReplies: 2500,
      totalOpportunities: portfolioMetrics.totalOpportunities,
      totalInterested: portfolioMetrics.totalOpportunities * 2,
      totalMeetingBooked: Math.round(portfolioMetrics.totalOpportunities * 0.4),
      avgReplyRate: portfolioMetrics.avgReplyRate,
    },
    meta: {
      totalCampaignCount: 50,
      activeCampaignCount: 25,
      accountCount: accounts.length,
      clientCount: clients.length,
      activeClientCount: clients.filter(c => c.metrics.activeCampaignCount > 0).length,
      analyticsCount: 50,
      tagCount: allTags.length,
      lastUpdated: new Date().toISOString(),
      source: "mock",
    },
  };
}

export function useDashboardData() {
  return useQuery<DashboardResponse>({
    queryKey: ["dashboard-mock"],
    queryFn: async () => {
      // Simulate async delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 300));
      return generateMockDashboardData();
    },
    staleTime: 1000 * 60 * 60, // 1 hour (mock data doesn't change)
    refetchOnWindowFocus: false,
    retry: 0,
  });
}

export function useClients() {
  const { data, ...rest } = useDashboardData();
  return {
    clients: data?.clients || [],
    ...rest,
  };
}

export function useAccounts() {
  const { data, ...rest } = useDashboardData();
  return {
    accounts: data?.accounts || [],
    inboxHealth: data?.inboxHealth,
    allTags: data?.allTags || [],
    ...rest,
  };
}

export function useTasks() {
  const { data, ...rest } = useDashboardData();
  return {
    daily: data?.tasks.daily || [],
    weekly: data?.tasks.weekly || [],
    ...rest,
  };
}

export function usePortfolioMetrics() {
  const { data, ...rest } = useDashboardData();
  return {
    metrics: data?.portfolioMetrics,
    analyticsSummary: data?.analyticsSummary,
    ...rest,
  };
}

export function useTags() {
  const { data, ...rest } = useDashboardData();
  return {
    tags: data?.tags || [],
    tagMappings: data?.tagMappings || [],
    allTags: data?.allTags || [],
    ...rest,
  };
}

export type { DashboardResponse, DashboardTask, CustomTag, TagMapping };
