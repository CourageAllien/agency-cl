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

interface DashboardResponse {
  clients: TransformedClient[];
  accounts: TransformedAccount[];
  portfolioMetrics: {
    totalClients: number;
    activeClients: number;
    totalSent: number;
    totalReplied: number;
    totalOpportunities: number;
    avgReplyRate: number;
    avgConversionRate: number;
    avgHealthScore: number;
    activeInboxes: number;
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
  };
  meta: {
    campaignCount: number;
    accountCount: number;
    clientCount: number;
    lastUpdated: string;
    source: "instantly" | "fallback";
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
    ...rest,
  };
}

export type { DashboardResponse, DashboardTask };
