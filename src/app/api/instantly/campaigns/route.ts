import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';
import { mockCampaigns } from '@/lib/mock-data';

export async function GET() {
  try {
    const [campaignsRes, analyticsRes] = await Promise.all([
      instantlyService.getCampaigns(),
      instantlyService.getCampaignAnalytics(),
    ]);

    // If API fails or returns no data, use mock data
    if (campaignsRes.error || !campaignsRes.data?.length) {
      console.log('Using mock campaign data. API error:', campaignsRes.error);
      return NextResponse.json({
        campaigns: mockCampaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          analytics: {
            campaign_id: c.id,
            campaign_name: c.name,
            total_sent: c.sent,
            total_opened: c.opened,
            total_replied: c.replied,
            total_bounced: c.bounced,
            total_unsubscribed: 0,
            positive_replies: c.positiveReplies,
            opportunities: c.opportunities,
          },
        })),
        total: mockCampaigns.length,
        source: 'mock',
      });
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
      source: 'instantly',
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    // Fallback to mock data
    return NextResponse.json({
      campaigns: mockCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        analytics: {
          campaign_id: c.id,
          campaign_name: c.name,
          total_sent: c.sent,
          total_opened: c.opened,
          total_replied: c.replied,
          total_bounced: c.bounced,
          total_unsubscribed: 0,
          positive_replies: c.positiveReplies,
          opportunities: c.opportunities,
        },
      })),
      total: mockCampaigns.length,
      source: 'mock',
    });
  }
}
