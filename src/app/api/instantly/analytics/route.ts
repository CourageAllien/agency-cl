import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';
import { mockCampaigns } from '@/lib/mock-data';

// Helper to generate mock analytics response
function getMockAnalyticsResponse() {
  const analytics = mockCampaigns.map(c => ({
    campaign_id: c.id,
    campaign_name: c.name,
    sent: c.sent,
    unique_opened: c.opened,
    unique_replies: c.replied,
    bounced: c.bounced,
    unsubscribed: 0,
    total_opportunities: c.opportunities,
  }));

  const totals = analytics.reduce(
    (acc, campaign) => ({
      totalSent: acc.totalSent + campaign.sent,
      totalOpened: acc.totalOpened + campaign.unique_opened,
      totalReplied: acc.totalReplied + campaign.unique_replies,
      totalBounced: acc.totalBounced + campaign.bounced,
      totalUnsubscribed: acc.totalUnsubscribed + campaign.unsubscribed,
      opportunities: acc.opportunities + (campaign.total_opportunities || 0),
    }),
    {
      totalSent: 0,
      totalOpened: 0,
      totalReplied: 0,
      totalBounced: 0,
      totalUnsubscribed: 0,
      opportunities: 0,
    }
  );

  const openRate = totals.totalSent > 0 ? (totals.totalOpened / totals.totalSent) * 100 : 0;
  const replyRate = totals.totalSent > 0 ? (totals.totalReplied / totals.totalSent) * 100 : 0;
  const bounceRate = totals.totalSent > 0 ? (totals.totalBounced / totals.totalSent) * 100 : 0;

  return {
    campaigns: analytics,
    totals: {
      ...totals,
      openRate: Number(openRate.toFixed(2)),
      replyRate: Number(replyRate.toFixed(2)),
      bounceRate: Number(bounceRate.toFixed(2)),
    },
    campaignCount: analytics.length,
    source: 'mock',
  };
}

export async function GET() {
  try {
    const analyticsRes = await instantlyService.getCampaignAnalytics({ exclude_total_leads_count: false });

    // If API fails or returns no data, use mock data
    if (analyticsRes.error || !analyticsRes.data?.length) {
      console.log('Using mock analytics data. API error:', analyticsRes.error);
      return NextResponse.json(getMockAnalyticsResponse());
    }

    const analytics = analyticsRes.data || [];

    // Aggregate totals - using the correct v2 field names
    const totals = analytics.reduce(
      (acc, campaign) => ({
        totalSent: acc.totalSent + (campaign.sent || 0),
        totalOpened: acc.totalOpened + (campaign.unique_opened || 0),
        totalReplied: acc.totalReplied + (campaign.unique_replies || 0),
        totalBounced: acc.totalBounced + (campaign.bounced || 0),
        totalUnsubscribed: acc.totalUnsubscribed + (campaign.unsubscribed || 0),
        opportunities: acc.opportunities + (campaign.total_opportunities || 0),
      }),
      {
        totalSent: 0,
        totalOpened: 0,
        totalReplied: 0,
        totalBounced: 0,
        totalUnsubscribed: 0,
        opportunities: 0,
      }
    );

    // Calculate rates
    const openRate = totals.totalSent > 0 ? (totals.totalOpened / totals.totalSent) * 100 : 0;
    const replyRate = totals.totalSent > 0 ? (totals.totalReplied / totals.totalSent) * 100 : 0;
    const bounceRate = totals.totalSent > 0 ? (totals.totalBounced / totals.totalSent) * 100 : 0;
    const conversionRate = totals.totalReplied > 0 
      ? (totals.opportunities / totals.totalReplied) * 100 
      : 0;

    return NextResponse.json({
      campaigns: analytics,
      totals: {
        ...totals,
        openRate: Number(openRate.toFixed(2)),
        replyRate: Number(replyRate.toFixed(2)),
        bounceRate: Number(bounceRate.toFixed(2)),
        conversionRate: Number(conversionRate.toFixed(2)),
      },
      campaignCount: analytics.length,
      source: 'instantly',
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    // Fallback to mock data
    return NextResponse.json(getMockAnalyticsResponse());
  }
}
