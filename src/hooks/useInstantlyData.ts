"use client";

import { useQuery } from "@tanstack/react-query";

interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  analytics?: {
    campaign_id: string;
    campaign_name: string;
    total_sent: number;
    total_opened: number;
    total_replied: number;
    total_bounced: number;
    total_unsubscribed: number;
    positive_replies?: number;
    opportunities?: number;
  };
}

interface InstantlyAccount {
  id: string;
  email: string;
  clientName: string;
  status: string;
  healthScore: number;
  dailySendLimit: number;
  sentToday: number;
  provider: string;
  tags: string[];
  warmupStatus?: string;
}

interface CampaignsResponse {
  campaigns: InstantlyCampaign[];
  total: number;
}

interface AccountsResponse {
  accounts: InstantlyAccount[];
  total: number;
  connected: number;
  disconnected: number;
}

interface AnalyticsResponse {
  campaigns: Array<{
    campaign_id: string;
    campaign_name: string;
    total_sent: number;
    total_opened: number;
    total_replied: number;
    total_bounced: number;
    total_unsubscribed: number;
    positive_replies?: number;
    opportunities?: number;
  }>;
  totals: {
    totalSent: number;
    totalOpened: number;
    totalReplied: number;
    totalBounced: number;
    totalUnsubscribed: number;
    positiveReplies: number;
    opportunities: number;
    openRate: number;
    replyRate: number;
    bounceRate: number;
    conversionRate: number;
  };
  campaignCount: number;
}

export function useInstantlyCampaigns() {
  return useQuery<CampaignsResponse>({
    queryKey: ["instantly", "campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/instantly/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useInstantlyAccounts() {
  return useQuery<AccountsResponse>({
    queryKey: ["instantly", "accounts"],
    queryFn: async () => {
      const res = await fetch("/api/instantly/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useInstantlyAnalytics(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  
  return useQuery<AnalyticsResponse>({
    queryKey: ["instantly", "analytics", startDate, endDate],
    queryFn: async () => {
      const url = `/api/instantly/analytics${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

// Combined hook that fetches all data and processes it
export function useInstantlyFullData() {
  const campaigns = useInstantlyCampaigns();
  const accounts = useInstantlyAccounts();
  const analytics = useInstantlyAnalytics();

  const isLoading = campaigns.isLoading || accounts.isLoading || analytics.isLoading;
  const isError = campaigns.isError || accounts.isError || analytics.isError;
  const error = campaigns.error || accounts.error || analytics.error;

  // Process data to group by client
  const clientData = processClientData(
    campaigns.data?.campaigns || [],
    accounts.data?.accounts || [],
    analytics.data
  );

  return {
    isLoading,
    isError,
    error,
    campaigns: campaigns.data?.campaigns || [],
    accounts: accounts.data?.accounts || [],
    analytics: analytics.data,
    clientData,
    refetch: () => {
      campaigns.refetch();
      accounts.refetch();
      analytics.refetch();
    },
  };
}

function processClientData(
  campaigns: InstantlyCampaign[],
  accounts: InstantlyAccount[],
  analytics?: AnalyticsResponse
) {
  // Group campaigns by client name (extracted from campaign name)
  const clientMap = new Map<string, {
    campaigns: InstantlyCampaign[];
    accounts: InstantlyAccount[];
    totalSent: number;
    totalReplies: number;
    opportunities: number;
  }>();

  campaigns.forEach((campaign) => {
    const clientName = extractClientName(campaign.name);
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        campaigns: [],
        accounts: [],
        totalSent: 0,
        totalReplies: 0,
        opportunities: 0,
      });
    }
    const client = clientMap.get(clientName)!;
    client.campaigns.push(campaign);
    if (campaign.analytics) {
      client.totalSent += campaign.analytics.total_sent;
      client.totalReplies += campaign.analytics.total_replied;
      client.opportunities += campaign.analytics.opportunities || 0;
    }
  });

  // Add accounts to clients
  accounts.forEach((account) => {
    const clientName = account.clientName;
    if (clientMap.has(clientName)) {
      clientMap.get(clientName)!.accounts.push(account);
    }
  });

  return clientMap;
}

function extractClientName(campaignName: string): string {
  // Common patterns: "ClientName - Campaign", "ClientName | Campaign", "[ClientName] Campaign"
  const patterns = [
    /^(.+?)\s*[-|]\s*/,
    /^\[(.+?)\]\s*/,
    /^(.+?)\s*:\s*/,
  ];

  for (const pattern of patterns) {
    const match = campaignName.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // If no pattern matches, use the first two words
  const words = campaignName.split(" ");
  return words.slice(0, 2).join(" ");
}

export type { InstantlyCampaign, InstantlyAccount, CampaignsResponse, AccountsResponse, AnalyticsResponse };
