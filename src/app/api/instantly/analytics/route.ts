import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';
import { mockCampaigns } from '@/lib/mock-data';

// Helper to generate mock analytics response
function getMockAnalyticsResponse() {
  const analytics = mockCampaigns.map(c => ({
    campaign_id: c.id,
    campaign_name: c.name,
    total_sent: c.sent,
    total_opened: c.opened,
    total_replied: c.replied,
    total_bounced: c.bounced,
    total_unsubscribed: 0,
    positive_replies: c.positiveReplies,
    opportunities: c.opportunities,
  }));

  const totals = analytics.reduce(
    (acc, campaign) => ({
      totalSent: acc.totalSent + campaign.total_sent,
      totalOpened: acc.totalOpened + campaign.total_opened,
      totalReplied: acc.totalReplied + campaign.total_replied,
      totalBounced: acc.totalBounced + campaign.total_bounced,
      totalUnsubscribed: acc.totalUnsubscribed + campaign.total_unsubscribed,
      positiveReplies: acc.positiveReplies + (campaign.positive_replies || 0),
      opportunities: acc.opportunities + (campaign.opportunities || 0),
    }),
    {
      totalSent: 0,
      totalOpened: 0,
      totalReplied: 0,
      totalBounced: 0,
      totalUnsubscribed: 0,
      positiveReplies: 0,
      opportunities: 0,
    }
  );

  const openRate = totals.totalSent > 0 ? (totals.totalOpened / totals.totalSent) * 100 : 0;
  const replyRate = totals.totalSent > 0 ? (totals.totalReplied / totals.totalSent) * 100 : 0;
  const bounceRate = totals.totalSent > 0 ? (totals.totalBounced / totals.totalSent) * 100 : 0;
  const conversionRate = totals.positiveReplies > 0 
    ? (totals.opportunities / totals.positiveReplies) * 100 
    : 0;

  return {
    campaigns: analytics,
    totals: {
      ...totals,
      openRate: Number(openRate.toFixed(2)),
      replyRate: Number(replyRate.toFixed(2)),
      bounceRate: Number(bounceRate.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
    },
    campaignCount: analytics.length,
    source: 'mock',
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;

    const analyticsRes = await instantlyService.getCampaignAnalyticsWithRange(
      startDate,
      endDate
    );

    // If API fails or returns no data, use mock data
    if (analyticsRes.error || !analyticsRes.data?.length) {
      console.log('Using mock analytics data. API error:', analyticsRes.error);
      return NextResponse.json(getMockAnalyticsResponse());
    }

    const analytics = analyticsRes.data || [];

    // Aggregate totals
    const totals = analytics.reduce(
      (acc, campaign) => ({
        totalSent: acc.totalSent + campaign.total_sent,
        totalOpened: acc.totalOpened + campaign.total_opened,
        totalReplied: acc.totalReplied + campaign.total_replied,
        totalBounced: acc.totalBounced + campaign.total_bounced,
        totalUnsubscribed: acc.totalUnsubscribed + campaign.total_unsubscribed,
        positiveReplies: acc.positiveReplies + (campaign.positive_replies || 0),
        opportunities: acc.opportunities + (campaign.opportunities || 0),
      }),
      {
        totalSent: 0,
        totalOpened: 0,
        totalReplied: 0,
        totalBounced: 0,
        totalUnsubscribed: 0,
        positiveReplies: 0,
        opportunities: 0,
      }
    );

    // Calculate rates
    const openRate = totals.totalSent > 0 ? (totals.totalOpened / totals.totalSent) * 100 : 0;
    const replyRate = totals.totalSent > 0 ? (totals.totalReplied / totals.totalSent) * 100 : 0;
    const bounceRate = totals.totalSent > 0 ? (totals.totalBounced / totals.totalSent) * 100 : 0;
    const conversionRate = totals.positiveReplies > 0 
      ? (totals.opportunities / totals.positiveReplies) * 100 
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
