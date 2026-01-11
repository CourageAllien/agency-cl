import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rawApiKey = process.env.INSTANTLY_API_KEY || '';
  const apiKey = rawApiKey.trim();

  const results: Record<string, unknown> = {
    apiKeySet: !!apiKey,
    rawApiKeyLength: rawApiKey.length,
    trimmedApiKeyLength: apiKey.length,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET',
    hasWhitespace: rawApiKey !== apiKey,
    baseUrl: 'https://api.instantly.ai/api/v2',
    authMethod: 'Bearer Token (v2)',
  };

  // Test the API connection using v2
  try {
    const connectionTest = await instantlyService.testConnection();
    results.connectionTest = connectionTest;

    if (connectionTest.success) {
      // Get full data
      const fullData = await instantlyService.getFullAnalytics();
      results.campaignCount = fullData.campaigns.length;
      results.accountCount = fullData.accounts.length;
      results.analyticsCount = fullData.analytics.length;
      
      // Show sample data
      if (fullData.campaigns.length > 0) {
        results.sampleCampaign = {
          id: fullData.campaigns[0].id,
          name: fullData.campaigns[0].name,
          status: fullData.campaigns[0].status,
        };
      }
      
      if (fullData.accounts.length > 0) {
        results.sampleAccount = {
          email: fullData.accounts[0].email,
          status: fullData.accounts[0].status,
        };
      }
    }
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results, { status: 200 });
}
