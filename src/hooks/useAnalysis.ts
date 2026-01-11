"use client";

import { useQuery } from "@tanstack/react-query";
import { getMockClassifications, getMockInboxHealth, getMockWeeklyTrends, getMockPortfolioMetrics } from "@/lib/mock-data";
import type { ClientClassification, InboxHealthSummary, WeeklyTrendData } from "@/types/analysis";

interface AnalysisData {
  classifications: ClientClassification[];
  inboxHealth: InboxHealthSummary;
  weeklyTrends: WeeklyTrendData;
  portfolioMetrics: ReturnType<typeof getMockPortfolioMetrics>;
}

export function useAnalysis() {
  const query = useQuery<AnalysisData>({
    queryKey: ["analysis"],
    queryFn: async () => {
      // In production, this would be an API call
      // const response = await fetch('/api/campaign-manager/analyze');
      // return response.json();
      
      // For now, return mock data
      return {
        classifications: getMockClassifications(),
        inboxHealth: getMockInboxHealth(),
        weeklyTrends: getMockWeeklyTrends(),
        portfolioMetrics: getMockPortfolioMetrics(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    classifications: query.data?.classifications ?? [],
    inboxHealth: query.data?.inboxHealth,
    weeklyTrends: query.data?.weeklyTrends,
    portfolioMetrics: query.data?.portfolioMetrics,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useClientClassifications() {
  const { classifications, isLoading, isError } = useAnalysis();

  // Group by bucket
  const byBucket = classifications.reduce((acc, client) => {
    if (!acc[client.bucket]) {
      acc[client.bucket] = [];
    }
    acc[client.bucket].push(client);
    return acc;
  }, {} as Record<string, ClientClassification[]>);

  return {
    classifications,
    byBucket,
    isLoading,
    isError,
  };
}
