"use client";

import { useQuery } from "@tanstack/react-query";
import type { TransformedClient, TransformedAccount } from "@/lib/services/dataTransformer";
import type { IssueBucket } from "@/types/analysis";

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
    source: "instantly" | "partial" | "fallback";
  };
}

export function useDashboardData() {
  return useQuery<DashboardResponse>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
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
