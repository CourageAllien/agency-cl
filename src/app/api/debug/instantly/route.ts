import { NextResponse } from 'next/server';

export async function GET() {
  const rawApiKey = process.env.INSTANTLY_API_KEY || '';
  const apiKey = rawApiKey.trim(); // Remove any whitespace/newlines
  const baseUrl = (process.env.INSTANTLY_API_BASE_URL || 'https://api.instantly.ai/api/v1').trim();
  
  const results: Record<string, unknown> = {
    apiKeySet: !!apiKey,
    rawApiKeyLength: rawApiKey.length,
    trimmedApiKeyLength: apiKey.length,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}` : 'NOT SET',
    hasNewlineOrWhitespace: rawApiKey !== apiKey,
    baseUrl,
  };

  // Test both v1 (query param) and v2 (Bearer token) authentication
  
  // Test v1 style (api_key as query param)
  try {
    const v1Url = `${baseUrl}/campaign/list?api_key=${apiKey}`;
    results.v1RequestUrl = v1Url.replace(apiKey, '[API_KEY]');
    
    const v1Response = await fetch(v1Url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    results.v1Status = v1Response.status;
    const v1Text = await v1Response.text();
    try {
      results.v1Body = JSON.parse(v1Text);
    } catch {
      results.v1Body = v1Text.substring(0, 200);
    }
  } catch (error) {
    results.v1Error = error instanceof Error ? error.message : String(error);
  }
  
  // Test v2 style (Bearer token)
  try {
    const v2Url = `https://api.instantly.ai/api/v2/campaigns`;
    results.v2RequestUrl = v2Url;
    
    const v2Response = await fetch(v2Url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    results.v2Status = v2Response.status;
    const v2Text = await v2Response.text();
    try {
      results.v2Body = JSON.parse(v2Text);
    } catch {
      results.v2Body = v2Text.substring(0, 200);
    }
  } catch (error) {
    results.v2Error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results, { status: 200 });
}
