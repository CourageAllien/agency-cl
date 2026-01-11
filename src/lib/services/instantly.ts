/**
 * Instantly API Service
 * Handles all API calls to Instantly for campaign and account data
 */

const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY || '';
const INSTANTLY_API_BASE_URL = process.env.INSTANTLY_API_BASE_URL || 'https://api.instantly.ai/api/v1';

interface InstantlyApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
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
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  warmup_status?: string;
  daily_limit?: number;
  sent_today?: number;
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
    try {
      // Instantly API uses api_key as query parameter
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}${endpoint}${separator}api_key=${this.apiKey}`;
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        return {
          error: `API Error: ${response.status} ${response.statusText}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 500,
      };
    }
  }

  // ============ CAMPAIGNS ============

  /**
   * Get all campaigns
   */
  async getCampaigns(): Promise<InstantlyApiResponse<InstantlyCampaign[]>> {
    return this.request<InstantlyCampaign[]>('/campaign/list', {
      method: 'GET',
    });
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<InstantlyApiResponse<InstantlyCampaign>> {
    return this.request<InstantlyCampaign>(`/campaign/${campaignId}`, {
      method: 'GET',
    });
  }

  /**
   * Get campaign analytics/summary
   */
  async getCampaignAnalytics(campaignId?: string): Promise<InstantlyApiResponse<InstantlyCampaignAnalytics[]>> {
    const endpoint = campaignId 
      ? `/analytics/campaign/summary?campaign_id=${campaignId}`
      : '/analytics/campaign/summary';
    return this.request<InstantlyCampaignAnalytics[]>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Get all campaign analytics with date range
   */
  async getCampaignAnalyticsWithRange(
    startDate?: string,
    endDate?: string
  ): Promise<InstantlyApiResponse<InstantlyCampaignAnalytics[]>> {
    let endpoint = '/analytics/campaign/summary';
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request<InstantlyCampaignAnalytics[]>(endpoint, {
      method: 'GET',
    });
  }

  // ============ ACCOUNTS (INBOXES) ============

  /**
   * Get all email accounts
   */
  async getAccounts(): Promise<InstantlyApiResponse<InstantlyAccount[]>> {
    return this.request<InstantlyAccount[]>('/account/list', {
      method: 'GET',
    });
  }

  /**
   * Get account by email
   */
  async getAccount(email: string): Promise<InstantlyApiResponse<InstantlyAccount>> {
    return this.request<InstantlyAccount>(`/account?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    });
  }

  /**
   * Get account warmup status
   */
  async getAccountWarmupStatus(email: string): Promise<InstantlyApiResponse<{ status: string }>> {
    return this.request<{ status: string }>(`/account/warmup/status?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    });
  }

  // ============ LEADS ============

  /**
   * Get leads for a campaign
   */
  async getLeads(campaignId: string, limit = 100, skip = 0): Promise<InstantlyApiResponse<InstantlyLead[]>> {
    return this.request<InstantlyLead[]>(`/lead/list?campaign_id=${campaignId}&limit=${limit}&skip=${skip}`, {
      method: 'GET',
    });
  }

  /**
   * Get lead count for a campaign
   */
  async getLeadCount(campaignId: string): Promise<InstantlyApiResponse<{ count: number }>> {
    return this.request<{ count: number }>(`/lead/count?campaign_id=${campaignId}`, {
      method: 'GET',
    });
  }

  // ============ ANALYTICS AGGREGATION ============

  /**
   * Aggregate all data for the command center
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
   * Group campaigns by client name (extracted from campaign name or tags)
   */
  groupCampaignsByClient(
    campaigns: InstantlyCampaign[],
    analytics: InstantlyCampaignAnalytics[]
  ): Map<string, { campaigns: InstantlyCampaign[]; analytics: InstantlyCampaignAnalytics[] }> {
    const clientMap = new Map<string, { campaigns: InstantlyCampaign[]; analytics: InstantlyCampaignAnalytics[] }>();

    campaigns.forEach((campaign) => {
      // Extract client name from campaign name (assumes format: "ClientName - Campaign Title" or similar)
      const clientName = this.extractClientName(campaign.name);
      
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, { campaigns: [], analytics: [] });
      }
      
      clientMap.get(clientName)!.campaigns.push(campaign);
      
      // Find matching analytics
      const campaignAnalytics = analytics.find((a) => a.campaign_id === campaign.id);
      if (campaignAnalytics) {
        clientMap.get(clientName)!.analytics.push(campaignAnalytics);
      }
    });

    return clientMap;
  }

  private extractClientName(campaignName: string): string {
    // Common patterns: "ClientName - Campaign", "ClientName | Campaign", "[ClientName] Campaign"
    const patterns = [
      /^(.+?)\s*[-|]\s*/,           // "ClientName - " or "ClientName | "
      /^\[(.+?)\]\s*/,              // "[ClientName] "
      /^(.+?)\s*:\s*/,              // "ClientName: "
    ];

    for (const pattern of patterns) {
      const match = campaignName.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // If no pattern matches, use the first two words or the whole name
    const words = campaignName.split(' ');
    return words.slice(0, 2).join(' ');
  }
}

export const instantlyService = new InstantlyService();
export type { InstantlyCampaign, InstantlyCampaignAnalytics, InstantlyAccount, InstantlyLead };
