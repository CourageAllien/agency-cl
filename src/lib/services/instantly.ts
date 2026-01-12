/**
 * Instantly API v2 Service
 * Complete implementation based on official API documentation
 * https://developer.instantly.ai/
 * 
 * KEY RULES:
 * - Focus on ACTIVE campaigns (status=1) for classification
 * - No limits - paginate to fetch ALL data
 * - Inboxes are NOT clients - never derive client name from email
 * - "Interd" campaigns = "Interdependence" client
 */

// Trim any whitespace/newlines from the API key
const INSTANTLY_API_KEY = (process.env.INSTANTLY_API_KEY || '').trim();
const INSTANTLY_API_BASE_URL = 'https://api.instantly.ai/api/v2';

// Campaign status constants
const CAMPAIGN_STATUS = {
  ACTIVE: 1,
  PAUSED: 0,
  DRAFT: 2,
  COMPLETED: 3,
} as const;

interface InstantlyApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  nextStartingAfter?: string;
}

// ============ TYPE DEFINITIONS ============

// Campaign Types
interface RawCampaign {
  id: string;
  name: string;
  status: number; // 1=Active, 0=Paused, etc.
  is_evergreen?: boolean;
  pl_value?: number;
  campaign_schedule?: CampaignSchedule;
  timestamp_created?: string;
  timestamp_updated?: string;
  daily_limit?: number;
}

interface CampaignSchedule {
  schedules?: Array<{
    name: string;
    timing: { from: string; to: string };
    days: Record<string, boolean>;
    timezone: string;
  }>;
  start_date?: string | null;
  end_date?: string | null;
}

// Campaign Analytics (from /campaigns/analytics)
interface RawCampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  sent: number;
  contacted: number;
  total_leads?: number;
  opened: number;
  unique_opened: number;
  replies: number;
  unique_replies: number;
  replies_automatic?: number;
  unique_replies_automatic?: number;
  bounced: number;
  unsubscribed: number;
  clicks?: number;
  unique_clicks?: number;
  total_opportunities: number;
  unique_opportunities?: number;
}

// Campaign Analytics Overview (from /campaigns/analytics/overview)
interface RawCampaignAnalyticsOverview extends RawCampaignAnalytics {
  total_interested: number;
  total_meeting_booked: number;
  total_meeting_completed: number;
  total_closed: number;
}

// Daily Analytics (from /campaigns/analytics/daily)
interface RawDailyAnalytics {
  date: string;
  sent: number;
  contacted: number;
  opened: number;
  unique_opened: number;
  replies: number;
  unique_replies: number;
  replies_automatic?: number;
  unique_replies_automatic?: number;
  clicks?: number;
  unique_clicks?: number;
  opportunities?: number;
  unique_opportunities?: number;
}

// Account Types
interface RawAccount {
  email: string;
  first_name?: string;
  last_name?: string;
  status: number; // 1=Active, -1=Paused
  warmup_status: number;
  stat_warmup_score?: number;
  daily_limit: number;
  timestamp_created?: string;
  timestamp_updated?: string;
  timestamp_last_used?: string;
  provider_code?: number;
  warmup?: {
    limit?: number;
    increment?: string;
    reply_rate?: number;
  };
  status_message?: StatusMessage;
}

interface StatusMessage {
  code?: string;
  command?: string;
  response?: string;
  e_message?: string;
  responseCode?: number;
}

// Warmup Analytics (from POST /accounts/warmup-analytics)
interface RawWarmupAnalytics {
  email_date_data: Record<string, Record<string, WarmupDayStats>>;
  aggregate_data: Record<string, WarmupAggregateStats>;
}

interface WarmupDayStats {
  sent: number;
  landed_inbox: number;
  landed_spam: number;
  received: number;
}

interface WarmupAggregateStats {
  sent: number;
  landed_inbox: number;
  landed_spam: number;
  received: number;
  health_score: number;
  health_score_label: string;
}

