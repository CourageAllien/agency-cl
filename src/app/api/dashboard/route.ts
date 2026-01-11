import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';
import {
  transformCampaignsToClients,
  transformAccounts,
  calculatePortfolioMetrics,
  generateTasksFromClassifications,
} from '@/lib/services/dataTransformer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Fetch all data in parallel using the service's merged method
    const fullData = await instantlyService.getFullAnalytics();

    // Check for API errors
    if (fullData.error) {
      console.error('Instantly API error:', fullData.error);
    }

    // Get the campaigns with analytics already merged
    const campaignsWithAnalytics = fullData.campaigns;
    const rawAccounts = fullData.accounts;

    console.log(`[Dashboard] Processing ${campaignsWithAnalytics.length} campaigns with analytics`);
    console.log(`[Dashboard] Processing ${rawAccounts.length} accounts`);

    // Log sample analytics to verify data
    if (campaignsWithAnalytics.length > 0 && campaignsWithAnalytics[0].analytics) {
      console.log(`[Dashboard] Sample analytics:`, {
        campaign: campaignsWithAnalytics[0].name,
        sent: campaignsWithAnalytics[0].analytics.total_sent,
        replied: campaignsWithAnalytics[0].analytics.total_replied,
        opportunities: campaignsWithAnalytics[0].analytics.total_opportunities,
      });
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
      // Include raw analytics for debugging
      rawAnalyticsSummary: {
        totalCampaignsWithAnalytics: campaignsWithAnalytics.filter(c => c.analytics).length,
        totalSentAcrossAll: fullData.analytics.reduce((sum, a) => sum + (a.total_sent || 0), 0),
        totalRepliesAcrossAll: fullData.analytics.reduce((sum, a) => sum + (a.total_replied || 0), 0),
      },
      meta: {
        campaignCount: campaignsWithAnalytics.length,
        accountCount: rawAccounts.length,
        clientCount: clients.length,
        analyticsCount: fullData.analytics.length,
        lastUpdated: new Date().toISOString(),
        source: fullData.error ? 'fallback' : 'instantly',
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
