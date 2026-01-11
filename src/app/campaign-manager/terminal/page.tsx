"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getMockClassifications, getMockPortfolioMetrics, getMockTasks, getMockWeeklyTrends, mockAccounts } from "@/lib/mock-data";
import { BUCKET_CONFIGS } from "@/types/analysis";
import { BENCHMARKS } from "@/lib/engine/benchmarks";
import { formatNumber, formatPercentage } from "@/lib/utils";
import {
  Terminal,
  Send,
  Sparkles,
  Loader2,
  ChevronRight,
  HelpCircle,
  List,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Mail,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Available command queries organized by category
const COMMAND_QUERIES = {
  "Client Performance": [
    "Are there clients that are not hitting their benchmarks?",
    "Which clients need attention today?",
    "Show me clients with low reply rates",
    "Who has the best conversion rate?",
    "Compare client performance",
  ],
  "Conversion & Meetings": [
    "Are there any clients with sub 40% positive reply to meeting ratio?",
    "What's the average conversion rate across all clients?",
  ],
  "Inbox Health": [
    "Are there disconnected inboxes, or inboxes with sending errors?",
    "List all inbox issues by tag",
    "What's the overall inbox health status?",
  ],
  "Trends & Analytics": [
    "Are reply rates trending downward since last week?",
    "What's the portfolio health summary?",
    "Show me weekly trend analysis",
  ],
  "Tasks & Actions": [
    "Please list summary of all tasks done today",
    "Show tasks due this week",
    "What are the critical tasks right now?",
  ],
  "Volume & Leads": [
    "Which clients are running low on leads?",
    "List all deliverability issues",
    "What's the total send volume this week?",
  ],
};

const QUICK_SUGGESTIONS = [
  "Are there clients not hitting benchmarks?",
  "Any clients with sub 40% reply-to-meeting?",
  "Disconnected inboxes or sending errors?",
  "Are reply rates trending down?",
  "Summary of tasks done today",
];

export default function TerminalPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: "👋 Welcome to the Campaign Terminal powered by Claude AI!\n\nI can analyze your campaign data in real-time and provide actionable insights. Ask me anything about:\n• Client performance & benchmarks\n• Inbox health & deliverability\n• Reply rates & conversion trends\n• Tasks & action items\n\nClick the ? button to see all available command queries.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const classifications = getMockClassifications();
  const metrics = getMockPortfolioMetrics();
  const { daily, weekly } = getMockTasks();
  const trends = getMockWeeklyTrends();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const processQuery = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    // Clients not hitting benchmarks
    if (lowerQuery.includes("benchmark") || lowerQuery.includes("hitting")) {
      const notHittingBenchmarks = classifications.filter((c) => {
        const isLowReply = c.metrics.replyRate < BENCHMARKS.GOOD_REPLY_RATE;
        const isLowConversion = c.metrics.conversionRate < BENCHMARKS.TARGET_CONVERSION;
        return isLowReply || isLowConversion;
      });
      
      if (notHittingBenchmarks.length === 0) {
        return "✅ Great news! All clients are currently hitting their benchmarks.";
      }
      
      return `⚠️ **${notHittingBenchmarks.length} clients not hitting benchmarks:**\n\n${notHittingBenchmarks
        .map((c) => {
          const issues = [];
          if (c.metrics.replyRate < BENCHMARKS.GOOD_REPLY_RATE) {
            issues.push(`Reply rate ${formatPercentage(c.metrics.replyRate)} (target: ${BENCHMARKS.GOOD_REPLY_RATE}%)`);
          }
          if (c.metrics.conversionRate < BENCHMARKS.TARGET_CONVERSION) {
            issues.push(`Conversion ${formatPercentage(c.metrics.conversionRate)} (target: ${BENCHMARKS.TARGET_CONVERSION}%)`);
          }
          return `• **${c.clientName}**\n  ${issues.join(", ")}`;
        })
        .join("\n\n")}`;
    }

    // Sub 40% conversion
    if (lowerQuery.includes("40%") || (lowerQuery.includes("reply") && lowerQuery.includes("meeting"))) {
      const lowConversion = classifications.filter((c) => c.metrics.conversionRate < 40);
      
      if (lowConversion.length === 0) {
        return "✅ All clients have 40%+ positive reply to meeting ratio!";
      }
      
      return `⚠️ **${lowConversion.length} clients with sub 40% positive reply to meeting ratio:**\n\n${lowConversion
        .map((c) => `• **${c.clientName}** - ${formatPercentage(c.metrics.conversionRate)} conversion rate\n  ${c.metrics.opportunities} opportunities from ${c.metrics.positiveReplies} positive replies`)
        .join("\n\n")}\n\n📌 **Recommended action:** Review price, info, and meeting req subsequences. Keep pricing simple and quote lowest packages.`;
    }

    // Disconnected inboxes or sending errors
    if (lowerQuery.includes("disconnect") || lowerQuery.includes("sending error") || lowerQuery.includes("inbox")) {
      const disconnected = mockAccounts.filter(a => a.status === 'disconnected');
      const sendingErrors = mockAccounts.filter(a => a.sendingError);
      
      if (disconnected.length === 0 && sendingErrors.length === 0) {
        return "✅ None - All inboxes are connected and sending normally.";
      }
      
      // Group by tags
      const issuesByTag: Record<string, { disconnected: number; errors: number }> = {};
      
      [...disconnected, ...sendingErrors].forEach((acc) => {
        acc.tags?.forEach((tag) => {
          if (!issuesByTag[tag]) {
            issuesByTag[tag] = { disconnected: 0, errors: 0 };
          }
          if (acc.status === 'disconnected') {
            issuesByTag[tag].disconnected++;
          }
          if (acc.sendingError) {
            issuesByTag[tag].errors++;
          }
        });
      });
      
      return `⚠️ **Inbox Issues Found:**\n
**Disconnected inboxes:** ${disconnected.length}
${disconnected.map(a => `  • ${a.email} (${a.clientName})`).join("\n")}

**Sending errors:** ${sendingErrors.length}
${sendingErrors.map(a => `  • ${a.email} - ${a.errorMessage || "Error"}`).join("\n")}

**Issues by tag:**
${Object.entries(issuesByTag)
  .map(([tag, counts]) => `• **${tag}**: ${counts.disconnected} disconnected, ${counts.errors} errors`)
  .join("\n")}`;
    }

    // Reply rates trending down
    if (lowerQuery.includes("trending") || lowerQuery.includes("downward") || lowerQuery.includes("trend")) {
      const declining = trends.clients.filter(c => c.trend === "declining");
      
      if (declining.length === 0) {
        return "✅ No clients have declining reply rates! All trends are stable or improving.";
      }
      
      return `⚠️ **Yes, ${declining.length} clients have declining reply rates:**\n\n${declining
        .map((c) => `• **${c.name}**: ${c.replyRate.toFixed(2)}% (${c.change.toFixed(1)}% vs last week)`)
        .join("\n")}\n\n📌 **Action to resolve reply rate dip:**
1. **Check inbox health** - Low health inboxes hurt deliverability
2. **Trim down bad variants** - Remove underperforming copy
3. **Check if targeting is too broad** - Narrow down lists
4. **Review copy checklist:**
   - First line 12 words max
   - Subject line 3 words max + company name
   - 3-4 sentences max
   - "Open to learning more?" CTA
   - Sub 80 words total
   
Refer to "Diagnosing Poor Performing Campaigns" doc for detailed diagnosis.`;
    }

    // Tasks done today
    if (lowerQuery.includes("tasks done") || lowerQuery.includes("summary") && lowerQuery.includes("task")) {
      const completedToday = [...daily, ...weekly].filter(t => t.completed);
      
      if (completedToday.length === 0) {
        return "📋 No tasks have been marked as completed today yet.\n\nPending tasks:\n" + 
          daily.slice(0, 5).map(t => `• ${t.clientName}: ${t.title}`).join("\n");
      }
      
      // Group by client
      const byClient: Record<string, string[]> = {};
      completedToday.forEach(t => {
        if (!byClient[t.clientName]) byClient[t.clientName] = [];
        byClient[t.clientName].push(t.title);
      });
      
      return `📋 **Summary of tasks completed today:**\n\n${Object.entries(byClient)
        .map(([client, tasks]) => `**${client}:**\n${tasks.map(t => `  • ${t}`).join("\n")}`)
        .join("\n\n")}`;
    }

    // Client attention queries
    if (lowerQuery.includes("attention") || lowerQuery.includes("today") || lowerQuery.includes("need")) {
      const needsAttention = classifications.filter(
        (c) => c.severity === "critical" || c.severity === "high"
      );
      if (needsAttention.length === 0) {
        return "🎉 Great news! All clients are performing well. No critical issues detected.";
      }
      return `📋 **${needsAttention.length} clients need attention:**\n\n${needsAttention
        .map((c) => `• **${c.clientName}** - ${BUCKET_CONFIGS[c.bucket].icon} ${BUCKET_CONFIGS[c.bucket].label} (${c.severity})\n  _${c.reason}_`)
        .join("\n\n")}`;
    }

    // Low reply rate queries
    if (lowerQuery.includes("low reply") || lowerQuery.includes("reply rate")) {
      const lowReply = classifications.filter((c) => c.metrics.replyRate < 0.45);
      if (lowReply.length === 0) {
        return "✅ All clients are above the 0.45% reply rate threshold!";
      }
      return `📉 **${lowReply.length} clients with low reply rates:**\n\n${lowReply
        .map((c) => `• **${c.clientName}** - ${formatPercentage(c.metrics.replyRate)} reply rate\n  Sent: ${formatNumber(c.metrics.totalSent)} | Replies: ${c.metrics.totalReplies}`)
        .join("\n\n")}`;
    }

    // Portfolio health
    if (lowerQuery.includes("portfolio") || lowerQuery.includes("health") || lowerQuery.includes("summary")) {
      return `📊 **Portfolio Health Summary:**\n
• **Total Clients:** ${metrics.totalClients}
• **Active Clients:** ${metrics.activeClients}
• **Average Reply Rate:** ${formatPercentage(metrics.avgReplyRate)}
• **Average Conversion:** ${formatPercentage(metrics.avgConversionRate)}
• **Total Opportunities:** ${metrics.totalOpportunities}
• **Active Inboxes:** ${metrics.activeInboxes}
• **Avg Inbox Health:** ${metrics.avgInboxHealth}%

📌 **Issue Distribution:**
${Object.entries(
  classifications.reduce((acc, c) => {
    acc[c.bucket] = (acc[c.bucket] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
)
  .map(([bucket, count]) => `• ${BUCKET_CONFIGS[bucket as keyof typeof BUCKET_CONFIGS]?.icon || ""} ${bucket.replace(/_/g, " ")}: ${count}`)
  .join("\n")}`;
    }

    // Best conversion
    if (lowerQuery.includes("best") && lowerQuery.includes("conversion")) {
      const sorted = [...classifications]
        .filter((c) => c.metrics.totalReplies > 10)
        .sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate);
      const top3 = sorted.slice(0, 3);
      return `🏆 **Top 3 Clients by Conversion Rate:**\n\n${top3
        .map((c, i) => `${i + 1}. **${c.clientName}** - ${formatPercentage(c.metrics.conversionRate)}\n   ${c.metrics.opportunities} opportunities from ${c.metrics.totalReplies} replies`)
        .join("\n\n")}`;
    }

    // Tasks due
    if (lowerQuery.includes("task") || lowerQuery.includes("due")) {
      const allPending = [...daily, ...weekly].filter((t) => !t.completed);
      const critical = allPending.filter((t) => t.severity === "critical");
      return `📝 **Task Summary:**\n
• **Total Pending:** ${allPending.length}
• **Critical Tasks:** ${critical.length}
• **Daily Tasks:** ${daily.filter((t) => !t.completed).length}
• **Weekly Tasks:** ${weekly.filter((t) => !t.completed).length}

${critical.length > 0 ? `⚠️ **Critical Tasks:**\n${critical.map((t) => `• ${t.title} (${t.clientName})`).join("\n")}` : ""}`;
    }

    // Low leads
    if (lowerQuery.includes("leads") || lowerQuery.includes("volume")) {
      const lowLeads = classifications.filter((c) => c.bucket === "VOLUME_ISSUE");
      if (lowLeads.length === 0) {
        return "✅ All clients have sufficient leads. No volume issues detected.";
      }
      return `📉 **${lowLeads.length} clients running low on leads:**\n\n${lowLeads
        .map((c) => `• **${c.clientName}** - ${formatNumber(c.metrics.uncontactedLeads)} leads remaining\n  ${c.severity} priority`)
        .join("\n\n")}`;
    }

    // Compare performance
    if (lowerQuery.includes("compare") || lowerQuery.includes("performance")) {
      const sorted = [...classifications]
        .filter((c) => c.metrics.totalSent > 10000)
        .sort((a, b) => b.metrics.replyRate - a.metrics.replyRate);
      return `📊 **Client Performance Comparison:**\n\n| Client | Reply Rate | Conversion | Opportunities |\n|--------|------------|------------|---------------|\n${sorted
        .map((c) => `| ${c.clientName} | ${formatPercentage(c.metrics.replyRate)} | ${formatPercentage(c.metrics.conversionRate)} | ${c.metrics.opportunities} |`)
        .join("\n")}`;
    }

    // Default response
    return `I understand you're asking about "${query}". Here are some things I can help you with:\n
• Client status and classifications
• Reply rates and conversion metrics
• Deliverability and inbox health
• Task management and priorities
• Portfolio performance trends

Click the **?** button next to "AI-Powered" to see all available commands.`;
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Try to use Claude API first
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content }),
      });

      let assistantContent: string;

      if (response.ok) {
        const data = await response.json();
        assistantContent = data.response || processQuery(userMessage.content);
      } else {
        // Fallback to local processing if API fails
        console.warn('Claude API unavailable, using local processing');
        assistantContent = processQuery(userMessage.content);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Terminal error:', error);
      // Fallback to local processing
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: processQuery(userMessage.content),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Terminal className="h-6 w-6 text-primary" />
            Query Terminal
          </h1>
          <p className="text-muted-foreground">
            Ask natural language questions about your campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-primary border-primary/50">
            <Sparkles className="h-3 w-3" />
            Claude AI
          </Badge>
          <Dialog open={showCommands} onOpenChange={setShowCommands}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Available Query Commands
                </DialogTitle>
                <DialogDescription>
                  Click on any query to use it in the terminal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {Object.entries(COMMAND_QUERIES).map(([category, queries]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      {category === "Client Performance" && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                      {category === "Conversion & Meetings" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                      {category === "Inbox Health" && <Mail className="h-4 w-4 text-purple-400" />}
                      {category === "Trends & Analytics" && <TrendingDown className="h-4 w-4 text-blue-400" />}
                      {category === "Tasks & Actions" && <List className="h-4 w-4 text-orange-400" />}
                      {category === "Volume & Leads" && <XCircle className="h-4 w-4 text-red-400" />}
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {queries.map((query) => (
                        <Button
                          key={query}
                          variant="ghost"
                          className="w-full justify-start text-left text-sm h-auto py-2 px-3"
                          onClick={() => {
                            setInput(query);
                            setShowCommands(false);
                            inputRef.current?.focus();
                          }}
                        >
                          <ChevronRight className="mr-2 h-3 w-3 flex-shrink-0" />
                          <span className="text-muted-foreground">{query}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col border-border bg-card overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.type === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-3",
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content.split("\n").map((line, i) => (
                      <p key={i} className={line.startsWith("•") ? "ml-2" : ""}>
                        {line.replace(/\*\*(.*?)\*\*/g, "$1")}
                      </p>
                    ))}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-xs",
                      message.type === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Suggestions */}
        {messages.length === 1 && (
          <div className="border-t border-border p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Quick queries:
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestion(suggestion)}
                  className="h-auto py-1.5 text-xs"
                >
                  <ChevronRight className="mr-1 h-3 w-3" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about clients, campaigns, tasks..."
              className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={1}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line • Click ? for all commands
          </p>
        </div>
      </Card>
    </div>
  );
}
