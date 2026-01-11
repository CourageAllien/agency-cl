// Mock Data for Development and Demo
import type { Campaign, Account } from '@/types/instantly';
import type { ClientClassification, InboxHealthSummary, WeeklyTrendData } from '@/types/analysis';
import type { AutoTask } from '@/types/task';

// Mock Campaigns
export const mockCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Acme Corp - Q1 Outreach',
    clientName: 'Acme Corp',
    status: 'active',
    sent: 45000,
    opened: 18000,
    replied: 450,
    positiveReplies: 180,
    opportunities: 45,
    bounced: 900,
    unsubscribed: 225,
    uncontactedLeads: 8500,
    totalLeads: 55000,
    dailySendLimit: 500,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
  {
    id: 'camp-2',
    name: 'TechStart - Series A Outreach',
    clientName: 'TechStart',
    status: 'active',
    sent: 12000,
    opened: 4800,
    replied: 36,
    positiveReplies: 14,
    opportunities: 3,
    bounced: 240,
    unsubscribed: 60,
    uncontactedLeads: 2100,
    totalLeads: 15000,
    dailySendLimit: 300,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
  {
    id: 'camp-3',
    name: 'GrowthCo - Enterprise',
    clientName: 'GrowthCo',
    status: 'active',
    sent: 85000,
    opened: 34000,
    replied: 1700,
    positiveReplies: 680,
    opportunities: 85,
    bounced: 1700,
    unsubscribed: 850,
    uncontactedLeads: 12000,
    totalLeads: 100000,
    dailySendLimit: 600,
    createdAt: '2023-11-01T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
  {
    id: 'camp-4',
    name: 'StartupX - MVP Launch',
    clientName: 'StartupX',
    status: 'active',
    sent: 5000,
    opened: 2000,
    replied: 25,
    positiveReplies: 10,
    opportunities: 2,
    bounced: 100,
    unsubscribed: 25,
    uncontactedLeads: 15000,
    totalLeads: 20000,
    dailySendLimit: 200,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
  {
    id: 'camp-5',
    name: 'MegaCorp - Global Expansion',
    clientName: 'MegaCorp',
    status: 'active',
    sent: 120000,
    opened: 48000,
    replied: 960,
    positiveReplies: 384,
    opportunities: 12,
    bounced: 2400,
    unsubscribed: 1200,
    uncontactedLeads: 500,
    totalLeads: 125000,
    dailySendLimit: 800,
    createdAt: '2023-08-01T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
  {
    id: 'camp-6',
    name: 'CloudSync - SaaS Outreach',
    clientName: 'CloudSync',
    status: 'active',
    sent: 65000,
    opened: 26000,
    replied: 1950,
    positiveReplies: 780,
    opportunities: 195,
    bounced: 1300,
    unsubscribed: 650,
    uncontactedLeads: 25000,
    totalLeads: 90000,
    dailySendLimit: 500,
    createdAt: '2023-10-15T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
  {
    id: 'camp-7',
    name: 'DataFlow - Analytics',
    clientName: 'DataFlow',
    status: 'active',
    sent: 78000,
    opened: 31200,
    replied: 1560,
    positiveReplies: 624,
    opportunities: 31,
    bounced: 1560,
    unsubscribed: 780,
    uncontactedLeads: 8000,
    totalLeads: 90000,
    dailySendLimit: 550,
    createdAt: '2023-09-01T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
  {
    id: 'camp-8',
    name: 'SecureNet - Cybersecurity',
    clientName: 'SecureNet',
    status: 'paused',
    sent: 92000,
    opened: 36800,
    replied: 276,
    positiveReplies: 110,
    opportunities: 5,
    bounced: 1840,
    unsubscribed: 920,
    uncontactedLeads: 3000,
    totalLeads: 98000,
    dailySendLimit: 400,
    createdAt: '2023-07-01T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
];

// Mock Accounts (Inboxes) with Tags
export const mockAccounts: Account[] = [
  // Acme Corp accounts - Hypertide batch 1
  { id: 'acc-1', email: 'james@acmeteam.com', clientName: 'Acme Corp', status: 'connected', healthScore: 96, dailySendLimit: 50, sentToday: 42, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['hypertide-batch1', 'acme-main'] },
  { id: 'acc-2', email: 'sarah@acmeteam.com', clientName: 'Acme Corp', status: 'connected', healthScore: 94, dailySendLimit: 50, sentToday: 48, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['hypertide-batch1', 'acme-main'] },
  { id: 'acc-3', email: 'mike@acmeteam.com', clientName: 'Acme Corp', status: 'connected', healthScore: 92, dailySendLimit: 50, sentToday: 45, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'outlook', tags: ['hypertide-batch1', 'acme-secondary'] },
  
  // TechStart accounts - 500inboxes
  { id: 'acc-4', email: 'alex@techstart.io', clientName: 'TechStart', status: 'connected', healthScore: 88, dailySendLimit: 40, sentToday: 35, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['500inboxes', 'techstart-main'], sendingError: true, errorMessage: 'Rate limit exceeded' },
  { id: 'acc-5', email: 'jordan@techstart.io', clientName: 'TechStart', status: 'disconnected', healthScore: 0, dailySendLimit: 40, sentToday: 0, lastSyncAt: '2024-03-08T10:00:00Z', provider: 'google', tags: ['500inboxes', 'techstart-main'] },
  
  // GrowthCo accounts - Premium inboxes
  { id: 'acc-6', email: 'emma@growthco.com', clientName: 'GrowthCo', status: 'connected', healthScore: 97, dailySendLimit: 50, sentToday: 50, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['premium-inboxes', 'growthco'] },
  { id: 'acc-7', email: 'ryan@growthco.com', clientName: 'GrowthCo', status: 'connected', healthScore: 95, dailySendLimit: 50, sentToday: 48, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'outlook', tags: ['premium-inboxes', 'growthco'] },
  { id: 'acc-8', email: 'lisa@growthco.com', clientName: 'GrowthCo', status: 'connected', healthScore: 98, dailySendLimit: 50, sentToday: 47, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['premium-inboxes', 'growthco'] },
  
  // StartupX accounts - New batch
  { id: 'acc-9', email: 'founder@startupx.co', clientName: 'StartupX', status: 'connected', healthScore: 91, dailySendLimit: 40, sentToday: 38, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['hypertide-batch2', 'startupx'] },
  
  // MegaCorp accounts - Enterprise batch
  { id: 'acc-10', email: 'sales1@megacorp.com', clientName: 'MegaCorp', status: 'connected', healthScore: 78, dailySendLimit: 50, sentToday: 45, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'outlook', tags: ['enterprise-batch', 'megacorp'], sendingError: true, errorMessage: 'Authentication failed' },
  { id: 'acc-11', email: 'sales2@megacorp.com', clientName: 'MegaCorp', status: 'connected', healthScore: 82, dailySendLimit: 50, sentToday: 44, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'outlook', tags: ['enterprise-batch', 'megacorp'] },
  { id: 'acc-12', email: 'sales3@megacorp.com', clientName: 'MegaCorp', status: 'disconnected', healthScore: 0, dailySendLimit: 50, sentToday: 0, lastSyncAt: '2024-03-07T12:00:00Z', provider: 'outlook', tags: ['enterprise-batch', 'megacorp'] },
  
  // CloudSync accounts - 500inboxes
  { id: 'acc-13', email: 'tom@cloudsync.io', clientName: 'CloudSync', status: 'connected', healthScore: 96, dailySendLimit: 50, sentToday: 49, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['500inboxes', 'cloudsync'] },
  { id: 'acc-14', email: 'anna@cloudsync.io', clientName: 'CloudSync', status: 'connected', healthScore: 95, dailySendLimit: 50, sentToday: 47, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['500inboxes', 'cloudsync'] },
  
  // DataFlow accounts - Hypertide batch 2
  { id: 'acc-15', email: 'dave@dataflow.ai', clientName: 'DataFlow', status: 'connected', healthScore: 89, dailySendLimit: 50, sentToday: 46, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['hypertide-batch2', 'dataflow'] },
  { id: 'acc-16', email: 'nina@dataflow.ai', clientName: 'DataFlow', status: 'connected', healthScore: 91, dailySendLimit: 50, sentToday: 48, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'outlook', tags: ['hypertide-batch2', 'dataflow'] },
  
  // SecureNet accounts - Premium inboxes
  { id: 'acc-17', email: 'sec1@securenet.io', clientName: 'SecureNet', status: 'connected', healthScore: 85, dailySendLimit: 40, sentToday: 0, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['premium-inboxes', 'securenet'] },
  { id: 'acc-18', email: 'sec2@securenet.io', clientName: 'SecureNet', status: 'connected', healthScore: 83, dailySendLimit: 40, sentToday: 0, lastSyncAt: '2024-03-10T15:00:00Z', provider: 'google', tags: ['premium-inboxes', 'securenet'] },
];

// Get all unique tags
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  mockAccounts.forEach(account => {
    account.tags?.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

// Generate classifications using the engine
import { classifyAllClients, groupCampaignsByClient } from './engine/classifier';
import { generateAllTasks } from './engine/taskGenerator';

export function getMockClassifications(): ClientClassification[] {
  const clientCampaigns = groupCampaignsByClient(mockCampaigns);
  return classifyAllClients(clientCampaigns, mockAccounts);
}

export function getMockInboxHealth(): InboxHealthSummary {
  const connected = mockAccounts.filter(a => a.status === 'connected');
  const disconnected = mockAccounts.filter(a => a.status === 'disconnected');
  const lowHealth = connected.filter(a => a.healthScore < 93);
  const healthy = connected.filter(a => a.healthScore >= 93);
  
  return {
    total: mockAccounts.length,
    healthy: healthy.length,
    lowHealth: lowHealth.length,
    disconnected: disconnected.length,
    warming: 0,
    avgHealthScore: connected.length > 0 
      ? Math.round(connected.reduce((sum, a) => sum + a.healthScore, 0) / connected.length)
      : 0,
  };
}

export function getMockWeeklyTrends(): WeeklyTrendData {
  return {
    week: '2024-W10',
    clients: [
      { name: 'Acme Corp', replyRate: 1.0, previousReplyRate: 0.95, change: 5.26, trend: 'improving' },
      { name: 'TechStart', replyRate: 0.3, previousReplyRate: 0.35, change: -14.29, trend: 'declining' },
      { name: 'GrowthCo', replyRate: 2.0, previousReplyRate: 1.9, change: 5.26, trend: 'improving' },
      { name: 'StartupX', replyRate: 0.5, previousReplyRate: 0.5, change: 0, trend: 'stable' },
      { name: 'MegaCorp', replyRate: 0.8, previousReplyRate: 0.9, change: -11.11, trend: 'declining' },
      { name: 'CloudSync', replyRate: 3.0, previousReplyRate: 2.8, change: 7.14, trend: 'improving' },
      { name: 'DataFlow', replyRate: 2.0, previousReplyRate: 2.1, change: -4.76, trend: 'declining' },
      { name: 'SecureNet', replyRate: 0.3, previousReplyRate: 0.4, change: -25.0, trend: 'declining' },
    ],
  };
}

export function getMockTasks(): { daily: AutoTask[]; weekly: AutoTask[] } {
  const classifications = getMockClassifications();
  const inboxHealth = getMockInboxHealth();
  const weeklyTrends = getMockWeeklyTrends();
  
  return generateAllTasks(classifications, inboxHealth, weeklyTrends);
}

// Portfolio metrics summary
export interface PortfolioMetrics {
  totalClients: number;
  activeClients: number;
  totalSent: number;
  totalReplies: number;
  avgReplyRate: number;
  totalOpportunities: number;
  avgConversionRate: number;
  activeInboxes: number;
  avgInboxHealth: number;
}

export function getMockPortfolioMetrics(): PortfolioMetrics {
  const classifications = getMockClassifications();
  const inboxHealth = getMockInboxHealth();
  
  const totalSent = classifications.reduce((sum, c) => sum + c.metrics.totalSent, 0);
  const totalReplies = classifications.reduce((sum, c) => sum + c.metrics.totalReplies, 0);
  const totalOpportunities = classifications.reduce((sum, c) => sum + c.metrics.opportunities, 0);
  
  return {
    totalClients: classifications.length,
    activeClients: classifications.filter(c => c.bucket !== 'TOO_EARLY' && c.bucket !== 'NOT_VIABLE').length,
    totalSent,
    totalReplies,
    avgReplyRate: totalSent > 0 ? (totalReplies / totalSent) * 100 : 0,
    totalOpportunities,
    avgConversionRate: totalReplies > 0 ? (totalOpportunities / totalReplies) * 100 : 0,
    activeInboxes: inboxHealth.total - inboxHealth.disconnected,
    avgInboxHealth: inboxHealth.avgHealthScore,
  };
}

// Historical data for charts
export function getMockHistoricalData() {
  return {
    replyRateTrend: [
      { date: '2024-02-12', value: 1.2 },
      { date: '2024-02-19', value: 1.3 },
      { date: '2024-02-26', value: 1.1 },
      { date: '2024-03-04', value: 1.4 },
      { date: '2024-03-11', value: 1.5 },
    ],
    opportunitiesTrend: [
      { date: '2024-02-12', value: 45 },
      { date: '2024-02-19', value: 52 },
      { date: '2024-02-26', value: 48 },
      { date: '2024-03-04', value: 61 },
      { date: '2024-03-11', value: 73 },
    ],
    sentTrend: [
      { date: '2024-02-12', value: 42000 },
      { date: '2024-02-19', value: 45000 },
      { date: '2024-02-26', value: 43000 },
      { date: '2024-03-04', value: 48000 },
      { date: '2024-03-11', value: 52000 },
    ],
  };
}
