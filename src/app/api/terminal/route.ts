import { NextResponse } from 'next/server';
import { claudeService, type TerminalQueryContext } from '@/lib/services/claude';
import { getMockClassifications, getMockTasks, mockAccounts } from '@/lib/mock-data';
import { BENCHMARKS } from '@/lib/engine/benchmarks';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, queryType } = body;

    if (!query && !queryType) {
      return NextResponse.json(
        { error: 'Query or queryType is required' },
        { status: 400 }
      );
    }

    // Build context from current data
    // In production, this would come from real API data
    const classifications = getMockClassifications();
    const tasks = getMockTasks();
    const accounts = mockAccounts;

    const context: TerminalQueryContext = {
      clients: classifications.map((c) => ({
        name: c.clientName,
        bucket: c.bucket,
        replyRate: c.metrics.replyRate,
        conversionRate: c.metrics.conversionRate,
        opportunities: c.metrics.opportunities,
        totalSent: c.metrics.totalSent,
        positiveReplies: c.metrics.positiveReplies,
      })),
      inboxes: accounts.map((a) => ({
        email: a.email,
        clientName: a.clientName,
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
          status: t.status,
          completedAt: t.completedAt,
        })),
        ...tasks.weekly.map((t) => ({
          id: t.id,
          clientName: t.clientName,
          title: t.title,
          description: t.description || '',
          status: t.status,
          completedAt: t.completedAt,
        })),
      ],
      benchmarks: {
        GOOD_REPLY_RATE: BENCHMARKS.GOOD_REPLY_RATE,
        CRITICAL_REPLY_RATE: BENCHMARKS.CRITICAL_REPLY_RATE,
        TARGET_CONVERSION: BENCHMARKS.TARGET_CONVERSION,
        CRITICAL_CONVERSION: BENCHMARKS.CRITICAL_CONVERSION,
        POSITIVE_REPLY_TO_MEETING_RATIO: 40, // 40% as mentioned in docs
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
        // Process as free-form query
        result = await claudeService.processTerminalQuery(query, context);
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: result.response,
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Terminal API error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}
