"use client";

import { useState, useMemo } from "react";
import { IssueBuckets } from "@/components/campaign-manager/home/IssueBuckets";
import { DailyTasks } from "@/components/campaign-manager/home/DailyTasks";
import { WeeklyTasks } from "@/components/campaign-manager/home/WeeklyTasks";
import { InboxHealthSummary } from "@/components/campaign-manager/home/InboxHealthSummary";
import { TrendSparklines } from "@/components/campaign-manager/home/TrendSparklines";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { Filter, X, Send, MessageSquare, Target, Users, RefreshCw, AlertCircle, Wifi } from "lucide-react";

export default function CampaignManagerHome() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardData();
  const [selectedClient, setSelectedClient] = useState<string>("all");

  const clientNames = useMemo(() => {
    if (!data?.clients) return ["all"];
    return ["all", ...data.clients.map((c) => c.name).sort()];
  }, [data?.clients]);

  const filteredClients = useMemo(() => {
    if (!data?.clients) return [];
    if (selectedClient === "all") return data.clients;
    return data.clients.filter((c) => c.name === selectedClient);
  }, [data?.clients, selectedClient]);

  const filteredMetrics = useMemo(() => {
    const clients = filteredClients;
    if (clients.length === 0) {
      return {
        totalClients: 0,
        totalSent: 0,
        totalReplies: 0,
        avgReplyRate: 0,
        totalOpportunities: 0,
        avgConversionRate: 0,
        activeInboxes: 0,
        avgInboxHealth: 0,
      };
    }

    const totalSent = clients.reduce((sum, c) => sum + c.metrics.totalSent, 0);
    const totalReplies = clients.reduce((sum, c) => sum + c.metrics.totalReplied, 0);
    const totalOpportunities = clients.reduce((sum, c) => sum + c.metrics.opportunities, 0);

    return {
      totalClients: clients.length,
      totalSent,
      totalReplies,
      avgReplyRate: totalSent > 0 ? (totalReplies / totalSent) * 100 : 0,
      totalOpportunities,
      avgConversionRate: totalReplies > 0 ? (totalOpportunities / totalReplies) * 100 : 0,
      activeInboxes: data?.inboxHealth?.connected || 0,
      avgInboxHealth: data?.inboxHealth?.avgHealth || 0,
    };
  }, [filteredClients, data?.inboxHealth]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border bg-card/50">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
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
      {/* Header with Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fadeIn">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Campaign Manager</h1>
            {data?.meta?.source === "instantly" && (
              <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                <Wifi className="h-3 w-3" />
                Live
              </Badge>
            )}
            {isFetching && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-muted-foreground">
            Welcome back, Courage. Here's what needs your attention.
          </p>
        </div>
        
        {/* Client Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px]">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filtered Client Info Badge */}
      {selectedClient !== "all" && (
        <div className="animate-fadeIn">
          <Badge variant="outline" className="gap-2 px-3 py-1.5 text-sm">
            <Users className="h-3 w-3" />
            Showing data for: <span className="font-semibold">{selectedClient}</span>
          </Badge>
        </div>
      )}

      {/* Performance Metrics - Filtered */}
      <div className="grid animate-fadeIn grid-cols-1 gap-4 delay-100 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Sent
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-foreground">
                {formatNumber(filteredMetrics.totalSent)}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">lifetime</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Reply Rate
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPercentage(filteredMetrics.avgReplyRate)}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">average</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Opportunities
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-foreground">
                {filteredMetrics.totalOpportunities}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Conversion Rate
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPercentage(filteredMetrics.avgConversionRate)}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">reply→meeting</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issue Buckets - Auto-classified clients */}
      <div className="animate-fadeIn delay-200">
        <IssueBuckets 
          filterClient={selectedClient} 
          clients={filteredClients}
        />
      </div>

      {/* Auto-Generated Tasks */}
      <div className="grid animate-fadeIn grid-cols-1 gap-6 delay-300 lg:grid-cols-2">
        <DailyTasks 
          filterClient={selectedClient} 
          tasks={data?.tasks.daily || []}
        />
        <WeeklyTasks 
          filterClient={selectedClient}
          tasks={data?.tasks.weekly || []}
        />
      </div>

      {/* Inbox Health + Trends Row */}
      <div className="grid animate-fadeIn grid-cols-1 gap-6 delay-400 lg:grid-cols-2">
        <InboxHealthSummary 
          filterClient={selectedClient}
          accounts={data?.accounts || []}
          inboxHealth={data?.inboxHealth}
        />
        <TrendSparklines 
          filterClient={selectedClient}
          clients={filteredClients}
        />
      </div>
    </div>
  );
}
