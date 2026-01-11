import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';

export async function GET() {
  try {
    const [campaignsRes, analyticsRes] = await Promise.all([
      instantlyService.getCampaigns(),
      instantlyService.getCampaignAnalytics(),
    ]);

    if (campaignsRes.error || analyticsRes.error) {
      return NextResponse.json(
        { error: campaignsRes.error || analyticsRes.error },
        { status: 500 }
      );
    }

    // Combine campaigns with their analytics
    const campaignsWithAnalytics = (campaignsRes.data || []).map((campaign) => {
      const analytics = (analyticsRes.data || []).find(
        (a) => a.campaign_id === campaign.id
      );
      return {
        ...campaign,
        analytics: analytics || null,
      };
    });

    return NextResponse.json({
      campaigns: campaignsWithAnalytics,
      total: campaignsWithAnalytics.length,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
