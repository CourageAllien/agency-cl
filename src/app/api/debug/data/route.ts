/**
 * Debug endpoint to see full data structure from Instantly API v2
 */
import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all data
    const [campaignsRes, accountsRes, analyticsRes] = await Promise.all([
      instantlyService.getCampaigns(),
      instantlyService.getAccounts(),
      instantlyService.getCampaignAnalytics(),
    ]);

    const campaigns = campaignsRes.data || [];
    const accounts = accountsRes.data || [];
    const analytics = analyticsRes.data || [];

    // Get full first campaign
    const sampleCampaign = campaigns[0] || null;
    
    // Get full first account
    const sampleAccount = accounts[0] || null;
    
    // Get first analytics
    const sampleAnalytics = analytics[0] || null;

    // Show all fields for accounts
    const accountFields = sampleAccount ? Object.keys(sampleAccount) : [];
    const campaignFields = sampleCampaign ? Object.keys(sampleCampaign) : [];
    const analyticsFields = sampleAnalytics ? Object.keys(sampleAnalytics) : [];

    // Summary of what data we have
    const dataAvailable = {
      campaigns: {
        count: campaigns.length,
        fields: campaignFields,
        sample: sampleCampaign,
        hasAnalytics: campaigns.filter((c: any) => c.analytics).length,
        statuses: campaigns.reduce((acc: any, c: any) => {
          const status = c.status?.toString() || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}),
      },
      accounts: {
        count: accounts.length,
        fields: accountFields,
        sample: sampleAccount,
        hasTags: accounts.filter((a: any) => a.tags && a.tags.length > 0).length,
        statuses: accounts.reduce((acc: any, a: any) => {
          const status = a.status?.toString() || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}),
        allTags: Array.from(new Set(accounts.flatMap((a: any) => a.tags || []))),
        warmupEnabled: accounts.filter((a: any) => a.warmup_enabled).length,
      },
      analytics: {
        count: analytics.length,
        fields: analyticsFields,
        sample: sampleAnalytics,
        totalSent: analytics.reduce((sum: number, a: any) => sum + (a.total_sent || 0), 0),
        totalReplied: analytics.reduce((sum: number, a: any) => sum + (a.total_replied || 0), 0),
      },
    };

    // What's missing
    const missingData = {
      accountTags: dataAvailable.accounts.hasTags === 0 
        ? "⚠️ No accounts have tags - tags may not be returned by this API endpoint"
        : `✅ ${dataAvailable.accounts.hasTags} accounts have tags`,
      campaignAnalytics: dataAvailable.campaigns.hasAnalytics === 0 
        ? "⚠️ No campaigns have embedded analytics"
        : `✅ ${dataAvailable.campaigns.hasAnalytics} campaigns have analytics`,
      analyticsMetrics: dataAvailable.analytics.totalSent === 0
        ? "⚠️ No sent emails in analytics - campaigns may not have sent yet"
        : `✅ Total sent: ${dataAvailable.analytics.totalSent}`,
    };

    return NextResponse.json({
      summary: {
        campaignCount: campaigns.length,
        accountCount: accounts.length,
        analyticsCount: analytics.length,
      },
      dataAvailable,
      missingData,
      recommendations: [
        dataAvailable.accounts.hasTags === 0 
          ? "Tags: You may need to use a different endpoint like /accounts/tags or check if tags are on a different property"
          : null,
        dataAvailable.analytics.totalSent === 0
          ? "Analytics: Your campaigns haven't sent any emails yet"
          : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('Debug data error:', error);
    return NextResponse.json({
      error: 'Failed to fetch debug data',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
