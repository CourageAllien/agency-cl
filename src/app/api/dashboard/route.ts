import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';
import {
  transformCampaignsToClients,
  transformAccounts,
  calculatePortfolioMetrics,
  generateTasksFromClassifications,
  type InstantlyCampaign,
} from '@/lib/services/dataTransformer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Fetch campaigns and accounts in parallel
    const [campaignsRes, accountsRes] = await Promise.all([
      instantlyService.getCampaigns(),
      instantlyService.getAccounts(),
    ]);

    // Check for API errors
    if (campaignsRes.error) {
      console.error('Campaigns API error:', campaignsRes.error);
    }
    if (accountsRes.error) {
      console.error('Accounts API error:', accountsRes.error);
    }

    // Get raw data (or empty arrays if failed)
    const rawCampaigns = campaignsRes.data || [];
    const rawAccounts = accountsRes.data || [];

    // Fetch analytics for each campaign if we have campaigns
    let campaignsWithAnalytics: InstantlyCampaign[] = rawCampaigns;
    
    if (rawCampaigns.length > 0) {
      // Try to get analytics summary
      const analyticsRes = await instantlyService.getCampaignAnalytics();
      
      if (analyticsRes.data && analyticsRes.data.length > 0) {
        // Merge analytics with campaigns
        campaignsWithAnalytics = rawCampaigns.map((campaign) => {
          const analytics = analyticsRes.data?.find(
            (a) => a.campaign_id === campaign.id || a.campaign_name === campaign.name
          );
          return {
            ...campaign,
            analytics: analytics || undefined,
          };
        });
      }
    }

    // Transform data into app format
    const clients = transformCampaignsToClients(campaignsWithAnalytics);
    const accounts = transformAccounts(rawAccounts, clients);
    const portfolioMetrics = calculatePortfolioMetrics(clients, accounts);
    const tasks = generateTasksFromClassifications(clients);

    // Calculate bucket distribution
    const bucketDistribution = clients.reduce((acc, client) => {
      acc[client.classification.bucket] = (acc[client.classification.bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get inbox health summary
    const inboxHealth = {
      total: accounts.length,
      connected: accounts.filter(a => a.status === 'connected').length,
      disconnected: accounts.filter(a => a.status === 'disconnected').length,
      warmup: accounts.filter(a => a.status === 'warmup').length,
      avgHealth: portfolioMetrics.avgInboxHealth,
    };

    // Build response
    const response = {
      clients,
      accounts,
      portfolioMetrics,
      tasks,
      bucketDistribution,
      inboxHealth,
      meta: {
        campaignCount: rawCampaigns.length,
        accountCount: rawAccounts.length,
        clientCount: clients.length,
        lastUpdated: new Date().toISOString(),
        source: campaignsRes.error ? 'fallback' : 'instantly',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
