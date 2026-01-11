"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getMockClassifications, getMockTasks, getMockWeeklyTrends, mockCampaigns, mockAccounts } from "@/lib/mock-data";
import { BUCKET_CONFIGS } from "@/types/analysis";
import { BENCHMARKS } from "@/lib/engine/benchmarks";
import { formatNumber, formatPercentage, calculateHealthScore } from "@/lib/utils";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Mail,
  Target,
  Users,
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  BarChart3,
  Clock,
  Calendar,
  Zap,
  CalendarDays,
} from "lucide-react";

type TimePeriod = "day" | "week" | "month" | "lifetime";

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  lifetime: "Lifetime",
};

const TIME_PERIOD_MULTIPLIERS: Record<TimePeriod, number> = {
  day: 0.02,
  week: 0.1,
  month: 0.3,
  lifetime: 1,
};
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("lifetime");

  const classifications = getMockClassifications();
  const allTasks = getMockTasks();
  const weeklyTrends = getMockWeeklyTrends();

  const client = useMemo(() => {
    return classifications.find((c) => c.clientId === clientId);
  }, [classifications, clientId]);

  const clientCampaigns = useMemo(() => {
    return mockCampaigns.filter((c) => c.clientName === client?.clientName);
  }, [client?.clientName]);

  const clientAccounts = useMemo(() => {
    return mockAccounts.filter((a) => a.clientName === client?.clientName);
  }, [client?.clientName]);

  const clientTasks = useMemo(() => {
    return {
      daily: allTasks.daily.filter((t) => t.clientName === client?.clientName),
      weekly: allTasks.weekly.filter((t) => t.clientName === client?.clientName),
    };
  }, [allTasks, client?.clientName]);

  const clientTrend = useMemo(() => {
    return weeklyTrends.clients.find((c) => c.name === client?.clientName);
  }, [weeklyTrends.clients, client?.clientName]);

  // Calculate period-specific metrics
  const multiplier = TIME_PERIOD_MULTIPLIERS[timePeriod];
  
  const periodMetrics = useMemo(() => {
    if (!client) return null;
    
    const totalSent = Math.round(client.metrics.totalSent * multiplier);
    const totalReplies = Math.round(client.metrics.totalReplies * multiplier);
    const positiveReplies = Math.round(client.metrics.positiveReplies * multiplier);
    const opportunities = Math.round(client.metrics.opportunities * multiplier);
    
    return {
      totalSent,
      totalReplies,
      positiveReplies,
      opportunities,
      replyRate: totalSent > 0 ? (totalReplies / totalSent) * 100 : 0,
      conversionRate: positiveReplies > 0 ? (opportunities / positiveReplies) * 100 : 0,
      // Keep lifetime for reference
      lifetimeSent: client.metrics.totalSent,
      lifetimeReplies: client.metrics.totalReplies,
      lifetimeOpportunities: client.metrics.opportunities,
    };
  }, [client, multiplier]);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Users className="mb-4 h-16 w-16 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold text-foreground">Client Not Found</h1>
        <p className="mb-4 text-muted-foreground">The client you're looking for doesn't exist.</p>
        <Button onClick={() => router.push("/campaign-manager/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const config = BUCKET_CONFIGS[client.bucket];
  const healthScore = calculateHealthScore({
    replyRate: client.metrics.replyRate,
    conversionRate: client.metrics.conversionRate,
    avgInboxHealth: client.metrics.avgInboxHealth,
    uncontactedLeads: client.metrics.uncontactedLeads,
  });

  // Benchmark comparisons - use period metrics
  const benchmarkComparisons = useMemo(() => {
    if (!periodMetrics) return [];
    
    return [
      {
        label: "Reply Rate",
        value: periodMetrics.replyRate,
        benchmark: BENCHMARKS.GOOD_REPLY_RATE,
        criticalBenchmark: BENCHMARKS.CRITICAL_REPLY_RATE,
        unit: "%",
        isPercentage: true,
      },
      {
        label: "Conversion Rate",
        value: periodMetrics.conversionRate,
        benchmark: BENCHMARKS.TARGET_CONVERSION,
        criticalBenchmark: BENCHMARKS.CRITICAL_CONVERSION,
        unit: "%",
        isPercentage: true,
      },
      {
        label: "Emails Sent",
        value: periodMetrics.totalSent,
        benchmark: timePeriod === "lifetime" ? 50000 : timePeriod === "month" ? 15000 : timePeriod === "week" ? 5000 : 700,
        criticalBenchmark: timePeriod === "lifetime" ? 10000 : timePeriod === "month" ? 3000 : timePeriod === "week" ? 1000 : 100,
        unit: "",
        isPercentage: false,
      },
      {
        label: "Opportunities",
        value: periodMetrics.opportunities,
        benchmark: timePeriod === "lifetime" ? 50 : timePeriod === "month" ? 15 : timePeriod === "week" ? 4 : 1,
        criticalBenchmark: timePeriod === "lifetime" ? 10 : timePeriod === "month" ? 3 : timePeriod === "week" ? 1 : 0,
        unit: "",
        isPercentage: false,
      },
    ];
  }, [periodMetrics, timePeriod]);

  // Historical data based on time period
  const historicalData = useMemo(() => {
    if (!client) return [];
    
    const baseRate = client.metrics.replyRate;
    
    if (timePeriod === "day") {
      return Array.from({ length: 8 }, (_, i) => ({
        label: `${(i + 9)}:00`,
        replyRate: Number((baseRate * (0.7 + Math.random() * 0.6)).toFixed(2)),
        sent: Math.round(client.metrics.totalSent * 0.02 / 8),
      }));
    } else if (timePeriod === "week") {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
        label: day,
        replyRate: Number((baseRate * (0.8 + i * 0.03)).toFixed(2)),
        sent: Math.round(client.metrics.totalSent * 0.1 / 7),
      }));
    } else if (timePeriod === "month") {
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, i) => ({
        label: week,
        replyRate: Number((baseRate * (0.85 + i * 0.05)).toFixed(2)),
        sent: Math.round(client.metrics.totalSent * 0.3 / 4),
      }));
    } else {
      return [
        { label: "W1", replyRate: Number((baseRate * 0.8).toFixed(2)), sent: Math.round(client.metrics.totalSent * 0.15) },
        { label: "W2", replyRate: Number((baseRate * 0.85).toFixed(2)), sent: Math.round(client.metrics.totalSent * 0.2) },
        { label: "W3", replyRate: Number((baseRate * 0.9).toFixed(2)), sent: Math.round(client.metrics.totalSent * 0.25) },
        { label: "W4", replyRate: Number((baseRate * 0.95).toFixed(2)), sent: Math.round(client.metrics.totalSent * 0.2) },
        { label: "W5", replyRate: Number(baseRate.toFixed(2)), sent: Math.round(client.metrics.totalSent * 0.2) },
      ];
    }
  }, [client, timePeriod]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/campaign-manager/clients")}
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{client.clientName}</h1>
              <Badge className={cn("gap-1", config.color, config.bgColor)}>
                {config.icon} {config.label}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{client.reason}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div className="flex rounded-lg border border-border bg-muted/30 p-1">
              {(Object.keys(TIME_PERIOD_LABELS) as TimePeriod[]).map((period) => (
                <Button
                  key={period}
                  variant={timePeriod === period ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimePeriod(period)}
                  className={cn(
                    "h-7 px-3 text-xs",
                    timePeriod === period && "bg-primary text-primary-foreground"
                  )}
                >
                  {TIME_PERIOD_LABELS[period]}
                </Button>
              ))}
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View in Instantly
          </Button>
        </div>
      </div>

      {/* Active Period Badge */}
      <Badge variant="secondary" className="gap-2 px-3 py-1.5 text-sm">
        <CalendarDays className="h-3 w-3" />
        {TIME_PERIOD_LABELS[timePeriod]}
      </Badge>

      {/* Health Score & Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className={cn("border-border", config.borderColor)}>
          <CardContent className="p-4">
            <div className="mb-2 text-sm text-muted-foreground">Health Score</div>
            <div className={cn(
              "text-3xl font-bold",
              healthScore >= 70 ? "text-green-400" : healthScore >= 40 ? "text-yellow-400" : "text-red-400"
            )}>
              {healthScore}%
            </div>
            <Progress
              value={healthScore}
              className="mt-2 h-2"
              indicatorClassName={cn(
                healthScore >= 70 ? "bg-green-500" : healthScore >= 40 ? "bg-yellow-500" : "bg-red-500"
              )}
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Send className="h-4 w-4 text-blue-400" />
              Emails Sent
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {formatNumber(periodMetrics?.totalSent || 0)}
            </div>
            {timePeriod !== "lifetime" && (
              <div className="text-xs text-muted-foreground">
                Lifetime: {formatNumber(periodMetrics?.lifetimeSent || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4 text-green-400" />
              Reply Rate
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPercentage(periodMetrics?.replyRate || 0)}
              </span>
              {clientTrend && (
                <span className={cn(
                  "flex items-center text-xs",
                  clientTrend.change > 0 ? "text-green-400" : clientTrend.change < 0 ? "text-red-400" : "text-muted-foreground"
                )}>
                  {clientTrend.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {clientTrend.change > 0 && "+"}{clientTrend.change.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {periodMetrics?.totalReplies || 0} total replies
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4 text-purple-400" />
              Opportunities
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {periodMetrics?.opportunities || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatPercentage(periodMetrics?.conversionRate || 0)} conversion
            </div>
            {timePeriod !== "lifetime" && (
              <div className="text-xs text-muted-foreground">
                Lifetime: {periodMetrics?.lifetimeOpportunities || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-yellow-400" />
              Leads Remaining
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {formatNumber(client.metrics.uncontactedLeads)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns ({clientCampaigns.length})</TabsTrigger>
          <TabsTrigger value="inboxes">Inboxes ({clientAccounts.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({clientTasks.daily.length + clientTasks.weekly.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Reply Rate Trend */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Reply Rate Trend
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {TIME_PERIOD_LABELS[timePeriod]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="label" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="replyRate"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: "#22c55e" }}
                        name="Reply Rate %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Performance Summary
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {TIME_PERIOD_LABELS[timePeriod]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Total Replies</div>
                    <div className="text-xl font-bold text-foreground">{periodMetrics?.totalReplies || 0}</div>
                    {timePeriod !== "lifetime" && (
                      <div className="text-xs text-muted-foreground">Lifetime: {client.metrics.totalReplies}</div>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Positive Replies</div>
                    <div className="text-xl font-bold text-foreground">{periodMetrics?.positiveReplies || 0}</div>
                    {timePeriod !== "lifetime" && (
                      <div className="text-xs text-muted-foreground">Lifetime: {client.metrics.positiveReplies}</div>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Active Campaigns</div>
                    <div className="text-xl font-bold text-foreground">{client.metrics.activeCampaigns}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Active Inboxes</div>
                    <div className="text-xl font-bold text-foreground">{client.metrics.activeInboxes}</div>
                  </div>
                </div>

                {/* Classification Reason */}
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    Classification Reason
                  </div>
                  <p className="text-sm text-muted-foreground">{client.reason}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                Benchmark Comparison
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {TIME_PERIOD_LABELS[timePeriod]}
                </Badge>
              </CardTitle>
              <CardDescription>How this client performs against target benchmarks for {TIME_PERIOD_LABELS[timePeriod].toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {benchmarkComparisons.map((item) => {
                  const isAboveBenchmark = item.value >= item.benchmark;
                  const isCritical = item.value < item.criticalBenchmark;
                  
                  const displayValue = item.isPercentage ? item.value.toFixed(2) : formatNumber(item.value);
                  const displayBenchmark = item.isPercentage ? item.benchmark : formatNumber(item.benchmark);
                  
                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-lg font-bold",
                            isAboveBenchmark ? "text-green-400" : isCritical ? "text-red-400" : "text-yellow-400"
                          )}>
                            {displayValue}{item.unit}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            / {displayBenchmark}{item.unit} target
                          </span>
                          {isAboveBenchmark ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : isCritical ? (
                            <XCircle className="h-4 w-4 text-red-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                      </div>
                      <Progress
                        value={Math.min((item.value / item.benchmark) * 100, 100)}
                        className="h-2"
                        indicatorClassName={cn(
                          isAboveBenchmark ? "bg-green-500" : isCritical ? "bg-red-500" : "bg-yellow-500"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {clientCampaigns.map((campaign) => (
              <Card key={campaign.id} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{campaign.name}</h3>
                      <Badge variant={campaign.status === "active" ? "success" : "secondary"} className="mt-1">
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Sent</div>
                      <div className="font-medium text-foreground">{formatNumber(campaign.sent)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Replies</div>
                      <div className="font-medium text-foreground">{campaign.replied}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Opps</div>
                      <div className="font-medium text-foreground">{campaign.opportunities}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inboxes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientAccounts.map((account) => (
              <Card 
                key={account.id} 
                className={cn(
                  "border-border bg-card",
                  account.status === "disconnected" && "border-red-500/30"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      account.status === "disconnected" ? "bg-red-500/20" :
                      account.healthScore >= 93 ? "bg-green-500/20" : "bg-yellow-500/20"
                    )}>
                      {account.status === "disconnected" ? (
                        <XCircle className="h-5 w-5 text-red-400" />
                      ) : account.healthScore >= 93 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <Zap className="h-5 w-5 text-yellow-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{account.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {account.status === "connected" ? `${account.healthScore}% health` : "Disconnected"}
                      </div>
                    </div>
                  </div>
                  {account.status === "connected" && (
                    <div className="mt-3">
                      <Progress value={account.healthScore} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {clientTasks.daily.length === 0 && clientTasks.weekly.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="mb-3 h-12 w-12 text-green-400" />
                <p className="text-lg font-medium text-foreground">No pending tasks</p>
                <p className="text-sm text-muted-foreground">This client has no outstanding tasks</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {clientTasks.daily.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Daily Tasks
                  </h3>
                  <div className="space-y-2">
                    {clientTasks.daily.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="font-medium text-foreground">{task.title}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {clientTasks.weekly.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Weekly Tasks
                  </h3>
                  <div className="space-y-2">
                    {clientTasks.weekly.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="font-medium text-foreground">{task.title}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
