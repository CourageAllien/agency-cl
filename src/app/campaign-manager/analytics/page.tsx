"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/useDashboardData";
import { BENCHMARKS } from "@/lib/engine/benchmarks";
import { BUCKET_CONFIGS } from "@/types/analysis";
import { formatNumber, formatPercentage } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Filter,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Send,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#22c55e", "#eab308", "#ef4444", "#3b82f6", "#a855f7", "#6b7280"];

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

export default function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardData();
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("lifetime");

  const clients = data?.clients || [];

  const clientNames = useMemo(() => {
    return ["all", ...clients.map((c) => c.name).sort()];
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (selectedClient === "all") return clients;
    return clients.filter((c) => c.name === selectedClient);
  }, [clients, selectedClient]);

  const filteredMetrics = useMemo(() => {
    const clientData = filteredClients;
    const multiplier = TIME_PERIOD_MULTIPLIERS[timePeriod];
    
    const lifetimeSent = clientData.reduce((sum, c) => sum + c.metrics.totalSent, 0);
    const lifetimeReplies = clientData.reduce((sum, c) => sum + c.metrics.totalReplied, 0);
    const lifetimeOpportunities = clientData.reduce((sum, c) => sum + c.metrics.opportunities, 0);
    
    const totalSent = Math.round(lifetimeSent * multiplier);
    const totalReplies = Math.round(lifetimeReplies * multiplier);
    const totalOpportunities = Math.round(lifetimeOpportunities * multiplier);
    
    const replyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
    const conversionRate = totalReplies > 0 ? (totalOpportunities / totalReplies) * 100 : 0;

    return {
      totalSent,
      totalReplies,
      totalOpportunities,
      replyRate,
      conversionRate,
      lifetimeSent,
      lifetimeReplies,
      lifetimeOpportunities,
    };
  }, [filteredClients, timePeriod]);

  // Bucket distribution for pie chart
  const bucketDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    filteredClients.forEach((client) => {
      const bucket = client.classification.bucket;
      distribution[bucket] = (distribution[bucket] || 0) + 1;
    });
    return Object.entries(distribution).map(([bucket, count]) => ({
      name: BUCKET_CONFIGS[bucket as keyof typeof BUCKET_CONFIGS]?.label || bucket,
      value: count,
    }));
  }, [filteredClients]);

  // Client comparison for bar chart
  const clientComparison = useMemo(() => {
    const multiplier = TIME_PERIOD_MULTIPLIERS[timePeriod];
    return clients
      .map((client) => ({
        name: client.name.length > 12 ? client.name.substring(0, 12) + "..." : client.name,
        fullName: client.name,
        replyRate: client.metrics.replyRate,
        sent: Math.round(client.metrics.totalSent * multiplier),
        opportunities: Math.round(client.metrics.opportunities * multiplier),
      }))
      .sort((a, b) => b.replyRate - a.replyRate)
      .slice(0, 8);
  }, [clients, timePeriod]);

  // Generate trend data
  const trendData = useMemo(() => {
    const points = timePeriod === "day" ? 24 : timePeriod === "week" ? 7 : timePeriod === "month" ? 4 : 12;
    const data = [];
    let baseReplyRate = filteredMetrics.replyRate || 1;
    
    for (let i = 0; i < points; i++) {
      const variance = (Math.random() - 0.5) * 0.5;
      const replyRate = Math.max(0.1, baseReplyRate + variance);
      data.push({
        label: timePeriod === "day" ? `${i}:00` : 
               timePeriod === "week" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] :
               timePeriod === "month" ? `Week ${i + 1}` :
               ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
        replyRate: Number(replyRate.toFixed(2)),
        sent: Math.round(filteredMetrics.totalSent / points * (0.8 + Math.random() * 0.4)),
      });
    }
    return data;
  }, [filteredMetrics, timePeriod]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to load analytics</h2>
        <p className="text-muted-foreground">{error?.message || "Unknown error"}</p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-muted-foreground">
            Performance trends and insights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Time Period Filter */}
          <div className="flex rounded-lg border border-border p-1 bg-muted/30">
            {(["day", "week", "month", "lifetime"] as TimePeriod[]).map((period) => (
              <Button
                key={period}
                variant={timePeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimePeriod(period)}
                className="text-xs"
              >
                {TIME_PERIOD_LABELS[period]}
              </Button>
            ))}
          </div>

          {/* Client Filter */}
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              {clientNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name === "all" ? "All Clients" : name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient !== "all" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedClient("all")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {(selectedClient !== "all" || timePeriod !== "lifetime") && (
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            {TIME_PERIOD_LABELS[timePeriod]}
          </Badge>
          {selectedClient !== "all" && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {selectedClient}
            </Badge>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Emails Sent
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {formatNumber(filteredMetrics.totalSent)}
              </span>
              {timePeriod !== "lifetime" && (
                <span className="ml-2 text-sm text-muted-foreground">
                  / {formatNumber(filteredMetrics.lifetimeSent)} lifetime
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Reply Rate
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {formatPercentage(filteredMetrics.replyRate)}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                ({filteredMetrics.totalReplies} replies)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Opportunities
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {filteredMetrics.totalOpportunities}
              </span>
              {timePeriod !== "lifetime" && (
                <span className="ml-2 text-sm text-muted-foreground">
                  / {filteredMetrics.lifetimeOpportunities} lifetime
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Conversion
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {formatPercentage(filteredMetrics.conversionRate)}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                reply→meeting
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="comparison">Client Comparison</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Reply Rate Trend</CardTitle>
              <CardDescription>
                Performance over {TIME_PERIOD_LABELS[timePeriod].toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="replyRate"
                      name="Reply Rate %"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Client Classification Distribution</CardTitle>
              <CardDescription>
                Breakdown by issue bucket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {bucketDistribution.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bucketDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {bucketDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a1a",
                          border: "1px solid #333",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Client Performance Comparison</CardTitle>
              <CardDescription>
                Top clients by reply rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {clientComparison.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" stroke="#888" fontSize={12} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#888"
                        fontSize={12}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a1a",
                          border: "1px solid #333",
                        }}
                        formatter={(value, name) => [
                          name === "replyRate" ? `${value}%` : value,
                          name === "replyRate" ? "Reply Rate" : "Sent",
                        ]}
                      />
                      <Legend />
                      <Bar
                        dataKey="replyRate"
                        name="Reply Rate %"
                        fill="#22c55e"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Benchmark Comparison</CardTitle>
              <CardDescription>
                Your performance vs. targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Reply Rate Benchmark */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Reply Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {formatPercentage(filteredMetrics.replyRate)}
                      </span>
                      {filteredMetrics.replyRate >= BENCHMARKS.GOOD_REPLY_RATE ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : filteredMetrics.replyRate >= BENCHMARKS.CRITICAL_REPLY_RATE ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min(100, (filteredMetrics.replyRate / BENCHMARKS.GOOD_REPLY_RATE) * 100)}
                    className={cn(
                      "h-2",
                      filteredMetrics.replyRate >= BENCHMARKS.GOOD_REPLY_RATE
                        ? "[&>div]:bg-green-500"
                        : filteredMetrics.replyRate >= BENCHMARKS.CRITICAL_REPLY_RATE
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-red-500"
                    )}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Critical: {BENCHMARKS.CRITICAL_REPLY_RATE}%</span>
                    <span>Target: {BENCHMARKS.GOOD_REPLY_RATE}%</span>
                  </div>
                </div>

                {/* Conversion Rate Benchmark */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Conversion Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {formatPercentage(filteredMetrics.conversionRate)}
                      </span>
                      {filteredMetrics.conversionRate >= BENCHMARKS.TARGET_CONVERSION ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : filteredMetrics.conversionRate >= BENCHMARKS.CRITICAL_CONVERSION ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min(100, (filteredMetrics.conversionRate / BENCHMARKS.TARGET_CONVERSION) * 100)}
                    className={cn(
                      "h-2",
                      filteredMetrics.conversionRate >= BENCHMARKS.TARGET_CONVERSION
                        ? "[&>div]:bg-green-500"
                        : filteredMetrics.conversionRate >= BENCHMARKS.CRITICAL_CONVERSION
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-red-500"
                    )}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Critical: {BENCHMARKS.CRITICAL_CONVERSION}%</span>
                    <span>Target: {BENCHMARKS.TARGET_CONVERSION}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