// Custom Tags
interface RawCustomTag {
  id: string;
  name?: string;
  label?: string;
  color?: string;
  timestamp_created?: string;
}

interface RawTagMapping {
  id: string;
  tag_id: string;
  resource_id: string;
  resource_type: 'account' | 'campaign' | number;
}

// Lead Types
interface RawLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  website?: string;
  status: number;
  interest_status?: string;
  campaign?: string;
  list_id?: string;
  timestamp_created?: string;
  timestamp_updated?: string;
}

// ============ NORMALIZED TYPES FOR APP ============

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: number;
  statusLabel: string;
  isActive: boolean;
  timestamp_created?: string;
  timestamp_updated?: string;
  dailyLimit?: number;
  analytics?: InstantlyCampaignAnalytics;
}

export interface InstantlyCampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  sent: number;
  contacted: number;
  total_leads: number;
  unique_opened: number;
  unique_replies: number;
  bounced: number;
  unsubscribed: number;
  total_opportunities: number;
  // Overview fields
  total_interested: number;
  total_meeting_booked: number;
  total_meeting_completed: number;
  total_closed: number;
  // Calculated
  reply_rate: number;
  conversion_rate: number;
  positive_reply_rate: number;
  pos_reply_to_meeting: number;
  // Legacy field names for compatibility
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_bounced: number;
  total_unsubscribed: number;
  leads_count: number;
  contacted_count: number;
  completed_count: number;
}

export interface InstantlyAccount {
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
  health_score: number;
  health_score_label: string;
  landed_inbox: number;
  landed_spam: number;
  has_error: boolean;
  error_message?: string;
  tags: string[];
  last_used?: string;
}

export interface InstantlyDailyAnalytics {
  date: string;
  sent: number;
  contacted: number;
  opened: number;
  unique_opened: number;
  replies: number;
  unique_replies: number;
  opportunities: number;
}

export interface InstantlyCustomTag {
  id: string;
  name: string;
  color?: string;
}

export interface InstantlyTagMapping {
  id: string;
  tag_id: string;
  resource_id: string;
  resource_type: 'account' | 'campaign';
}

export interface InstantlyLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  status: string;
  interest_status?: string;
  campaign_id?: string;
}

// ============ STATUS MAPPINGS ============

const CAMPAIGN_STATUS_MAP: Record<number, string> = {
  0: 'paused',
  1: 'active',
  2: 'draft',
  3: 'completed',
};

const PROVIDER_CODE_MAP: Record<number, string> = {
  1: 'Google',
  2: 'Microsoft',
  3: 'SMTP',
  4: 'Other',
};

// ============ CLIENT NAME MAPPINGS ============
// Map campaign name patterns to actual client names
const CLIENT_NAME_MAPPINGS: Record<string, string> = {
  'interd': 'Interdependence',
  'interdr': 'Interdependence',
  'interdependence': 'Interdependence',
  // Add more mappings as needed
};

