/**
 * Debug endpoint to check accounts API directly
 */
import { NextResponse } from 'next/server';
import { instantlyService } from '@/lib/services/instantly';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[Debug Accounts] Starting accounts fetch...');
    
    // Try different limits
    let accountsRes = await instantlyService.getAccounts({ limit: 100 });
    
    if (accountsRes.error) {
      console.log('[Debug Accounts] limit 100 failed, trying 50...');
      accountsRes = await instantlyService.getAccounts({ limit: 50 });
    }
    
    if (accountsRes.error) {
      console.log('[Debug Accounts] limit 50 failed, trying no limit...');
      accountsRes = await instantlyService.getAccounts({});
    }
    
    console.log('[Debug Accounts] Response:', {
      error: accountsRes.error,
      status: accountsRes.status,
      count: accountsRes.data?.length || 0,
    });
    
    return NextResponse.json({
      success: !accountsRes.error,
      error: accountsRes.error,
      status: accountsRes.status,
      count: accountsRes.data?.length || 0,
      sample: accountsRes.data?.[0] || null,
      allEmails: accountsRes.data?.map(a => a.email) || [],
    });
  } catch (error) {
    console.error('[Debug Accounts] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
