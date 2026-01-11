import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';

export async function GET() {
  try {
    const accountsRes = await instantlyService.getAccounts();

    if (accountsRes.error) {
      return NextResponse.json(
        { error: accountsRes.error },
        { status: 500 }
      );
    }

    // Transform accounts to match our expected format
    const accounts = (accountsRes.data || []).map((account) => ({
      id: account.id,
      email: account.email,
      clientName: extractClientFromEmail(account.email),
      status: account.status === 'active' ? 'connected' : account.status,
      healthScore: calculateHealthScore(account),
      dailySendLimit: account.daily_limit || 50,
      sentToday: account.sent_today || 0,
      provider: account.provider || detectProvider(account.email),
      tags: account.tags || [],
      warmupStatus: account.warmup_status,
    }));

    return NextResponse.json({
      accounts,
      total: accounts.length,
      connected: accounts.filter((a) => a.status === 'connected').length,
      disconnected: accounts.filter((a) => a.status !== 'connected').length,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
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

function calculateHealthScore(account: { status: string; warmup_status?: string }): number {
  if (account.status !== 'active') return 0;
  if (account.warmup_status === 'warming') return 70;
  if (account.warmup_status === 'completed') return 95;
  return 85;
}

function detectProvider(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'other';
  if (domain.includes('gmail') || domain.includes('google')) return 'google';
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('microsoft')) return 'outlook';
  return 'other';
}
