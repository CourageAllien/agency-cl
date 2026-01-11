import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;

    const analyticsRes = await instantlyService.getCampaignAnalyticsWithRange(
      startDate,
      endDate
    );

    if (analyticsRes.error) {
      return NextResponse.json(
        { error: analyticsRes.error },
        { status: 500 }
      );
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
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
