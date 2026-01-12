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
    // Fetch all data using the comprehensive getFullAnalytics method
    // This fetches: campaigns, analytics, analytics overview, accounts, warmup analytics, tags, tag mappings
    const fullData = await instantlyService.getFullAnalytics();

    if (fullData.error) {
      console.error('[Dashboard] Instantly API error:', fullData.error);
    }

    const { campaigns, analytics, accounts, tags, tagMappings } = fullData;

    console.log(`[Dashboard] Processing ${campaigns.length} campaigns`);
    console.log(`[Dashboard] Processing ${accounts.length} accounts`);
    console.log(`[Dashboard] Processing ${tags.length} tags`);
    console.log(`[Dashboard] Processing ${tagMappings.length} tag mappings`);

    // Log sample data for debugging
    if (campaigns.length > 0 && campaigns[0].analytics) {
      const sample = campaigns[0].analytics;
      console.log(`[Dashboard] Sample analytics:`, {
        campaign: campaigns[0].name,
        sent: sample.sent,
        replies: sample.unique_replies,
        interested: sample.total_interested,
        meetingBooked: sample.total_meeting_booked,
        opportunities: sample.total_opportunities,
        replyRate: sample.reply_rate,
      });
    }

    // Transform data into app format
    const clients = transformCampaignsToClients(campaigns);
    const transformedAccounts = transformAccounts(accounts, clients);
    const portfolioMetrics = calculatePortfolioMetrics(clients, transformedAccounts);
    const tasks = generateTasksFromClassifications(clients);

    // Calculate bucket distribution
    const bucketDistribution = clients.reduce((acc, client) => {
      acc[client.classification.bucket] = (acc[client.classification.bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get inbox health summary
    const inboxHealth = {
      total: transformedAccounts.length,
      connected: transformedAccounts.filter(a => a.status === 'connected').length,
      disconnected: transformedAccounts.filter(a => a.status === 'disconnected').length,
      warmup: transformedAccounts.filter(a => a.status === 'warmup').length,
      avgHealth: portfolioMetrics.avgInboxHealth,
      lowHealth: transformedAccounts.filter(a => a.healthScore < 70).length,
    };

    // All unique tags - get from both the tags API and accounts
    const tagsFromApi = tags.map(t => t.name).filter(Boolean);
    const tagsFromAccounts = transformedAccounts.flatMap(a => a.tags);
    const allTags = Array.from(new Set([...tagsFromApi, ...tagsFromAccounts])).sort();

    // Build response
    const response = {
      clients,
      accounts: transformedAccounts,
      portfolioMetrics,
      tasks,
      bucketDistribution,
      inboxHealth,
      tags,
      tagMappings,
      allTags,
      // Aggregated analytics summary
      analyticsSummary: {
        totalSent: analytics.reduce((sum, a) => sum + (a.sent || 0), 0),
        totalReplies: analytics.reduce((sum, a) => sum + (a.unique_replies || 0), 0),
        totalOpportunities: analytics.reduce((sum, a) => sum + (a.total_opportunities || 0), 0),
        totalInterested: analytics.reduce((sum, a) => sum + (a.total_interested || 0), 0),
        totalMeetingBooked: analytics.reduce((sum, a) => sum + (a.total_meeting_booked || 0), 0),
        avgReplyRate: analytics.length > 0
          ? Number((analytics.reduce((sum, a) => sum + (a.reply_rate || 0), 0) / analytics.length).toFixed(2))
          : 0,
      },
      meta: {
        campaignCount: campaigns.length,
        accountCount: accounts.length,
        clientCount: clients.length,
        analyticsCount: analytics.length,
        tagCount: tags.length,
        lastUpdated: new Date().toISOString(),
        source: fullData.error ? 'partial' : 'instantly',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Dashboard] API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
