import { NextResponse } from 'next/server';
import { executeCommand, parseCommand } from '@/lib/terminal/commands';
import { claudeService, type TerminalQueryContext } from '@/lib/services/claude';
import { BENCHMARKS } from '@/lib/engine/benchmarks';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Fetch dashboard data for Claude queries
async function getDashboardData() {
  try {
    const { instantlyService } = await import('@/lib/services/instantly');
    const { transformCampaignsToClients, transformAccounts, generateTasksFromClassifications } = await import('@/lib/services/dataTransformer');
    
    const fullData = await instantlyService.getFullAnalytics();
    const { campaigns, activeCampaigns, accounts } = fullData;
    
    const clients = transformCampaignsToClients(campaigns, activeCampaigns);
    const transformedAccounts = transformAccounts(accounts);
    const tasks = generateTasksFromClassifications(clients);
    
    return { clients, accounts: transformedAccounts, tasks, success: true };
  } catch (error) {
    console.error('Failed to fetch dashboard data for terminal:', error);
    return { clients: [], accounts: [], tasks: { daily: [], weekly: [] }, success: false };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, queryType, useClaudeAI = false } = body;

    if (!query && !queryType) {
      return NextResponse.json(
        { error: 'Query or queryType is required' },
        { status: 400 }
      );
    }

    // Check if this is a structured command or free-form query
    const command = parseCommand(query || '');
    
    // If it's a known command and NOT explicitly requesting Claude AI, use the command processor
    if (command !== 'unknown' && !useClaudeAI) {
      console.log(`[Terminal] Executing command: ${command}`);
      
      const forceRefresh = (query || '').toLowerCase().startsWith('refresh ');
      const result = await executeCommand(query, forceRefresh);
      
      return NextResponse.json({
        type: 'command',
        command: command,
        response: formatCommandResponse(result),
        structured: result,
        timestamp: new Date().toISOString(),
        dataSource: 'instantly',
      });
    }

    // For unknown commands or Claude AI requests, use Claude
    console.log(`[Terminal] Using Claude AI for: ${query}`);
    
    const dashboardData = await getDashboardData();
    const { clients, accounts, tasks } = dashboardData;

    const context: TerminalQueryContext = {
      clients: clients.map((c) => ({
        name: c.name,
        bucket: c.classification.bucket,
        replyRate: c.metrics.replyRate,
        conversionRate: c.metrics.conversionRate,
        opportunities: c.metrics.opportunities,
        totalSent: c.metrics.totalSent,
        positiveReplies: c.metrics.positiveReplies,
        activeCampaigns: c.metrics.activeCampaignCount,
        posReplyToMeeting: c.metrics.posReplyToMeeting,
      })),
      inboxes: accounts.map((a) => ({
        email: a.email,
        status: a.status,
        healthScore: a.healthScore,
        tags: a.tags || [],
        sendingError: a.sendingError,
        errorMessage: a.errorMessage,
      })),
      tasks: [
        ...tasks.daily.map((t) => ({
          id: t.id,
          clientName: t.clientName,
          title: t.title,
          description: t.description || '',
          status: t.completed ? 'completed' : 'pending',
          completedAt: undefined,
        })),
        ...tasks.weekly.map((t) => ({
          id: t.id,
          clientName: t.clientName,
          title: t.title,
          description: t.description || '',
          status: t.completed ? 'completed' : 'pending',
          completedAt: undefined,
        })),
      ],
      benchmarks: {
        GOOD_REPLY_RATE: BENCHMARKS.GOOD_REPLY_RATE,
        CRITICAL_REPLY_RATE: BENCHMARKS.CRITICAL_REPLY_RATE,
        TARGET_CONVERSION: BENCHMARKS.TARGET_CONVERSION,
        CRITICAL_CONVERSION: BENCHMARKS.CRITICAL_CONVERSION,
        POSITIVE_REPLY_TO_MEETING_RATIO: 40,
      },
    };

    let result;

    // Handle predefined query types
    switch (queryType) {
      case 'benchmark-check':
        result = await claudeService.checkBenchmarkAdherence(context);
        break;
      case 'positive-reply-ratio':
        result = await claudeService.checkPositiveReplyRatio(context);
        break;
      case 'inbox-health':
        result = await claudeService.checkInboxHealth(context);
        break;
      case 'reply-rate-trends':
        result = await claudeService.checkReplyRateTrends(context);
        break;
      case 'task-summary':
        result = await claudeService.getTaskSummary(context);
        break;
      case 'insights':
        result = await claudeService.generateInsights(context);
        break;
      default:
        result = await claudeService.processTerminalQuery(query, context);
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      type: 'claude',
      response: result.response,
      data: result.data,
      timestamp: new Date().toISOString(),
      dataSource: dashboardData.success ? 'instantly' : 'fallback',
    });
  } catch (error) {
    console.error('Terminal API error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}

// Format structured command response to readable text
function formatCommandResponse(result: {
  title: string;
  icon: string;
  sections: Array<{
    title: string;
    type: string;
    count?: number;
    items?: Array<{
      name: string;
      details: string[];
      priority?: string;
    }>;
    status?: {
      label: string;
      value: string | number;
      icon: string;
      change?: string;
    };
  }>;
  summary?: string[];
  metadata: {
    timestamp: string;
    cached: boolean;
    campaignCount?: number;
    issueCount?: number;
  };
}): string {
  const lines: string[] = [];
  
  // Title
  lines.push(`${result.icon} **${result.title}**`);
  lines.push('');
  
  // Sections
  for (const section of result.sections) {
    // Check if this is a "full text" section (campaigns command uses this)
    // It has one item with name "Full Analysis" and the full text in details[0]
    if (section.items?.length === 1 && 
        section.items[0].name === 'Full Analysis' && 
        section.items[0].details.length === 1) {
      // Just output the raw formatted text
      lines.push(section.items[0].details[0]);
      continue;
    }
    
    if (section.type === 'status' && section.status) {
      lines.push(`**${section.title}**`);
      lines.push(`${section.status.label}: ${section.status.value} ${section.status.icon}`);
      if (section.status.change) {
        lines.push(`(${section.status.change})`);
      }
      lines.push('');
    } else if (section.items && section.items.length > 0) {
      const countStr = section.count !== undefined ? ` (${section.count})` : '';
      lines.push(`**${section.title}${countStr}:**`);
      lines.push('');
      
      section.items.forEach((item, idx) => {
        const priorityIcon = getPriorityIcon(item.priority);
        lines.push(`${idx + 1}. ${priorityIcon} **${item.name}**`);
        item.details.forEach(detail => {
          if (detail) {
            lines.push(`   ${detail}`);
          }
        });
        lines.push('');
      });
    }
  }
  
  // Summary
  if (result.summary && result.summary.length > 0) {
    lines.push('---');
    result.summary.forEach(line => {
      lines.push(line);
    });
  }
  
  // Metadata
  if (result.metadata.timestamp) {
    lines.push('');
    lines.push(`_Data from ${result.metadata.timestamp}${result.metadata.cached ? ' (cached)' : ''}_`);
  }
  
  return lines.join('\n');
}

function getPriorityIcon(priority?: string): string {
  switch (priority) {
    case 'URGENT':
    case 'CRITICAL':
      return '🔴';
    case 'HIGH':
      return '🟠';
    case 'MEDIUM':
    case 'WARNING':
      return '🟡';
    case 'LOW':
      return '🟢';
    default:
      return '•';
  }
}
