"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getMockClassifications,
  getMockPortfolioMetrics,
  getMockHistoricalData,
  getMockWeeklyTrends,
} from "@/lib/mock-data";
import { BENCHMARKS } from "@/lib/engine/benchmarks";
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

// Multipliers to simulate different time periods (in a real app, this would come from the API)
const TIME_PERIOD_MULTIPLIERS: Record<TimePeriod, number> = {
  day: 0.02,      // ~2% of lifetime
  week: 0.1,      // ~10% of lifetime
  month: 0.3,     // ~30% of lifetime
  lifetime: 1,    // 100%
};

export default function AnalyticsPage() {
  const classifications = getMockClassifications();
  const metrics = getMockPortfolioMetrics();
  const historical = getMockHistoricalData();
  const trends = getMockWeeklyTrends();

  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("lifetime");

  const clientNames = useMemo(() => {
    return ["all", ...classifications.map((c) => c.clientName).sort()];
  }, [classifications]);

  const filteredClassifications = useMemo(() => {
    if (selectedClient === "all") return classifications;
    return classifications.filter((c) => c.clientName === selectedClient);
  }, [classifications, selectedClient]);

  const filteredMetrics = useMemo(() => {
    const data = filteredClassifications;
    const multiplier = TIME_PERIOD_MULTIPLIERS[timePeriod];
    
    // Calculate totals based on time period
    const lifetimeSent = data.reduce((sum, c) => sum + c.metrics.totalSent, 0);
    const lifetimeReplies = data.reduce((sum, c) => sum + c.metrics.totalReplies, 0);
    const lifetimePositiveReplies = data.reduce((sum, c) => sum + c.metrics.positiveReplies, 0);
    const lifetimeOpportunities = data.reduce((sum, c) => sum + c.metrics.opportunities, 0);
    
    // Apply multiplier for time period (simulated - in real app would come from API)
    const totalSent = Math.round(lifetimeSent * multiplier);
    const totalReplies = Math.round(lifetimeReplies * multiplier);
    const positiveReplies = Math.round(lifetimePositiveReplies * multiplier);
    const totalOpportunities = Math.round(lifetimeOpportunities * multiplier);
    
    // Calculate rates from the period data
    const replyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
    const conversionRate = positiveReplies > 0 ? (totalOpportunities / positiveReplies) * 100 : 0;

    return {
      totalClients: data.length,
      activeClients: data.filter(c => c.bucket !== 'TOO_EARLY' && c.bucket !== 'NOT_VIABLE').length,
      totalSent,
      totalReplies,
      positiveReplies,
      replyRate,
      totalOpportunities,
      conversionRate,
      // Keep lifetime totals for reference
      lifetimeSent,
      lifetimeReplies,
      lifetimeOpportunities,
    };
  }, [filteredClassifications, timePeriod]);

  const selectedClientData = useMemo(() => {
    if (selectedClient === "all") return null;
    return classifications.find((c) => c.clientName === selectedClient);
  }, [classifications, selectedClient]);

  // Prepare chart data - all affected by time period
  const multiplier = TIME_PERIOD_MULTIPLIERS[timePeriod];

  const bucketDistribution = useMemo(() => {
    return Object.entries(
      filteredClassifications.reduce((acc, c) => {
        acc[c.bucket] = (acc[c.bucket] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  }, [filteredClassifications]);

  // Client comparison data - adjusted by time period
  const clientComparison = useMemo(() => {
    // Only apply minimum threshold when viewing all clients
    // When a specific client is selected, always show their data
    const isSpecificClientSelected = selectedClient !== "all";
    const minSent = isSpecificClientSelected ? 0 : 
                    timePeriod === "lifetime" ? 10000 : 
                    timePeriod === "month" ? 3000 : 
                    timePeriod === "week" ? 1000 : 200;
    
    return filteredClassifications
      .filter(c => c.metrics.totalSent * multiplier > minSent)
      .map((c) => {
        const periodSent = Math.round(c.metrics.totalSent * multiplier);
        const periodReplies = Math.round(c.metrics.totalReplies * multiplier);
        const periodPositiveReplies = Math.round(c.metrics.positiveReplies * multiplier);
        const periodOpportunities = Math.round(c.metrics.opportunities * multiplier);
        
        return {
          name: c.clientName,
          sent: periodSent,
          replies: periodReplies,
          replyRate: periodSent > 0 ? Number(((periodReplies / periodSent) * 100).toFixed(2)) : 0,
          conversionRate: periodPositiveReplies > 0 ? Number(((periodOpportunities / periodPositiveReplies) * 100).toFixed(2)) : 0,
          opportunities: periodOpportunities,
        };
      })
      .sort((a, b) => b.replyRate - a.replyRate);
  }, [filteredClassifications, multiplier, timePeriod, selectedClient]);

  // Trend data - show different granularity based on time period
  const trendData = useMemo(() => {
    if (timePeriod === "day") {
      // Hourly data for today
      return Array.from({ length: 12 }, (_, i) => ({
        label: `${(i + 8) % 12 || 12}${i + 8 < 12 ? 'am' : 'pm'}`,
        replyRate: Number((historical.replyRateTrend[historical.replyRateTrend.length - 1]?.value * (0.8 + Math.random() * 0.4)).toFixed(2)),
        opportunities: Math.round(historical.opportunitiesTrend[historical.opportunitiesTrend.length - 1]?.value * 0.02 * (0.5 + Math.random())),
      }));
    } else if (timePeriod === "week") {
      // Daily data for this week
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((day, i) => ({
        label: day,
        replyRate: Number((historical.replyRateTrend[historical.replyRateTrend.length - 7 + i]?.value || 1.2).toFixed(2)),
        opportunities: Math.round((historical.opportunitiesTrend[historical.opportunitiesTrend.length - 7 + i]?.value || 5) * 0.1),
      }));
    } else if (timePeriod === "month") {
      // Weekly data for this month
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, i) => ({
        label: week,
        replyRate: Number((historical.replyRateTrend[Math.min(i * 7, historical.replyRateTrend.length - 1)]?.value || 1.2).toFixed(2)),
        opportunities: Math.round(historical.opportunitiesTrend[Math.min(i * 7, historical.opportunitiesTrend.length - 1)]?.value * 0.25 || 10),
      }));
    } else {
      // Full historical data for lifetime
      return historical.replyRateTrend.map((d, i) => ({
        label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        replyRate: d.value,
        opportunities: historical.opportunitiesTrend[i]?.value || 0,
      }));
    }
  }, [historical, timePeriod]);

  const replyRateTrendData = trendData.map(d => ({
    date: d.label,
    value: d.replyRate,
    benchmark: BENCHMARKS.CRITICAL_REPLY_RATE,
  }));

  const opportunitiesTrendData = trendData.map(d => ({
    date: d.label,
    value: d.opportunities,
  }));

  // Benchmark comparisons for selected client - adjusted by time period
  const benchmarkComparisons = useMemo(() => {
    if (!selectedClientData) return [];
    
    // Calculate period-specific metrics
    const periodSent = Math.round(selectedClientData.metrics.totalSent * multiplier);
    const periodReplies = Math.round(selectedClientData.metrics.totalReplies * multiplier);
    const periodPositiveReplies = Math.round(selectedClientData.metrics.positiveReplies * multiplier);
    const periodOpportunities = Math.round(selectedClientData.metrics.opportunities * multiplier);
    
    const periodReplyRate = periodSent > 0 ? (periodReplies / periodSent) * 100 : 0;
    const periodConversionRate = periodPositiveReplies > 0 ? (periodOpportunities / periodPositiveReplies) * 100 : 0;
    
    return [
      {
        label: "Reply Rate",
        value: periodReplyRate,
        benchmark: BENCHMARKS.GOOD_REPLY_RATE,
        criticalBenchmark: BENCHMARKS.CRITICAL_REPLY_RATE,
        unit: "%",
        isPercentage: true,
        periodLabel: TIME_PERIOD_LABELS[timePeriod],
      },
      {
        label: "Conversion Rate",
        value: periodConversionRate,
        benchmark: BENCHMARKS.TARGET_CONVERSION,
        criticalBenchmark: BENCHMARKS.CRITICAL_CONVERSION,
        unit: "%",
        isPercentage: true,
        periodLabel: TIME_PERIOD_LABELS[timePeriod],
      },
      {
        label: "Emails Sent",
        value: periodSent,
        benchmark: timePeriod === "lifetime" ? 50000 : timePeriod === "month" ? 15000 : timePeriod === "week" ? 5000 : 700,
        criticalBenchmark: timePeriod === "lifetime" ? 10000 : timePeriod === "month" ? 3000 : timePeriod === "week" ? 1000 : 100,
        unit: "",
        isPercentage: false,
        periodLabel: TIME_PERIOD_LABELS[timePeriod],
      },
      {
        label: "Opportunities",
        value: periodOpportunities,
        benchmark: timePeriod === "lifetime" ? 50 : timePeriod === "month" ? 15 : timePeriod === "week" ? 4 : 1,
        criticalBenchmark: timePeriod === "lifetime" ? 10 : timePeriod === "month" ? 3 : timePeriod === "week" ? 1 : 0,
        unit: "",
        isPercentage: false,
        periodLabel: TIME_PERIOD_LABELS[timePeriod],
      },
    ];
  }, [selectedClientData, multiplier, timePeriod]);

  // Client historical data - adjusted by time period
  const clientHistoricalData = useMemo(() => {
    if (!selectedClientData) return [];
    
    const baseRate = selectedClientData.metrics.replyRate;
    
    if (timePeriod === "day") {
      return Array.from({ length: 8 }, (_, i) => ({
        label: `${(i + 9)}:00`,
        replyRate: Number((baseRate * (0.7 + Math.random() * 0.6)).toFixed(2)),
      }));
    } else if (timePeriod === "week") {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
        label: day,
        replyRate: Number((baseRate * (0.8 + i * 0.03 + Math.random() * 0.1)).toFixed(2)),
      }));
    } else if (timePeriod === "month") {
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, i) => ({
        label: week,
        replyRate: Number((baseRate * (0.85 + i * 0.05)).toFixed(2)),
      }));
    } else {
      return [
        { label: "W1", replyRate: Number((baseRate * 0.8).toFixed(2)) },
        { label: "W2", replyRate: Number((baseRate * 0.85).toFixed(2)) },
        { label: "W3", replyRate: Number((baseRate * 0.9).toFixed(2)) },
        { label: "W4", replyRate: Number((baseRate * 0.95).toFixed(2)) },
        { label: "W5", replyRate: Number(baseRate.toFixed(2)) },
      ];
    }
  }, [selectedClientData, timePeriod]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Portfolio performance trends and insights
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
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

          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[180px]">
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
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-2 px-3 py-1.5 text-sm">
          <Calendar className="h-3 w-3" />
          {TIME_PERIOD_LABELS[timePeriod]}
        </Badge>
        {selectedClient !== "all" && (
          <Badge variant="outline" className="gap-2 px-3 py-1.5 text-sm">
            <Users className="h-3 w-3" />
            {selectedClient}
          </Badge>
        )}
      </div>

      {/* KPI Cards - Exact Data */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(filteredMetrics.totalSent)}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-blue-400">
                  <Send className="h-3 w-3" />
                  <span>{TIME_PERIOD_LABELS[timePeriod]}</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                <Send className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Lifetime: {formatNumber(filteredMetrics.lifetimeSent)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Replies</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(filteredMetrics.totalReplies)}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-green-400">
                  <MessageSquare className="h-3 w-3" />
                  <span>{formatPercentage(filteredMetrics.replyRate)} rate</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <MessageSquare className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Positive: {formatNumber(filteredMetrics.positiveReplies)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opportunities</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(filteredMetrics.totalOpportunities)}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-purple-400">
                  <Target className="h-3 w-3" />
                  <span>{formatPercentage(filteredMetrics.conversionRate)} conv.</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
                <Target className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              From {formatNumber(filteredMetrics.positiveReplies)} positive replies
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold text-foreground">
                  {filteredMetrics.activeClients}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-yellow-400">
                  <Users className="h-3 w-3" />
                  <span>{filteredMetrics.totalClients} total</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
                <Users className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Excluding too early / not viable
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue={selectedClient !== "all" ? "benchmarks" : "trends"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison">Client Comparison</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="benchmarks">
            Benchmarks
            {selectedClient !== "all" && <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Reply Rate Trend */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Reply Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedClient !== "all" && clientHistoricalData.length > 0 ? clientHistoricalData : replyRateTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey={selectedClient !== "all" ? "label" : "date"} stroke="#888" fontSize={12} />
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
                        dataKey={selectedClient !== "all" ? "replyRate" : "value"}
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: "#22c55e" }}
                        name="Reply Rate %"
                      />
                      {selectedClient === "all" && (
                        <Line
                          type="monotone"
                          dataKey="benchmark"
                          stroke="#ef4444"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Min Benchmark"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Opportunities Trend */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Opportunities Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={opportunitiesTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} name="Opportunities" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Client Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#888" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="replyRate" fill="#22c55e" name="Reply Rate %" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="conversionRate" fill="#3b82f6" name="Conversion %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Client Classification Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bucketDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${value}`}
                      >
                        {bucketDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {bucketDistribution.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Weekly Trend Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trends.clients
                    .filter(c => selectedClient === "all" || c.name === selectedClient)
                    .map((client) => (
                    <div
                      key={client.name}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {client.trend === "improving" && (
                          <TrendingUp className="h-5 w-5 text-green-400" />
                        )}
                        {client.trend === "declining" && (
                          <TrendingDown className="h-5 w-5 text-red-400" />
                        )}
                        {client.trend === "stable" && (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium text-foreground">{client.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {client.replyRate.toFixed(2)}% reply rate
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-sm font-medium",
                          client.trend === "improving" && "text-green-400",
                          client.trend === "declining" && "text-red-400",
                          client.trend === "stable" && "text-muted-foreground"
                        )}
                      >
                        {client.change > 0 && "+"}
                        {client.change.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="benchmarks">
          {selectedClient === "all" ? (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Performance vs Benchmarks</CardTitle>
                <CardDescription>
                  Select a specific client to see detailed benchmark comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-border p-4">
                      <div className="mb-2 text-sm text-muted-foreground">
                        Reply Rate Benchmark
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {BENCHMARKS.CRITICAL_REPLY_RATE}%
                        </span>
                        <span className="text-sm text-muted-foreground">minimum</span>
                      </div>
                      <div className="mt-2 text-xs text-green-400">
                        Current: {formatPercentage(filteredMetrics.replyRate)}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="mb-2 text-sm text-muted-foreground">
                        Conversion Target
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {BENCHMARKS.ASPIRATIONAL_CONVERSION}%
                        </span>
                        <span className="text-sm text-muted-foreground">goal</span>
                      </div>
                      <div className="mt-2 text-xs text-yellow-400">
                        Current: {formatPercentage(filteredMetrics.conversionRate)}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="mb-2 text-sm text-muted-foreground">
                        Inbox Health Target
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {BENCHMARKS.HEALTHY_INBOX}%
                        </span>
                        <span className="text-sm text-muted-foreground">minimum</span>
                      </div>
                      <div className="mt-2 text-xs text-green-400">
                        Portfolio avg: {metrics.avgInboxHealth}%
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">{selectedClient} - Benchmark Comparison</CardTitle>
                <CardDescription>How this client performs against target benchmarks</CardDescription>
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
