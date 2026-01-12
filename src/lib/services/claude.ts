/**
 * Claude API Service
 * Handles natural language processing for the Terminal
 */

import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

interface TerminalQueryContext {
  clients: Array<{
    name: string;
    bucket: string;
    replyRate: number;
    conversionRate: number;
    opportunities: number;
    totalSent: number;
    positiveReplies: number;
    activeCampaigns?: number;
    posReplyToMeeting?: number;
  }>;
  // Note: Inboxes are shared across clients, not specific to one
  inboxes: Array<{
    email: string;
    status: string;
    healthScore: number;
    tags: string[];
    sendingError?: boolean;
    errorMessage?: string;
  }>;
  tasks: Array<{
    id: string;
    clientName: string;
    title: string;
    description: string;
    status: string;
    completedAt?: string;
  }>;
  benchmarks: {
    GOOD_REPLY_RATE: number;
    CRITICAL_REPLY_RATE: number;
    TARGET_CONVERSION: number;
    CRITICAL_CONVERSION: number;
    POSITIVE_REPLY_TO_MEETING_RATIO: number;
  };
}

interface TerminalResponse {
  response: string;
  data?: Record<string, unknown>;
  error?: string;
}

class ClaudeService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  /**
   * Process a natural language query for the Terminal
   */
  async processTerminalQuery(
    query: string,
    context: TerminalQueryContext
  ): Promise<TerminalResponse> {
    try {
      const client = this.getClient();

      const systemPrompt = `You are an AI assistant for a cold email agency's Command Center. You analyze campaign data, client performance, inbox health, and tasks to provide actionable insights.

IMPORTANT CONTEXT:
- You're analyzing data from Instantly (cold email platform)
- Benchmarks: 
  - Good Reply Rate: ${context.benchmarks.GOOD_REPLY_RATE}%
  - Critical Reply Rate: ${context.benchmarks.CRITICAL_REPLY_RATE}%
  - Target Conversion: ${context.benchmarks.TARGET_CONVERSION}%
  - Critical Conversion: ${context.benchmarks.CRITICAL_CONVERSION}%
  - Positive Reply to Meeting Ratio: ${context.benchmarks.POSITIVE_REPLY_TO_MEETING_RATIO}%

RESPONSE FORMAT:
- Be concise and actionable
- Use bullet points for lists
- Include specific numbers and percentages
- If asked about issues, suggest concrete next steps
- Format output for terminal display (use line breaks, not markdown)

CURRENT DATA:
Clients (${context.clients.length}):
${context.clients.map(c => `- ${c.name}: ${c.bucket}, Reply Rate: ${c.replyRate.toFixed(2)}%, Conv: ${c.conversionRate.toFixed(2)}%, Opps: ${c.opportunities}`).join('\n')}

Inboxes (${context.inboxes.length}):
${context.inboxes.map(i => `- ${i.email}: ${i.status}, Health: ${i.healthScore}%${i.tags.length > 0 ? `, Tags: ${i.tags.join(', ')}` : ''}${i.sendingError ? ` ERROR: ${i.errorMessage}` : ''}`).join('\n')}

Tasks (${context.tasks.length}):
${context.tasks.map(t => `- [${t.status}] ${t.clientName}: ${t.title}`).join('\n')}`;

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      });

      // Extract text from response
      const responseText = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        response: responseText,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      return {
        response: '',
        error: error instanceof Error ? error.message : 'Failed to process query',
      };
    }
  }

  /**
   * Generate insights from campaign data
   */
  async generateInsights(context: TerminalQueryContext): Promise<TerminalResponse> {
    const query = `Based on the current data, provide a brief executive summary with:
1. Top 3 immediate action items
2. Clients at risk (below benchmarks)
3. Quick wins (high-performing clients to scale)
Keep it under 200 words.`;

    return this.processTerminalQuery(query, context);
  }

  /**
   * Analyze specific client performance
   */
  async analyzeClient(
    clientName: string,
    context: TerminalQueryContext
  ): Promise<TerminalResponse> {
    const query = `Analyze ${clientName}'s performance in detail:
1. Current status and classification
2. Key metrics vs benchmarks
3. Specific recommendations for improvement
4. Priority level (1-5)`;

    return this.processTerminalQuery(query, context);
  }

  /**
   * Check for clients not hitting benchmarks
   */
  async checkBenchmarkAdherence(context: TerminalQueryContext): Promise<TerminalResponse> {
    const query = `Are there clients that are not hitting their benchmarks? If yes, please list below with:
- Client name
- Which benchmark they're missing
- Current value vs target
- Suggested action`;

    return this.processTerminalQuery(query, context);
  }

  /**
   * Check positive reply to meeting ratio
   */
  async checkPositiveReplyRatio(context: TerminalQueryContext): Promise<TerminalResponse> {
    const query = `Are there any clients with sub 40% positive reply to meeting ratio? 
Calculate this as: (opportunities / positive_replies) * 100
List any clients below 40% with their actual ratio and suggested improvements.`;

    return this.processTerminalQuery(query, context);
  }

  /**
   * Check for inbox issues
   */
  async checkInboxHealth(context: TerminalQueryContext): Promise<TerminalResponse> {
    const query = `Are there disconnected inboxes, or inboxes with sending errors? 
If yes, please list:
- All affected tags
- Number of inboxes per tag
- Specific error messages
- Recommended fixes
If no issues, just respond 'None - all inboxes healthy'`;

    return this.processTerminalQuery(query, context);
  }

  /**
   * Check reply rate trends
   */
  async checkReplyRateTrends(context: TerminalQueryContext): Promise<TerminalResponse> {
    const query = `Are reply rates trending downward since last week? 
If yes, please:
1. List affected clients
2. Describe the trend (% change)
3. Diagnose potential causes (deliverability, copy, targeting)
4. Recommend specific actions to resolve the dip

Reference the 'Courage Weekly/Daily Tasks + KPIs' best practices:
- Check spam rates
- Review subject lines
- Analyze send times
- Check inbox health`;

    return this.processTerminalQuery(query, context);
  }

  /**
   * Get task summary for today
   */
  async getTaskSummary(context: TerminalQueryContext): Promise<TerminalResponse> {
    const query = `Please provide a summary of all tasks done today.
For each completed task, list:
- Client name
- Action taken
- Outcome/status

If no tasks completed today, suggest the top 3 priority tasks to complete.`;

    return this.processTerminalQuery(query, context);
  }
}

export const claudeService = new ClaudeService();
export type { TerminalQueryContext, TerminalResponse };
