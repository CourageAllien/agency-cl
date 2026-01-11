import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';
import { mockAccounts } from '@/lib/mock-data';

export async function GET() {
  try {
    const accountsRes = await instantlyService.getAccounts();

    // If API fails or returns no data, use mock data
    if (accountsRes.error || !accountsRes.data?.length) {
      console.log('Using mock account data. API error:', accountsRes.error);
      return NextResponse.json({
        accounts: mockAccounts,
        total: mockAccounts.length,
        connected: mockAccounts.filter((a) => a.status === 'connected').length,
        disconnected: mockAccounts.filter((a) => a.status !== 'connected').length,
        source: 'mock',
      });
    }

    // Transform accounts to match our expected format
    // The service now returns normalized data with statusLabel, providerLabel, etc.
    const accounts = (accountsRes.data || []).map((account) => ({
      id: account.id,
      email: account.email,
      clientName: extractClientFromEmail(account.email),
      status: account.statusLabel, // Already normalized to 'connected' | 'disconnected' | 'warmup'
      healthScore: account.warmup_score || 85,
      dailySendLimit: account.daily_limit || 50,
      sentToday: 0, // Not available from API
      provider: account.providerLabel || detectProvider(account.email),
      tags: account.tags || [],
      warmupStatus: account.warmup_enabled ? 'active' : 'inactive',
    }));

    return NextResponse.json({
      accounts,
      total: accounts.length,
      connected: accounts.filter((a) => a.status === 'connected').length,
      disconnected: accounts.filter((a) => a.status !== 'connected').length,
      source: 'instantly',
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    // Fallback to mock data
    return NextResponse.json({
      accounts: mockAccounts,
      total: mockAccounts.length,
      connected: mockAccounts.filter((a) => a.status === 'connected').length,
      disconnected: mockAccounts.filter((a) => a.status !== 'connected').length,
      source: 'mock',
    });
  }
}

function extractClientFromEmail(email: string): string {
  // Extract domain and use it as a proxy for client name
  const domain = email.split('@')[1];
  if (!domain) return 'Unknown';
  
  // Remove common TLDs and format
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function detectProvider(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'other';
  if (domain.includes('gmail') || domain.includes('google')) return 'Google';
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('microsoft')) return 'Microsoft';
  return 'SMTP';
}
