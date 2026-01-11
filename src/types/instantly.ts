// Instantly API Types

export interface Campaign {
  id: string;
  name: string;
  clientName: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  sent: number;
  opened: number;
  replied: number;
  positiveReplies: number;
  opportunities: number;
  bounced: number;
  unsubscribed: number;
  uncontactedLeads: number;
  totalLeads: number;
  dailySendLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  email: string;
  clientName: string;
  status: 'connected' | 'disconnected' | 'warming';
  healthScore: number;
  dailySendLimit: number;
  sentToday: number;
  lastSyncAt: string;
  provider: 'google' | 'outlook' | 'other';
  tags?: string[]; // Tags for grouping inboxes (e.g., "500inboxes", "hypertide", etc.)
  sendingError?: boolean; // Whether there's a sending error
  errorMessage?: string; // Error message if any
}

export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  campaignId: string;
  status: 'uncontacted' | 'contacted' | 'replied' | 'bounced' | 'unsubscribed';
  contactedAt?: string;
  repliedAt?: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  date: string;
  sent: number;
  opened: number;
  replied: number;
  positiveReplies: number;
  opportunities: number;
  bounced: number;
  unsubscribed: number;
}

export interface LeadList {
  id: string;
  name: string;
  clientName: string;
  totalLeads: number;
  uploadedAt: string;
  campaigns: string[];
}

export interface InstantlySyncData {
  id: string;
  campaigns: Campaign[];
  accounts: Account[];
  analytics: CampaignAnalytics[];
  leadLists: LeadList[];
  syncedAt: string;
}
