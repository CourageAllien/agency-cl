// Auto Task Generator Engine

import { BENCHMARKS } from './benchmarks';
import type { ClientClassification, InboxHealthSummary, WeeklyTrendData } from '@/types/analysis';
import type { AutoTask, TaskCategory } from '@/types/task';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export function generateAllTasks(
  classifications: ClientClassification[],
  inboxHealth: InboxHealthSummary,
  weeklyTrends?: WeeklyTrendData
): { daily: AutoTask[]; weekly: AutoTask[] } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daily: AutoTask[] = [];
  const weekly: AutoTask[] = [];

  // Generate daily tasks from classifications
  classifications.forEach(client => {
    // Skip clients that are performing well or too early (but still include in monitor)
    if (client.bucket === 'PERFORMING_WELL' || client.bucket === 'TOO_EARLY') {
      return;
    }

    daily.push({
      id: `${client.bucket}-${client.clientId}-${today.toISOString().split('T')[0]}`,
      type: 'daily',
      bucket: client.bucket,
      severity: client.severity,
      clientName: client.clientName,
      title: client.autoTask.title,
      description: client.autoTask.description,
      category: client.autoTask.category as TaskCategory,
      metrics: {
        replyRate: client.metrics.replyRate,
        conversionRate: client.metrics.conversionRate,
        uncontactedLeads: client.metrics.uncontactedLeads,
        totalSent: client.metrics.totalSent,
        opportunities: client.metrics.opportunities,
      },
      createdAt: now.toISOString(),
      dueDate: getDueDate(client.severity),
      completed: false,
    });
  });

  // Generate weekly tasks
  
  // 1. Benchmark check task
  const belowBenchmark = classifications.filter(c => 
    c.metrics.replyRate < BENCHMARKS.CRITICAL_REPLY_RATE ||
    c.metrics.conversionRate < BENCHMARKS.TARGET_CONVERSION
  );
  
  if (belowBenchmark.length > 0) {
    weekly.push({
      id: `benchmark-check-${today.toISOString().split('T')[0]}`,
      type: 'weekly',
      bucket: 'COPY_ISSUE',
      severity: 'high',
      clientName: 'All Clients',
      title: `${belowBenchmark.length} clients below benchmarks`,
      description: `Review: ${belowBenchmark.slice(0, 5).map(c => c.clientName).join(', ')}${belowBenchmark.length > 5 ? ` and ${belowBenchmark.length - 5} more` : ''}`,
      category: 'benchmark',
      metrics: { 
        count: belowBenchmark.length, 
        clients: belowBenchmark.map(c => c.clientName).join(', ') 
      },
      createdAt: now.toISOString(),
      dueDate: getEndOfWeek(),
      completed: false,
    });
  }

  // 2. Sub-40% conversion task
  const lowConversion = classifications.filter(c => 
    c.metrics.conversionRate < BENCHMARKS.ASPIRATIONAL_CONVERSION &&
    c.metrics.totalReplies > 10
  );

  if (lowConversion.length > 0) {
    const bestConverter = classifications
      .filter(c => c.metrics.totalReplies > 10)
      .sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate)[0];

    const avgConversion = classifications.length > 0
      ? classifications.reduce((sum, c) => sum + c.metrics.conversionRate, 0) / classifications.length
      : 0;

    weekly.push({
      id: `conversion-check-${today.toISOString().split('T')[0]}`,
      type: 'weekly',
      bucket: 'SUBSEQUENCE_ISSUE',
      severity: 'medium',
      clientName: 'All Clients',
      title: `${lowConversion.length} clients below 40% reply-to-meeting`,
      description: bestConverter 
        ? `Best performer: ${bestConverter.clientName} at ${bestConverter.metrics.conversionRate.toFixed(1)}%`
        : `Average conversion: ${avgConversion.toFixed(1)}%`,
      category: 'conversion',
      metrics: { 
        count: lowConversion.length,
        avgConversion: avgConversion.toFixed(2),
      },
      createdAt: now.toISOString(),
      dueDate: getEndOfWeek(),
      completed: false,
    });
  }

  // 3. Inbox health check
  const totalIssues = inboxHealth.disconnected + inboxHealth.lowHealth;
  if (totalIssues > 0) {
    weekly.push({
      id: `inbox-health-${today.toISOString().split('T')[0]}`,
      type: 'weekly',
      bucket: 'DELIVERABILITY_ISSUE',
      severity: inboxHealth.disconnected > 0 ? 'critical' : 'high',
      clientName: 'All Inboxes',
      title: `${totalIssues} inboxes need attention`,
      description: `${inboxHealth.disconnected} disconnected, ${inboxHealth.lowHealth} below health score ${BENCHMARKS.HEALTHY_INBOX}`,
      category: 'deliverability',
      metrics: {
        total: inboxHealth.total,
        healthy: inboxHealth.healthy,
        lowHealth: inboxHealth.lowHealth,
        disconnected: inboxHealth.disconnected,
        avgHealth: inboxHealth.avgHealthScore,
      },
      createdAt: now.toISOString(),
      dueDate: getEndOfWeek(),
      completed: false,
    });
  }

  // 4. Trend analysis (if data available)
  if (weeklyTrends) {
    const declining = weeklyTrends.clients.filter(c => c.trend === 'declining');
    if (declining.length > 0) {
      weekly.push({
        id: `trends-${today.toISOString().split('T')[0]}`,
        type: 'weekly',
        bucket: 'COPY_ISSUE',
        severity: 'medium',
        clientName: 'All Clients',
        title: `${declining.length} clients with declining reply rates`,
        description: `Week-over-week decline: ${declining.slice(0, 3).map(c => c.name).join(', ')}${declining.length > 3 ? ` and ${declining.length - 3} more` : ''}`,
        category: 'trends',
        metrics: { 
          decliningCount: declining.length,
          clients: declining.map(c => `${c.name} (${c.change.toFixed(1)}%)`).join(', '),
        },
        createdAt: now.toISOString(),
        dueDate: getEndOfWeek(),
        completed: false,
      });
    }
  }

  // 5. Portfolio health summary
  const performingWell = classifications.filter(c => c.bucket === 'PERFORMING_WELL').length;
  const needsAttention = classifications.filter(c => 
    c.severity === 'critical' || c.severity === 'high'
  ).length;

  weekly.push({
    id: `portfolio-summary-${today.toISOString().split('T')[0]}`,
    type: 'weekly',
    bucket: 'PERFORMING_WELL',
    severity: 'low',
    clientName: 'Portfolio',
    title: `Weekly Portfolio Health Review`,
    description: `${performingWell} performing well, ${needsAttention} need attention, ${classifications.length} total clients`,
    category: 'review',
    metrics: {
      total: classifications.length,
      performingWell,
      needsAttention,
      avgReplyRate: (classifications.reduce((sum, c) => sum + c.metrics.replyRate, 0) / classifications.length || 0).toFixed(2),
    },
    createdAt: now.toISOString(),
    dueDate: getEndOfWeek(),
    completed: false,
  });

  // Sort by severity
  daily.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  weekly.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return { daily, weekly };
}

function getDueDate(severity: 'critical' | 'high' | 'medium' | 'low'): string {
  const now = new Date();
  switch (severity) {
    case 'critical': 
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 1 day
    case 'high': 
      return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days
    case 'medium': 
      return new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days
    default: 
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week
  }
}

function getEndOfWeek(): string {
  const now = new Date();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  return new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000).toISOString();
}

export function toggleTaskCompletion(task: AutoTask): AutoTask {
  return {
    ...task,
    completed: !task.completed,
    completedAt: !task.completed ? new Date().toISOString() : undefined,
  };
}