// ============ SERVICE CLASS ============

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

      console.log(`[Instantly API v2] ${options.method || 'GET'}: ${endpoint}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`[Instantly API v2] Error ${response.status}: ${responseText.slice(0, 200)}`);
        return {
          error: `API Error: ${response.status}`,
          status: response.status,
        };
      }

      let data: T;
      let nextStartingAfter: string | undefined;
      
      try {
        const parsed = JSON.parse(responseText);
        data = parsed;
        
        // Check for pagination cursor
        if (parsed && typeof parsed === 'object') {
          nextStartingAfter = parsed.next_starting_after;
        }
      } catch {
        console.error('[Instantly API v2] Failed to parse JSON');
        return { error: 'Invalid JSON response', status: 500 };
      }

      return { data, status: response.status, nextStartingAfter };
    } catch (error) {
      console.error('[Instantly API v2] Fetch error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 500,
      };
    }
  }

  private extractArray<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.items)) return obj.items as T[];
      if (Array.isArray(obj.data)) return obj.data as T[];
    }
    return [];
  }

  private getNextCursor(data: unknown): string | undefined {
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      return obj.next_starting_after as string | undefined;
    }
    return undefined;
  }

  // ============ PAGINATION HELPER ============
  
  /**
   * Fetch all pages of a paginated endpoint
   */
  private async fetchAllPages<T>(
    fetchPage: (cursor?: string) => Promise<InstantlyApiResponse<unknown>>,
    maxPages: number = 5 // Limit to 5 pages (500 items max) for speed
  ): Promise<{ data: T[]; error?: string }> {
    const allItems: T[] = [];
    let cursor: string | undefined;
    let pageCount = 0;

    while (pageCount < maxPages) {
      const response = await fetchPage(cursor);
      
      if (response.error) {
        return { data: allItems, error: response.error };
      }

      const items = this.extractArray<T>(response.data);
      allItems.push(...items);
      
      cursor = this.getNextCursor(response.data);
      pageCount++;

      console.log(`[Instantly API v2] Page ${pageCount}: ${items.length} items (total: ${allItems.length})`);

      if (!cursor || items.length === 0) {
        break; // No more pages
      }
    }

    return { data: allItems };
  }

  // ============ CAMPAIGNS ============

  async getCampaigns(params?: { 
    status?: number; 
    limit?: number; 
    starting_after?: string;
    tag_ids?: string;
  }): Promise<InstantlyApiResponse<InstantlyCampaign[]>> {
    const query = new URLSearchParams();
    // Default to high limit
    query.set('limit', String(params?.limit || 100));
    if (params?.status !== undefined) query.set('status', String(params.status));
    if (params?.starting_after) query.set('starting_after', params.starting_after);
    if (params?.tag_ids) query.set('tag_ids', params.tag_ids);

    const endpoint = `/campaigns?${query}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };

    const rawCampaigns = this.extractArray<RawCampaign>(response.data);
    console.log(`[Instantly API v2] Found ${rawCampaigns.length} campaigns`);

    const campaigns: InstantlyCampaign[] = rawCampaigns.map(raw => ({
      id: raw.id,
      name: raw.name,
      status: raw.status,
      statusLabel: CAMPAIGN_STATUS_MAP[raw.status] || 'unknown',
      isActive: raw.status === CAMPAIGN_STATUS.ACTIVE,
      timestamp_created: raw.timestamp_created,
      timestamp_updated: raw.timestamp_updated,
      dailyLimit: raw.daily_limit,
    }));

    return { 
      data: campaigns, 
      status: response.status,
      nextStartingAfter: this.getNextCursor(response.data),
    };
  }

  /**
   * Fetch ALL campaigns (paginated)
   */
  async getAllCampaigns(): Promise<{ data: InstantlyCampaign[]; error?: string }> {
    const result = await this.fetchAllPages<InstantlyCampaign>(
      async (cursor) => {
        const query = new URLSearchParams();
        query.set('limit', '100');
        if (cursor) query.set('starting_after', cursor);
        
        const response = await this.request<unknown>(`/campaigns?${query}`);
        return response;
      }
    );

    // Convert raw to InstantlyCampaign
    const campaigns = result.data.map((raw: any) => ({
      id: raw.id,
      name: raw.name,
      status: raw.status,
      statusLabel: CAMPAIGN_STATUS_MAP[raw.status] || 'unknown',
      isActive: raw.status === CAMPAIGN_STATUS.ACTIVE,
      timestamp_created: raw.timestamp_created,
      timestamp_updated: raw.timestamp_updated,
      dailyLimit: raw.daily_limit,
    }));

    return { data: campaigns, error: result.error };
  }

  // ============ CAMPAIGN ANALYTICS ============

  async getCampaignAnalytics(params?: {
    id?: string;
    ids?: string[];
    start_date?: string;
    end_date?: string;
    exclude_total_leads_count?: boolean;
  }): Promise<InstantlyApiResponse<RawCampaignAnalytics[]>> {
    const query = new URLSearchParams();
    if (params?.id) query.set('id', params.id);
    if (params?.ids) query.set('ids', params.ids.join(','));
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.exclude_total_leads_count !== undefined) {
      query.set('exclude_total_leads_count', String(params.exclude_total_leads_count));
    }

    const endpoint = `/campaigns/analytics${query.toString() ? `?${query}` : ''}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };
    
    const analytics = this.extractArray<RawCampaignAnalytics>(response.data);
    console.log(`[Instantly API v2] Found ${analytics.length} analytics entries`);
    
    return { data: analytics, status: response.status };
  }

  async getCampaignAnalyticsOverview(params?: {
    id?: string;
    ids?: string[];
    start_date?: string;
    end_date?: string;
    expand_crm_events?: boolean;
  }): Promise<InstantlyApiResponse<RawCampaignAnalyticsOverview[]>> {
    const query = new URLSearchParams();
    if (params?.id) query.set('id', params.id);
    if (params?.ids) query.set('ids', params.ids.join(','));
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.expand_crm_events) query.set('expand_crm_events', 'true');

    const endpoint = `/campaigns/analytics/overview${query.toString() ? `?${query}` : ''}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };
    
    const analytics = this.extractArray<RawCampaignAnalyticsOverview>(response.data);
    console.log(`[Instantly API v2] Found ${analytics.length} analytics overview entries`);
    
    return { data: analytics, status: response.status };
  }

  async getCampaignAnalyticsDaily(params?: {
    campaign_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<InstantlyApiResponse<InstantlyDailyAnalytics[]>> {
    const query = new URLSearchParams();
    if (params?.campaign_id) query.set('campaign_id', params.campaign_id);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);

    const endpoint = `/campaigns/analytics/daily${query.toString() ? `?${query}` : ''}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };
    
    const raw = this.extractArray<RawDailyAnalytics>(response.data);
    
    const daily: InstantlyDailyAnalytics[] = raw.map(d => ({
      date: d.date,
      sent: d.sent || 0,
      contacted: d.contacted || 0,
      opened: d.opened || 0,
      unique_opened: d.unique_opened || 0,
      replies: d.replies || 0,
      unique_replies: d.unique_replies || 0,
      opportunities: d.opportunities || d.unique_opportunities || 0,
    }));
    
    return { data: daily, status: response.status };
  }

  // ============ ACCOUNTS ============

  async getAccounts(params?: { 
    limit?: number; 
    search?: string; 
    tag_ids?: string;
    starting_after?: string;
  }): Promise<InstantlyApiResponse<InstantlyAccount[]>> {
    const query = new URLSearchParams();
    // Use max limit of 100 (200 causes 400 error)
    query.set('limit', String(params?.limit || 100));
    if (params?.search) query.set('search', params.search);
    if (params?.tag_ids) query.set('tag_ids', params.tag_ids);
    if (params?.starting_after) query.set('starting_after', params.starting_after);

    const endpoint = `/accounts?${query}`;
    console.log(`[Instantly API v2] Fetching accounts: ${endpoint}`);
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) {
      console.error(`[Instantly API v2] Accounts error: ${response.error} (status: ${response.status})`);
      return { error: response.error, status: response.status };
    }

    const rawAccounts = this.extractArray<RawAccount>(response.data);
    console.log(`[Instantly API v2] Found ${rawAccounts.length} accounts`);

    const accounts: InstantlyAccount[] = rawAccounts.map(raw => {
      let statusLabel: 'connected' | 'disconnected' | 'warmup' = 'connected';
      if (raw.status === -1 || raw.status === 0 || raw.status_message) {
        statusLabel = 'disconnected';
      } else if (raw.warmup_status === 1) {
        statusLabel = 'warmup';
      }

      return {
        id: raw.email,
        email: raw.email,
        first_name: raw.first_name,
        last_name: raw.last_name,
        status: raw.status,
        statusLabel,
        warmup_status: raw.warmup_status,
        warmup_enabled: raw.warmup_status === 1,
        daily_limit: raw.daily_limit || 50,
        provider_code: raw.provider_code || 0,
        providerLabel: PROVIDER_CODE_MAP[raw.provider_code || 0] || 'Unknown',
        warmup_score: raw.stat_warmup_score || 0,
        health_score: raw.stat_warmup_score || 0,
        health_score_label: `${raw.stat_warmup_score || 0}%`,
        landed_inbox: 0,
        landed_spam: 0,
        has_error: !!raw.status_message,
        error_message: raw.status_message?.e_message,
        tags: [],
        last_used: raw.timestamp_last_used,
      };
    });

    return { 
      data: accounts, 
      status: response.status,
      nextStartingAfter: this.getNextCursor(response.data),
    };
  }

  /**
   * Fetch ALL accounts (paginated)
   */
  async getAllAccounts(): Promise<{ data: InstantlyAccount[]; error?: string }> {
    const allAccounts: InstantlyAccount[] = [];
    let cursor: string | undefined;
    let pageCount = 0;
    const maxPages = 50;

    while (pageCount < maxPages) {
      const response = await this.getAccounts({ 
        limit: 100,
        starting_after: cursor,
      });
      
      if (response.error) {
        return { data: allAccounts, error: response.error };
      }

      const accounts = response.data || [];
      allAccounts.push(...accounts);
      
      cursor = response.nextStartingAfter;
      pageCount++;

      console.log(`[Instantly API v2] Accounts page ${pageCount}: ${accounts.length} (total: ${allAccounts.length})`);

      if (!cursor || accounts.length === 0) {
        break;
      }
    }

    return { data: allAccounts };
  }

  async getWarmupAnalytics(emails: string[]): Promise<InstantlyApiResponse<RawWarmupAnalytics>> {
    const response = await this.request<RawWarmupAnalytics>('/accounts/warmup-analytics', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });
    
    return response;
  }

  // ============ CUSTOM TAGS ============

  async getCustomTags(params?: { starting_after?: string }): Promise<InstantlyApiResponse<InstantlyCustomTag[]>> {
    const query = new URLSearchParams();
    query.set('limit', '100');
    if (params?.starting_after) query.set('starting_after', params.starting_after);

    const endpoint = `/custom-tags?${query}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };
    
    const raw = this.extractArray<RawCustomTag>(response.data);
    console.log(`[Instantly API v2] Found ${raw.length} custom tags`);
    
    if (raw.length > 0) {
      console.log(`[Instantly API v2] Sample tag:`, JSON.stringify(raw[0]));
    }
    
    const tags: InstantlyCustomTag[] = raw.map(t => ({
      id: t.id,
      name: t.name || t.label || t.id,
      color: t.color,
    }));
    
    return { 
      data: tags, 
      status: response.status,
      nextStartingAfter: this.getNextCursor(response.data),
    };
  }

  /**
   * Fetch ALL tags (paginated)
   */
  async getAllCustomTags(): Promise<{ data: InstantlyCustomTag[]; error?: string }> {
    const allTags: InstantlyCustomTag[] = [];
    let cursor: string | undefined;
    let pageCount = 0;
    const maxPages = 20;

    while (pageCount < maxPages) {
      const response = await this.getCustomTags({ starting_after: cursor });
      
      if (response.error) {
        return { data: allTags, error: response.error };
      }

      const tags = response.data || [];
      allTags.push(...tags);
      
      cursor = response.nextStartingAfter;
      pageCount++;

      console.log(`[Instantly API v2] Tags page ${pageCount}: ${tags.length} (total: ${allTags.length})`);

      if (!cursor || tags.length === 0) {
        break;
      }
    }

    return { data: allTags };
  }

  async getCustomTagMappings(params?: { 
    tag_id?: string; 
    resource_type?: 'account' | 'campaign';
    starting_after?: string;
  }): Promise<InstantlyApiResponse<InstantlyTagMapping[]>> {
    const query = new URLSearchParams();
    query.set('limit', '100');
    if (params?.tag_id) query.set('tag_id', params.tag_id);
    if (params?.resource_type) query.set('resource_type', params.resource_type);
    if (params?.starting_after) query.set('starting_after', params.starting_after);

    const endpoint = `/custom-tag-mappings?${query}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };
    
    const raw = this.extractArray<RawTagMapping>(response.data);
    console.log(`[Instantly API v2] Found ${raw.length} tag mappings`);
    
    if (raw.length > 0) {
      console.log(`[Instantly API v2] Sample tag mapping:`, JSON.stringify(raw[0]));
    }
    
    const mappings: InstantlyTagMapping[] = raw.map(m => {
      let resourceType: 'account' | 'campaign';
      if (typeof m.resource_type === 'number') {
        resourceType = m.resource_type === 1 ? 'account' : 'campaign';
      } else {
        resourceType = m.resource_type;
      }
      
      return {
        id: m.id,
        tag_id: m.tag_id,
        resource_id: m.resource_id,
        resource_type: resourceType,
      };
    });
    
    return { 
      data: mappings, 
      status: response.status,
      nextStartingAfter: this.getNextCursor(response.data),
    };
  }

  /**
   * Fetch ALL tag mappings (paginated)
   */
  async getAllTagMappings(): Promise<{ data: InstantlyTagMapping[]; error?: string }> {
    const allMappings: InstantlyTagMapping[] = [];
    let cursor: string | undefined;
    let pageCount = 0;
    const maxPages = 50;

    while (pageCount < maxPages) {
      const response = await this.getCustomTagMappings({ starting_after: cursor });
      
      if (response.error) {
        return { data: allMappings, error: response.error };
      }

      const mappings = response.data || [];
      allMappings.push(...mappings);
      
      cursor = response.nextStartingAfter;
      pageCount++;

      console.log(`[Instantly API v2] Tag mappings page ${pageCount}: ${mappings.length} (total: ${allMappings.length})`);

      if (!cursor || mappings.length === 0) {
        break;
      }
    }

    return { data: allMappings };
  }

  // ============ LEADS ============

  async getLeads(params: {
    campaign_id?: string;
    list_id?: string;
    status?: number;
    interest_status?: string;
    limit?: number;
    starting_after?: string;
  }): Promise<InstantlyApiResponse<InstantlyLead[]>> {
    const response = await this.request<unknown>('/leads/list', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    if (response.error) return { error: response.error, status: response.status };
    
    const raw = this.extractArray<RawLead>(response.data);
    
    const leads: InstantlyLead[] = raw.map(l => ({
      id: l.id,
      email: l.email,
      first_name: l.first_name,
      last_name: l.last_name,
      company_name: l.company_name,
      status: String(l.status),
      interest_status: l.interest_status,
      campaign_id: l.campaign,
    }));
    
    return { data: leads, status: response.status };
  }

  // ============ UTILITY METHODS ============

  async testConnection(): Promise<{ success: boolean; message: string; campaignCount?: number }> {
    if (!this.apiKey) {
      return { success: false, message: 'API key not configured' };
    }

    const result = await this.getCampaigns({ limit: 10 });
    if (result.error) {
      return { success: false, message: result.error };
    }

    return {
      success: true,
      message: 'Connected to Instantly API v2',
      campaignCount: result.data?.length || 0,
    };
  }

  /**
   * Extract client name from campaign name
   * IMPORTANT: Never use inbox email as client name
   */
  extractClientName(campaignName: string): string {
    let name = campaignName.toLowerCase().trim();
    
    // Check for known client name mappings FIRST
    for (const [pattern, clientName] of Object.entries(CLIENT_NAME_MAPPINGS)) {
      if (name.includes(pattern)) {
        return clientName;
      }
    }

    // Now clean up the campaign name
    name = campaignName;
    
    // Remove common prefixes
    name = name.replace(/^\(barracuda\)\s*/i, '');
    name = name.replace(/^\(baracuda\)\s*/i, '');
    
    // Remove common suffixes
    name = name.replace(/\s*-\s*RR.*$/i, '');
    name = name.replace(/\s*RR\s+.*$/i, '');
    name = name.replace(/\s*V\d+.*$/i, '');
    name = name.replace(/\s*Trial.*$/i, '');
    name = name.replace(/\s*Rerun.*$/i, '');
    name = name.replace(/\s*\(copy\).*$/i, '');
    name = name.replace(/\s*Recycled.*$/i, '');
    name = name.replace(/\s*Final\s+Consumer.*$/i, '');
    name = name.replace(/\s+Run$/i, '');
    name = name.replace(/\s+rewarm$/i, '');
    
    // Try to extract from patterns
    const patterns = [
      /^(.+?)\s*[-–—|]\s*/,
      /^\[(.+?)\]\s*/,
      /^(.+?):\s*/,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        name = match[1].trim();
        break;
      }
    }

    // If name looks like an email, this is wrong - use first word of campaign
    if (name.includes('@')) {
      const words = campaignName.trim().split(/\s+/);
      name = words[0];
    }

    // Use first 2-3 meaningful words as the client name
    const words = name.trim().split(/\s+/).filter(w => w.length > 1);
    if (words.length >= 2) {
      return words.slice(0, 2).join(' ');
    }
    
    return name.trim() || campaignName;
  }

  /**
   * Get complete analytics data with ALL data fetched (no limits)
   * Focuses on ACTIVE campaigns for classification
   */
  async getFullAnalytics(): Promise<{
    campaigns: InstantlyCampaign[];
    activeCampaigns: InstantlyCampaign[];
    analytics: InstantlyCampaignAnalytics[];
    accounts: InstantlyAccount[];
    tags: InstantlyCustomTag[];
    tagMappings: InstantlyTagMapping[];
    error?: string;
  }> {
    console.log('[Instantly API v2] Fetching ALL data (no limits)...');

    // Fetch all data in parallel using pagination
    const [
      campaignsResult,
      accountsResult,
      tagsResult,
      tagMappingsResult,
    ] = await Promise.all([
      this.getAllCampaigns(),
      this.getAllAccounts(),
      this.getAllCustomTags(),
      this.getAllTagMappings(),
    ]);

    const allCampaigns = campaignsResult.data || [];
    const accounts = accountsResult.data || [];
    const tags = tagsResult.data || [];
    const tagMappings = tagMappingsResult.data || [];

    console.log(`[Instantly API v2] Total campaigns: ${allCampaigns.length}`);
    console.log(`[Instantly API v2] Total accounts: ${accounts.length}`);
    console.log(`[Instantly API v2] Total tags: ${tags.length}`);
    console.log(`[Instantly API v2] Total tag mappings: ${tagMappings.length}`);

    // Filter to ACTIVE campaigns only for classification
    const activeCampaigns = allCampaigns.filter(c => c.isActive);
    console.log(`[Instantly API v2] ACTIVE campaigns: ${activeCampaigns.length}`);

    // Now fetch analytics for all campaigns
    const [analyticsRes, analyticsOverviewRes] = await Promise.all([
      this.getCampaignAnalytics({ exclude_total_leads_count: false }),
      this.getCampaignAnalyticsOverview({ expand_crm_events: false }),
    ]);

    const rawAnalytics = analyticsRes.data || [];
    const rawOverview = analyticsOverviewRes.data || [];

    // Create lookup maps
    const overviewMap = new Map(rawOverview.map(o => [o.campaign_id, o]));
    const tagMap = new Map(tags.map(t => [t.id, t.name]));

    // Merge analytics with overview data
    // Note: API returns different field names than expected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analytics: InstantlyCampaignAnalytics[] = rawAnalytics.map((raw: any) => {
      const overview = overviewMap.get(raw.campaign_id as string);
      
      // Map actual API field names to our expected names
      const sent = (raw.emails_sent_count || raw.sent || 0) as number;
      const uniqueReplies = (raw.reply_count_unique || raw.unique_replies || 0) as number;
      const uniqueOpened = (raw.open_count_unique || raw.unique_opened || 0) as number;
      const bounced = (raw.bounced_count || raw.bounced || 0) as number;
      const totalLeads = (raw.leads_count || raw.total_leads || 0) as number;
      const contacted = (raw.contacted_count || raw.contacted || 0) as number;
      const unsubscribed = (raw.unsubscribed_count || raw.unsubscribed || 0) as number;
      const totalInterested = (overview?.total_interested || 0) as number;
      const totalMeetingBooked = (overview?.total_meeting_booked || 0) as number;
      const totalOpportunities = (raw.total_opportunities || 0) as number;

      const replyRate = sent > 0 ? (uniqueReplies / sent) * 100 : 0;
      const conversionRate = uniqueReplies > 0 ? (totalOpportunities / uniqueReplies) * 100 : 0;
      const positiveReplyRate = uniqueReplies > 0 ? (totalInterested / uniqueReplies) * 100 : 0;
      const posReplyToMeeting = totalInterested > 0 ? (totalMeetingBooked / totalInterested) * 100 : 0;

      return {
        campaign_id: raw.campaign_id as string,
        campaign_name: raw.campaign_name as string,
        sent,
        contacted,
        total_leads: totalLeads,
        unique_opened: uniqueOpened,
        unique_replies: uniqueReplies,
        bounced,
        unsubscribed,
        total_opportunities: totalOpportunities,
        total_interested: totalInterested,
        total_meeting_booked: totalMeetingBooked,
        total_meeting_completed: (overview?.total_meeting_completed || 0) as number,
        total_closed: (overview?.total_closed || 0) as number,
        reply_rate: Number(replyRate.toFixed(2)),
        conversion_rate: Number(conversionRate.toFixed(2)),
        positive_reply_rate: Number(positiveReplyRate.toFixed(2)),
        pos_reply_to_meeting: Number(posReplyToMeeting.toFixed(2)),
        // Legacy fields for compatibility
        total_sent: sent,
        total_opened: uniqueOpened,
        total_replied: uniqueReplies,
        total_bounced: bounced,
        total_unsubscribed: unsubscribed,
        leads_count: totalLeads,
        contacted_count: contacted,
        completed_count: (raw.completed_count || 0) as number,
      };
    });

    // Merge campaigns with analytics
    const analyticsMap = new Map(analytics.map(a => [a.campaign_id, a]));
    const campaignsWithAnalytics = allCampaigns.map(campaign => ({
      ...campaign,
      analytics: analyticsMap.get(campaign.id),
    }));

    // Active campaigns with analytics
    const activeCampaignsWithAnalytics = activeCampaigns.map(campaign => ({
      ...campaign,
      analytics: analyticsMap.get(campaign.id),
    }));

    // Enrich accounts with tags
    const accountTagMappings = tagMappings.filter(m => m.resource_type === 'account');
    const enrichedAccounts = accounts.map(account => {
      const accountMappings = accountTagMappings.filter(m => m.resource_id === account.email);
      const accountTags = accountMappings.map(m => tagMap.get(m.tag_id)).filter(Boolean) as string[];
      
      return {
        ...account,
        tags: accountTags,
      };
    });

    // Note: Warmup analytics for 5000+ accounts would cause timeout
    // Health scores are already available from stat_warmup_score in account data
    // Only fetch warmup analytics if explicitly needed and accounts are limited
    console.log(`[Instantly API v2] Skipping warmup analytics for ${accounts.length} accounts (using warmup_score instead)`);

    const errors = [
      campaignsResult.error,
      accountsResult.error,
      tagsResult.error,
      tagMappingsResult.error,
      analyticsRes.error,
    ].filter(Boolean).join('; ');

    return {
      campaigns: campaignsWithAnalytics,
      activeCampaigns: activeCampaignsWithAnalytics,
      analytics,
      accounts: enrichedAccounts,
      tags,
      tagMappings,
      error: errors || undefined,
    };
  }
}

export const instantlyService = new InstantlyService();
export { CAMPAIGN_STATUS };
