/**
 * Instantly API v2 Service
 * Handles all API calls to Instantly for campaign and account data
 * Uses Bearer token authentication for v2 API
 */

// Trim any whitespace/newlines from the API key
const INSTANTLY_API_KEY = (process.env.INSTANTLY_API_KEY || '').trim();
// Always use v2 API
const INSTANTLY_API_BASE_URL = 'https://api.instantly.ai/api/v2';

interface InstantlyApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

interface InstantlyCampaign {
  id: string;
  name: string;
  status: string | number;
  created_at?: string;
  updated_at?: string;
  timestamp_created?: string;
  timestamp_updated?: string;
}

interface InstantlyCampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_bounced: number;
  total_unsubscribed: number;
  positive_replies?: number;
  opportunities?: number;
}

interface InstantlyAccount {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  warmup_status?: string;
  warmup_enabled?: boolean;
  daily_limit?: number;
  sent_count?: number;
  provider?: string;
  tags?: string[];
}

interface InstantlyLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  status: string;
  campaign_id: string;
}

class InstantlyService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = INSTANTLY_API_KEY;
    this.baseUrl = INSTANTLY_API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<InstantlyApiResponse<T>> {
    if (!this.apiKey) {
      console.warn('INSTANTLY_API_KEY is not set');
      return { error: 'API key not configured', status: 401 };
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      };

      console.log(`[Instantly API v2] Calling: ${endpoint}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`[Instantly API v2] Error ${response.status}: ${responseText}`);
        return {
          error: `API Error: ${response.status} - ${responseText}`,
          status: response.status,
        };
      }

      // Parse JSON response
      let data: T;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('[Instantly API v2] Failed to parse JSON:', responseText);
        return { error: 'Invalid JSON response', status: 500 };
      }

      return { data, status: response.status };
    } catch (error) {
      console.error('[Instantly API v2] Fetch error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 500,
      };
    }
  }

  // Helper to extract array from various v2 response formats
  private extractArray<T>(data: unknown): T[] {
    if (Array.isArray(data)) {
      return data as T[];
    }
    if (data && typeof data === 'object') {
      // Check common v2 wrapper formats
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.items)) return obj.items as T[];
      if (Array.isArray(obj.data)) return obj.data as T[];
      if (Array.isArray(obj.campaigns)) return obj.campaigns as T[];
      if (Array.isArray(obj.accounts)) return obj.accounts as T[];
    }
    return [];
  }

  // ============ CAMPAIGNS ============

  /**
   * Get all campaigns (v2 API)
   */
  async getCampaigns(): Promise<InstantlyApiResponse<InstantlyCampaign[]>> {
    const response = await this.request<unknown>('/campaigns', { method: 'GET' });
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    const campaigns = this.extractArray<InstantlyCampaign>(response.data);
    console.log(`[Instantly API v2] Found ${campaigns.length} campaigns`);
    return { data: campaigns, status: response.status };
  }

  /**
   * Get campaign by ID (v2 API)
   */
  async getCampaign(campaignId: string): Promise<InstantlyApiResponse<InstantlyCampaign>> {
    return this.request<InstantlyCampaign>(`/campaigns/${campaignId}`, { method: 'GET' });
  }

  /**
   * Get campaign analytics (v2 API)
   */
  async getCampaignAnalytics(campaignId?: string): Promise<InstantlyApiResponse<InstantlyCampaignAnalytics[]>> {
    const endpoint = campaignId 
      ? `/campaigns/${campaignId}/analytics`
      : '/campaigns/analytics';
    const response = await this.request<unknown>(endpoint, { method: 'GET' });
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    const analytics = this.extractArray<InstantlyCampaignAnalytics>(response.data);
    return { data: analytics, status: response.status };
  }

  // ============ ACCOUNTS (INBOXES) ============

  /**
   * Get all email accounts (v2 API)
   */
  async getAccounts(): Promise<InstantlyApiResponse<InstantlyAccount[]>> {
    const response = await this.request<unknown>('/accounts', { method: 'GET' });
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    const accounts = this.extractArray<InstantlyAccount>(response.data);
    console.log(`[Instantly API v2] Found ${accounts.length} accounts`);
    return { data: accounts, status: response.status };
  }

  /**
   * Get account by email (v2 API)
   */
  async getAccount(email: string): Promise<InstantlyApiResponse<InstantlyAccount>> {
    return this.request<InstantlyAccount>(`/accounts/${encodeURIComponent(email)}`, { method: 'GET' });
  }

  // ============ LEADS ============

  /**
   * Get leads for a campaign (v2 API)
   */
  async getLeads(campaignId: string, limit = 100, skip = 0): Promise<InstantlyApiResponse<InstantlyLead[]>> {
    const response = await this.request<unknown>(
      `/campaigns/${campaignId}/leads?limit=${limit}&skip=${skip}`, 
      { method: 'GET' }
    );
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    const leads = this.extractArray<InstantlyLead>(response.data);
    return { data: leads, status: response.status };
  }

  // ============ UTILITY ============

  /**
   * Test API connection (v2)
   */
  async testConnection(): Promise<{ success: boolean; message: string; campaignCount?: number }> {
    if (!this.apiKey) {
      return { success: false, message: 'API key not configured' };
    }

    const result = await this.getCampaigns();
    if (result.error) {
      return { success: false, message: result.error };
    }

    return { 
      success: true, 
      message: 'Connected to Instantly API v2',
      campaignCount: result.data?.length || 0
    };
  }

  /**
   * Get full analytics data
   */
  async getFullAnalytics(): Promise<{
    campaigns: InstantlyCampaign[];
    analytics: InstantlyCampaignAnalytics[];
    accounts: InstantlyAccount[];
    error?: string;
  }> {
    const [campaignsRes, analyticsRes, accountsRes] = await Promise.all([
      this.getCampaigns(),
      this.getCampaignAnalytics(),
      this.getAccounts(),
    ]);

    return {
      campaigns: campaignsRes.data || [],
      analytics: analyticsRes.data || [],
      accounts: accountsRes.data || [],
      error: campaignsRes.error || analyticsRes.error || accountsRes.error,
    };
  }

  /**
   * Extract client name from campaign name
   */
  extractClientName(campaignName: string): string {
    const patterns = [
      /^(.+?)\s*[-–—|]\s*/,  // "ClientName - Campaign"
      /^\[(.+?)\]\s*/,       // "[ClientName] Campaign"
      /^(.+?):\s*/,          // "ClientName: Campaign"
    ];

    for (const pattern of patterns) {
      const match = campaignName.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Use first two words as fallback
    const words = campaignName.split(' ');
    return words.slice(0, 2).join(' ');
  }
}

export const instantlyService = new InstantlyService();
export type { InstantlyCampaign, InstantlyCampaignAnalytics, InstantlyAccount, InstantlyLead };
