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

// Raw campaign from Instantly API v2
interface InstantlyRawCampaign {
  id: string;
  name: string;
  status: number; // 1=draft, 2=active, 3=paused, 4=completed
  campaign_schedule?: {
    schedules?: Array<{
      name: string;
      timing: { from: string; to: string };
      days: Record<string, boolean>;
      timezone: string;
    }>;
    start_date?: string | null;
    end_date?: string | null;
  };
  timestamp_created?: string;
  timestamp_updated?: string;
  sequences?: unknown[];
  daily_limit?: number;
  email_tag_list?: string[];
}

// Raw analytics from Instantly API v2 - CORRECT FIELD NAMES
interface InstantlyRawAnalytics {
  campaign_id: string;
  campaign_name: string;
  campaign_status: number;
  leads_count: number;
  contacted_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  open_count: number;
  reply_count: number;
  reply_count_unique: number;
  reply_count_automatic: number;
  link_click_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
}

// Raw account from Instantly API v2 - CORRECT FIELD NAMES
interface InstantlyRawAccount {
  email: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
  status: number; // 1=active, 0=disconnected
  warmup_status: number; // 1=enabled, 0=disabled
  provider_code: number;
  daily_limit: number;
  setup_pending: boolean;
  timestamp_created?: string;
  timestamp_updated?: string;
  stat_warmup_score?: number;
  sending_gap?: number;
}

// Normalized types for the app (with correct mappings)
interface InstantlyCampaign {
  id: string;
  name: string;
  status: number;
  statusLabel: string;
  timestamp_created?: string;
  timestamp_updated?: string;
  dailyLimit?: number;
  tags?: string[];
  analytics?: InstantlyCampaignAnalytics;
}

interface InstantlyCampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  leads_count: number;
  contacted_count: number;
  total_sent: number;        // mapped from emails_sent_count
  total_opened: number;      // mapped from open_count
  total_replied: number;     // mapped from reply_count
  total_bounced: number;     // mapped from bounced_count
  total_unsubscribed: number;
  completed_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
  reply_count_unique: number;
}

interface InstantlyAccount {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: number;
  statusLabel: 'connected' | 'disconnected' | 'warmup';
  warmup_status: number;
  warmup_enabled: boolean;
  daily_limit: number;
  provider_code: number;
  providerLabel: string;
  warmup_score: number;
  tags: string[]; // Will be populated separately
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

// Status mappings
const CAMPAIGN_STATUS_MAP: Record<number, string> = {
  1: 'draft',
  2: 'active',
  3: 'paused',
  4: 'completed',
};

const PROVIDER_CODE_MAP: Record<number, string> = {
  1: 'Google',
  2: 'Microsoft',
  3: 'SMTP',
  4: 'Other',
};

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
   * Get all campaigns (v2 API) with normalized data
   */
  async getCampaigns(): Promise<InstantlyApiResponse<InstantlyCampaign[]>> {
    const response = await this.request<unknown>('/campaigns', { method: 'GET' });
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    
    const rawCampaigns = this.extractArray<InstantlyRawCampaign>(response.data);
    console.log(`[Instantly API v2] Found ${rawCampaigns.length} campaigns`);
    
    // Normalize campaigns
    const campaigns: InstantlyCampaign[] = rawCampaigns.map(raw => ({
      id: raw.id,
      name: raw.name,
      status: raw.status,
      statusLabel: CAMPAIGN_STATUS_MAP[raw.status] || 'unknown',
      timestamp_created: raw.timestamp_created,
      timestamp_updated: raw.timestamp_updated,
      dailyLimit: raw.daily_limit,
      tags: raw.email_tag_list || [],
    }));
    
    return { data: campaigns, status: response.status };
  }

