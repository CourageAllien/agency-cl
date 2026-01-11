// Issue Bucket Classification Engine

import { BENCHMARKS } from './benchmarks';
import type { Campaign, Account } from '@/types/instantly';
import type { IssueBucket, Severity, ClientMetrics, ClientClassification } from '@/types/analysis';

export function classifyClient(
  clientName: string,
  campaigns: Campaign[],
  accounts: Account[]
): ClientClassification {
  // Aggregate metrics from all campaigns
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.opened, 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + c.replied, 0);
  const positiveReplies = campaigns.reduce((sum, c) => sum + (c.positiveReplies || 0), 0);
  const opportunities = campaigns.reduce((sum, c) => sum + c.opportunities, 0);
  const uncontactedLeads = campaigns.reduce((sum, c) => sum + c.uncontactedLeads, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.totalLeads, 0);

  // Calculate rates
  const replyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const conversionRate = totalReplies > 0 ? (opportunities / totalReplies) * 100 : 0;

  // Inbox health analysis
  const clientAccounts = accounts.filter(a => a.clientName === clientName);
  const activeAccounts = clientAccounts.filter(a => a.status === 'connected');
  const disconnectedInboxes = clientAccounts.filter(a => a.status === 'disconnected').length;
  const lowHealthInboxes = clientAccounts.filter(
    a => a.status === 'connected' && a.healthScore < BENCHMARKS.HEALTHY_INBOX
  ).length;
  const avgInboxHealth = activeAccounts.length > 0
    ? activeAccounts.reduce((sum, a) => sum + a.healthScore, 0) / activeAccounts.length
    : 0;

  const metrics: ClientMetrics = {
    totalSent,
    totalOpened,
    totalReplies,
    replyRate,
    openRate,
    positiveReplies,
    opportunities,
    conversionRate,
    uncontactedLeads,
    totalLeads,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    activeInboxes: activeAccounts.length,
    disconnectedInboxes,
    lowHealthInboxes,
    avgInboxHealth,
  };

  // Classification logic (order matters - most critical first)

  // 1. DELIVERABILITY ISSUE - check first as it affects everything
  if (disconnectedInboxes > 0 || lowHealthInboxes > 2) {
    return createClassification(
      clientName,
      'DELIVERABILITY_ISSUE',
      disconnectedInboxes > 0 ? 'critical' : 'high',
      `${disconnectedInboxes} disconnected, ${lowHealthInboxes} low health inboxes`,
      metrics,
      {
        title: `Fix ${disconnectedInboxes + lowHealthInboxes} inbox issues for ${clientName}`,
        description: `${disconnectedInboxes} disconnected inboxes need re-authentication. ${lowHealthInboxes} inboxes below health score ${BENCHMARKS.HEALTHY_INBOX}.`,
        category: 'deliverability',
      }
    );
  }

  // 2. TOO EARLY - not enough data
  if (totalSent < BENCHMARKS.EARLY_STAGE) {
    return createClassification(
      clientName,
      'TOO_EARLY',
      'low',
      `Only ${totalSent.toLocaleString()} sends, need ${BENCHMARKS.EARLY_STAGE.toLocaleString()}+ for reliable data`,
      metrics,
      {
        title: `Monitor ${clientName}`,
        description: `Campaign still in early stage. Continue monitoring until ${BENCHMARKS.EARLY_STAGE.toLocaleString()} sends.`,
        category: 'monitor',
      }
    );
  }

  // 3. VOLUME ISSUE - running out of leads
  if (uncontactedLeads < BENCHMARKS.CRITICAL_UNCONTACTED) {
    const needsCopyFirst = replyRate < BENCHMARKS.CRITICAL_REPLY_RATE;
    return createClassification(
      clientName,
      'VOLUME_ISSUE',
      uncontactedLeads < 1000 ? 'critical' : 'high',
      `Only ${uncontactedLeads.toLocaleString()} uncontacted leads remaining`,
      metrics,
      {
        title: needsCopyFirst 
          ? `Fix copy THEN order leads for ${clientName}`
          : `Order new leads for ${clientName}`,
        description: needsCopyFirst
          ? `Reply rate ${replyRate.toFixed(2)}% is too low. Fix copy before ordering new leads to avoid waste.`
          : `Campaign performing at ${replyRate.toFixed(2)}% reply rate. Order new leads to continue momentum.`,
        category: 'volume',
      }
    );
  }

  // 4. COPY ISSUE - low reply rate
  if (replyRate < BENCHMARKS.CRITICAL_REPLY_RATE) {
    return createClassification(
      clientName,
      'COPY_ISSUE',
      replyRate < 0.3 ? 'critical' : 'high',
      `Reply rate ${replyRate.toFixed(2)}% is below ${BENCHMARKS.CRITICAL_REPLY_RATE}% minimum`,
      metrics,
      {
        title: `Rewrite copy for ${clientName}`,
        description: `Reply rate ${replyRate.toFixed(2)}% indicates copy isn't resonating. Review: subject line (3 words max), first line (12 words max), overall length (<80 words), and mechanism differentiation.`,
        category: 'copy',
      }
    );
  }

  // 5. SUBSEQUENCE ISSUE - high reply, low conversion
  if (replyRate >= BENCHMARKS.GOOD_REPLY_RATE && conversionRate < BENCHMARKS.CRITICAL_CONVERSION) {
    return createClassification(
      clientName,
      'SUBSEQUENCE_ISSUE',
      'critical',
      `${replyRate.toFixed(2)}% reply rate but only ${conversionRate.toFixed(2)}% conversion`,
      metrics,
      {
        title: `Fix subsequences for ${clientName}`,
        description: `Getting ${totalReplies} replies but only ${opportunities} opportunities (${conversionRate.toFixed(2)}% conversion). Review price objection responses (quote lowest packages), info responses (don't give away too much), and meeting CTAs.`,
        category: 'subsequence',
      }
    );
  }

  // 6. TAM EXHAUSTED - need to recycle
  if (totalSent >= BENCHMARKS.TAM_EXHAUSTED && replyRate < BENCHMARKS.LOW_REPLY_RATE) {
    return createClassification(
      clientName,
      'TAM_EXHAUSTED',
      'medium',
      `${totalSent.toLocaleString()} lifetime sends with ${replyRate.toFixed(2)}% reply rate`,
      metrics,
      {
        title: `New campaign + recycle leads for ${clientName}`,
        description: `TAM exhausted with ${totalSent.toLocaleString()} sends. Create new campaign with fresh copy, then recycle leads from completed campaigns.`,
        category: 'recycle',
      }
    );
  }

  // 7. NOT VIABLE - lots of sends, no results
  if (totalSent >= BENCHMARKS.VIABLE_THRESHOLD && opportunities < 10) {
    return createClassification(
      clientName,
      'NOT_VIABLE',
      'low',
      `${totalSent.toLocaleString()} sends with only ${opportunities} opportunities`,
      metrics,
      {
        title: `Review viability of ${clientName}`,
        description: `High send volume with poor results. Discuss with client: offer-market fit, targeting, or consider pausing.`,
        category: 'review',
      }
    );
  }

  // 8. PERFORMING WELL - no action needed
  return createClassification(
    clientName,
    'PERFORMING_WELL',
    'low',
    `${replyRate.toFixed(2)}% reply rate, ${conversionRate.toFixed(2)}% conversion, ${uncontactedLeads.toLocaleString()} leads remaining`,
    metrics,
    {
      title: `Monitor ${clientName}`,
      description: `Performing well. Prepare to recycle leads when campaign completes.`,
      category: 'monitor',
    }
  );
}

function createClassification(
  clientName: string,
  bucket: IssueBucket,
  severity: Severity,
  reason: string,
  metrics: ClientMetrics,
  autoTask: { title: string; description: string; category: string }
): ClientClassification {
  return {
    clientId: clientName.toLowerCase().replace(/\s+/g, '-'),
    clientName,
    bucket,
    severity,
    reason,
    metrics,
    autoTask,
    analyzedAt: new Date().toISOString(),
  };
}

export function classifyAllClients(
  clientCampaigns: Record<string, Campaign[]>,
  accounts: Account[]
): ClientClassification[] {
  return Object.entries(clientCampaigns).map(([clientName, campaigns]) =>
    classifyClient(clientName, campaigns, accounts)
  );
}

export function groupCampaignsByClient(campaigns: Campaign[]): Record<string, Campaign[]> {
  return campaigns.reduce((acc, campaign) => {
    const clientName = campaign.clientName;
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(campaign);
    return acc;
  }, {} as Record<string, Campaign[]>);
}
