import { NextResponse } from 'next/server';

export async function GET() {
  const instantlyKeySet = !!process.env.INSTANTLY_API_KEY;
  const anthropicKeySet = !!process.env.ANTHROPIC_API_KEY;
  const instantlyKeyLength = process.env.INSTANTLY_API_KEY?.length || 0;
  
  return NextResponse.json({
    status: 'ok',
    environment: {
      instantlyApiKey: instantlyKeySet ? `Set (${instantlyKeyLength} chars)` : 'NOT SET',
      anthropicApiKey: anthropicKeySet ? 'Set' : 'NOT SET',
      instantlyBaseUrl: process.env.INSTANTLY_API_BASE_URL || 'https://api.instantly.ai/api/v1 (default)',
    },
    timestamp: new Date().toISOString(),
  });
}
