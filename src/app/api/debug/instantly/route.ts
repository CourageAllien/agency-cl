import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.INSTANTLY_API_KEY || '';
  const baseUrl = process.env.INSTANTLY_API_BASE_URL || 'https://api.instantly.ai/api/v1';
  
  const results: Record<string, unknown> = {
    apiKeySet: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}` : 'NOT SET',
    baseUrl,
  };

  // Test the campaigns endpoint
  try {
    const url = `${baseUrl}/campaign/list?api_key=${apiKey}`;
    results.requestUrl = url.replace(apiKey, '[API_KEY]');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    results.responseStatus = response.status;
    results.responseStatusText = response.statusText;
    results.responseHeaders = Object.fromEntries(response.headers.entries());
    
    const text = await response.text();
    try {
      results.responseBody = JSON.parse(text);
    } catch {
      results.responseBody = text.substring(0, 500);
    }
  } catch (error) {
    results.fetchError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results, { status: 200 });
}
