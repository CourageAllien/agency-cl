"use client";

import { useState, useMemo } from "react";
import { IssueBuckets } from "@/components/campaign-manager/home/IssueBuckets";
import { DailyTasks } from "@/components/campaign-manager/home/DailyTasks";
import { WeeklyTasks } from "@/components/campaign-manager/home/WeeklyTasks";
import { PerformanceSnapshot } from "@/components/campaign-manager/home/PerformanceSnapshot";
import { InboxHealthSummary } from "@/components/campaign-manager/home/InboxHealthSummary";
import { TrendSparklines } from "@/components/campaign-manager/home/TrendSparklines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMockClassifications, getMockPortfolioMetrics } from "@/lib/mock-data";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { Filter, X, Send, MessageSquare, Target, Users } from "lucide-react";

export default function CampaignManagerHome() {
  const classifications = getMockClassifications();
  const [selectedClient, setSelectedClient] = useState<string>("all");

  const clientNames = useMemo(() => {
    return ["all", ...classifications.map((c) => c.clientName).sort()];
  }, [classifications]);

  const filteredClassifications = useMemo(() => {
    if (selectedClient === "all") return classifications;
    return classifications.filter((c) => c.clientName === selectedClient);
  }, [classifications, selectedClient]);

  const filteredMetrics = useMemo(() => {
    const data = filteredClassifications;
    const totalSent = data.reduce((sum, c) => sum + c.metrics.totalSent, 0);
    const totalReplies = data.reduce((sum, c) => sum + c.metrics.totalReplies, 0);
    const totalOpportunities = data.reduce((sum, c) => sum + c.metrics.opportunities, 0);
    const totalInboxes = data.reduce((sum, c) => sum + c.metrics.activeInboxes, 0);
    const avgInboxHealth = data.length > 0 
      ? Math.round(data.reduce((sum, c) => sum + c.metrics.avgInboxHealth, 0) / data.length)
      : 0;

    return {
      totalClients: data.length,
      totalSent,
      totalReplies,
      avgReplyRate: totalSent > 0 ? (totalReplies / totalSent) * 100 : 0,
      totalOpportunities,
      avgConversionRate: totalReplies > 0 ? (totalOpportunities / totalReplies) * 100 : 0,
      activeInboxes: totalInboxes,
      avgInboxHealth,
    };
  }, [filteredClassifications]);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaign Manager</h1>
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
        <IssueBuckets filterClient={selectedClient} />
      </div>

      {/* Auto-Generated Tasks */}
      <div className="grid animate-fadeIn grid-cols-1 gap-6 delay-300 lg:grid-cols-2">
        <DailyTasks filterClient={selectedClient} />
        <WeeklyTasks filterClient={selectedClient} />
      </div>

      {/* Inbox Health + Trends Row */}
      <div className="grid animate-fadeIn grid-cols-1 gap-6 delay-400 lg:grid-cols-2">
        <InboxHealthSummary filterClient={selectedClient} />
        <TrendSparklines filterClient={selectedClient} />
      </div>
    </div>
  );
}