  /**
   * Get campaign analytics (v2 API) with normalized data
   */
  async getCampaignAnalytics(): Promise<InstantlyApiResponse<InstantlyCampaignAnalytics[]>> {
    const response = await this.request<unknown>('/campaigns/analytics', { method: 'GET' });
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    
    const rawAnalytics = this.extractArray<InstantlyRawAnalytics>(response.data);
    console.log(`[Instantly API v2] Found ${rawAnalytics.length} analytics entries`);
    
    // Normalize analytics - MAP CORRECT FIELD NAMES
    const analytics: InstantlyCampaignAnalytics[] = rawAnalytics.map(raw => ({
      campaign_id: raw.campaign_id,
      campaign_name: raw.campaign_name,
      leads_count: raw.leads_count || 0,
      contacted_count: raw.contacted_count || 0,
      total_sent: raw.emails_sent_count || 0,           // MAPPED!
      total_opened: raw.open_count || 0,                // MAPPED!
      total_replied: raw.reply_count || 0,              // MAPPED!
      total_bounced: raw.bounced_count || 0,            // MAPPED!
      total_unsubscribed: raw.unsubscribed_count || 0,
      completed_count: raw.completed_count || 0,
      total_opportunities: raw.total_opportunities || 0,
      total_opportunity_value: raw.total_opportunity_value || 0,
      reply_count_unique: raw.reply_count_unique || 0,
    }));
    
    return { data: analytics, status: response.status };
  }

  // ============ ACCOUNTS (INBOXES) ============

  /**
   * Get all email accounts (v2 API) with normalized data
   */
  async getAccounts(): Promise<InstantlyApiResponse<InstantlyAccount[]>> {
    const response = await this.request<unknown>('/accounts', { method: 'GET' });
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    
    const rawAccounts = this.extractArray<InstantlyRawAccount>(response.data);
    console.log(`[Instantly API v2] Found ${rawAccounts.length} accounts`);
    
    // Normalize accounts - MAP CORRECT FIELD NAMES
    const accounts: InstantlyAccount[] = rawAccounts.map(raw => {
      // Determine status label
      let statusLabel: 'connected' | 'disconnected' | 'warmup' = 'connected';
      if (raw.status === 0 || raw.setup_pending) {
        statusLabel = 'disconnected';
      } else if (raw.warmup_status === 1) {
        statusLabel = 'warmup';
      }
      
      return {
        id: raw.email, // Use email as ID since no separate ID field
        email: raw.email,
        first_name: raw.first_name,
        last_name: raw.last_name,
        status: raw.status,
        statusLabel,
        warmup_status: raw.warmup_status,
        warmup_enabled: raw.warmup_status === 1,
        daily_limit: raw.daily_limit || 50,
        provider_code: raw.provider_code,
        providerLabel: PROVIDER_CODE_MAP[raw.provider_code] || 'Unknown',
        warmup_score: raw.stat_warmup_score || 0,
        tags: [], // Tags need separate API call
      };
    });
    
    return { data: accounts, status: response.status };
  }

  /**
   * Get account tags - Instantly may have a separate endpoint for this
   * This is a placeholder - we'll try to discover the correct endpoint
   */
  async getAccountTags(): Promise<InstantlyApiResponse<{ email: string; tags: string[] }[]>> {
    // Try different possible endpoints
    const possibleEndpoints = [
      '/accounts/tags',
      '/email-accounts/tags', 
      '/tags',
    ];

    for (const endpoint of possibleEndpoints) {
      const response = await this.request<unknown>(endpoint, { method: 'GET' });
      if (!response.error && response.data) {
        console.log(`[Instantly API v2] Found tags at ${endpoint}`);
        const tags = this.extractArray<{ email: string; tags: string[] }>(response.data);
        return { data: tags, status: response.status };
      }
    }

    console.log('[Instantly API v2] No tags endpoint found');
    return { data: [], status: 200 };
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
   * Get full analytics data with campaigns merged
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

    // Merge analytics into campaigns
    const campaigns = (campaignsRes.data || []).map(campaign => {
      const analytics = (analyticsRes.data || []).find(
        a => a.campaign_id === campaign.id
      );
      return { ...campaign, analytics };
    });

    return {
      campaigns,
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
