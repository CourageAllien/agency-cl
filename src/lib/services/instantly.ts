/**
 * Instantly API v2 Service
 * Complete implementation based on official API documentation
 * https://developer.instantly.ai/
 */

// Trim any whitespace/newlines from the API key
const INSTANTLY_API_KEY = (process.env.INSTANTLY_API_KEY || '').trim();
const INSTANTLY_API_BASE_URL = 'https://api.instantly.ai/api/v2';

interface InstantlyApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
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
  name: string;
  color?: string;
  timestamp_created?: string;
}

interface RawTagMapping {
  id: string;
  tag_id: string;
  resource_id: string;
  resource_type: 'account' | 'campaign';
}

// Lead Types
interface RawLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  website?: string;
  status: number; // 0=not contacted, 1=contacted
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
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('[Instantly API v2] Failed to parse JSON');
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

  private extractArray<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.items)) return obj.items as T[];
      if (Array.isArray(obj.data)) return obj.data as T[];
    }
    return [];
  }

  // ============ CAMPAIGNS ============

  async getCampaigns(params?: { status?: number; limit?: number; tag_ids?: string }): Promise<InstantlyApiResponse<InstantlyCampaign[]>> {
    const query = new URLSearchParams();
    if (params?.status !== undefined) query.set('status', String(params.status));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.tag_ids) query.set('tag_ids', params.tag_ids);

    const endpoint = `/campaigns${query.toString() ? `?${query}` : ''}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };

    const rawCampaigns = this.extractArray<RawCampaign>(response.data);
    console.log(`[Instantly API v2] Found ${rawCampaigns.length} campaigns`);

    const campaigns: InstantlyCampaign[] = rawCampaigns.map(raw => ({
      id: raw.id,
      name: raw.name,
      status: raw.status,
      statusLabel: CAMPAIGN_STATUS_MAP[raw.status] || 'unknown',
      timestamp_created: raw.timestamp_created,
      timestamp_updated: raw.timestamp_updated,
      dailyLimit: raw.daily_limit,
    }));

    return { data: campaigns, status: response.status };
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

  async getAccounts(params?: { limit?: number; search?: string; tag_ids?: string }): Promise<InstantlyApiResponse<InstantlyAccount[]>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.tag_ids) query.set('tag_ids', params.tag_ids);

    const endpoint = `/accounts${query.toString() ? `?${query}` : ''}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };

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
        health_score: raw.stat_warmup_score || 0, // Will be updated by warmup analytics
        health_score_label: `${raw.stat_warmup_score || 0}%`,
        landed_inbox: 0,
        landed_spam: 0,
        has_error: !!raw.status_message,
        error_message: raw.status_message?.e_message,
        tags: [],
        last_used: raw.timestamp_last_used,
      };
    });

    return { data: accounts, status: response.status };
  }

  async getWarmupAnalytics(emails: string[]): Promise<InstantlyApiResponse<RawWarmupAnalytics>> {
    const response = await this.request<RawWarmupAnalytics>('/accounts/warmup-analytics', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });
    
    return response;
  }

  // ============ CUSTOM TAGS ============

  async getCustomTags(): Promise<InstantlyApiResponse<InstantlyCustomTag[]>> {
    const response = await this.request<unknown>('/custom-tags');
    
    if (response.error) return { error: response.error, status: response.status };
    
    const raw = this.extractArray<RawCustomTag>(response.data);
    console.log(`[Instantly API v2] Found ${raw.length} custom tags`);
    
    const tags: InstantlyCustomTag[] = raw.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
    }));
    
    return { data: tags, status: response.status };
  }

  async getCustomTagMappings(params?: { tag_id?: string; resource_type?: 'account' | 'campaign' }): Promise<InstantlyApiResponse<InstantlyTagMapping[]>> {
    const query = new URLSearchParams();
    if (params?.tag_id) query.set('tag_id', params.tag_id);
    if (params?.resource_type) query.set('resource_type', params.resource_type);

    const endpoint = `/custom-tag-mappings${query.toString() ? `?${query}` : ''}`;
    const response = await this.request<unknown>(endpoint);
    
    if (response.error) return { error: response.error, status: response.status };
    
    const raw = this.extractArray<RawTagMapping>(response.data);
    console.log(`[Instantly API v2] Found ${raw.length} tag mappings`);
    
    const mappings: InstantlyTagMapping[] = raw.map(m => ({
      id: m.id,
      tag_id: m.tag_id,
      resource_id: m.resource_id,
      resource_type: m.resource_type,
    }));
    
    return { data: mappings, status: response.status };
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
   * Get complete analytics data with all endpoints merged
   */
  async getFullAnalytics(): Promise<{
    campaigns: InstantlyCampaign[];
    analytics: InstantlyCampaignAnalytics[];
    accounts: InstantlyAccount[];
    tags: InstantlyCustomTag[];
    tagMappings: InstantlyTagMapping[];
    error?: string;
  }> {
    // Fetch all data in parallel
    const [
      campaignsRes,
      analyticsRes,
      analyticsOverviewRes,
      accountsRes,
      tagsRes,
      tagMappingsRes,
    ] = await Promise.all([
      this.getCampaigns({ limit: 100 }),
      this.getCampaignAnalytics({ exclude_total_leads_count: false }),
      this.getCampaignAnalyticsOverview({ expand_crm_events: false }),
      this.getAccounts({ limit: 200 }),
      this.getCustomTags(),
      this.getCustomTagMappings(),
    ]);

    const campaigns = campaignsRes.data || [];
    const rawAnalytics = analyticsRes.data || [];
    const rawOverview = analyticsOverviewRes.data || [];
    const accounts = accountsRes.data || [];
    const tags = tagsRes.data || [];
    const tagMappings = tagMappingsRes.data || [];

    // Debug logging
    console.log(`[Instantly getFullAnalytics] Campaigns: ${campaigns.length}, Analytics: ${rawAnalytics.length}, Accounts: ${accounts.length}, Tags: ${tags.length}`);
    if (accountsRes.error) {
      console.error('[Instantly getFullAnalytics] Accounts error:', accountsRes.error);
    }

    // Create lookup maps
    const overviewMap = new Map(rawOverview.map(o => [o.campaign_id, o]));
    const tagMap = new Map(tags.map(t => [t.id, t.name]));

    // Merge analytics with overview data
    const analytics: InstantlyCampaignAnalytics[] = rawAnalytics.map(raw => {
      const overview = overviewMap.get(raw.campaign_id);
      
      const sent = raw.sent || 0;
      const uniqueReplies = raw.unique_replies || 0;
      const totalInterested = overview?.total_interested || 0;
      const totalMeetingBooked = overview?.total_meeting_booked || 0;
      const totalOpportunities = raw.total_opportunities || 0;

      // Calculate rates
      const replyRate = sent > 0 ? (uniqueReplies / sent) * 100 : 0;
      const conversionRate = uniqueReplies > 0 ? (totalOpportunities / uniqueReplies) * 100 : 0;
      const positiveReplyRate = uniqueReplies > 0 ? (totalInterested / uniqueReplies) * 100 : 0;
      const posReplyToMeeting = totalInterested > 0 ? (totalMeetingBooked / totalInterested) * 100 : 0;

      return {
        campaign_id: raw.campaign_id,
        campaign_name: raw.campaign_name,
        sent,
        contacted: raw.contacted || 0,
        total_leads: raw.total_leads || 0,
        unique_opened: raw.unique_opened || 0,
        unique_replies: uniqueReplies,
        bounced: raw.bounced || 0,
        unsubscribed: raw.unsubscribed || 0,
        total_opportunities: totalOpportunities,
        total_interested: totalInterested,
        total_meeting_booked: totalMeetingBooked,
        total_meeting_completed: overview?.total_meeting_completed || 0,
        total_closed: overview?.total_closed || 0,
        reply_rate: Number(replyRate.toFixed(2)),
        conversion_rate: Number(conversionRate.toFixed(2)),
        positive_reply_rate: Number(positiveReplyRate.toFixed(2)),
        pos_reply_to_meeting: Number(posReplyToMeeting.toFixed(2)),
        // Legacy field names for compatibility
        total_sent: sent,
        total_opened: raw.unique_opened || 0,
        total_replied: uniqueReplies,
        total_bounced: raw.bounced || 0,
        total_unsubscribed: raw.unsubscribed || 0,
        leads_count: raw.total_leads || 0,
        contacted_count: raw.contacted || 0,
        completed_count: 0,
      };
    });

    // Merge campaigns with analytics
    const analyticsMap = new Map(analytics.map(a => [a.campaign_id, a]));
    const campaignsWithAnalytics = campaigns.map(campaign => ({
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

    // Fetch warmup analytics for health scores (optional - don't fail if this doesn't work)
    if (accounts.length > 0) {
      try {
        const emails = accounts.map(a => a.email);
        const warmupRes = await this.getWarmupAnalytics(emails);
        
        if (warmupRes.data?.aggregate_data) {
          enrichedAccounts.forEach(account => {
            const warmup = warmupRes.data?.aggregate_data[account.email];
            if (warmup) {
              account.health_score = warmup.health_score || account.warmup_score;
              account.health_score_label = warmup.health_score_label || `${account.warmup_score}%`;
              account.landed_inbox = warmup.landed_inbox || 0;
              account.landed_spam = warmup.landed_spam || 0;
            }
          });
        }
      } catch (warmupError) {
        console.warn('[Instantly API v2] Warmup analytics failed, using defaults:', warmupError);
      }
    }

    return {
      campaigns: campaignsWithAnalytics,
      analytics,
      accounts: enrichedAccounts,
      tags,
      tagMappings,
      error: campaignsRes.error || analyticsRes.error || accountsRes.error,
    };
  }

  /**
   * Extract client name from campaign name
   */
  extractClientName(campaignName: string): string {
    let name = campaignName;
    
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
    
    // Try common patterns
    const patterns = [
      /^(.+?)\s*[-–—|]\s*/,
      /^\[(.+?)\]\s*/,
      /^(.+?):\s*/,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Use first two words as fallback
    const words = name.trim().split(/\s+/);
    return words.slice(0, 2).join(' ');
  }
}

export const instantlyService = new InstantlyService();
