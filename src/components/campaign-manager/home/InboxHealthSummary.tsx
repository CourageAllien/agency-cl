"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TransformedAccount } from "@/lib/services/dataTransformer";
import { Mail, AlertTriangle, CheckCircle, Flame } from "lucide-react";

interface InboxHealthSummaryProps {
  filterClient?: string;
  accounts?: TransformedAccount[];
  inboxHealth?: {
    total: number;
    connected: number;
    disconnected: number;
    warmup: number;
    avgHealth: number;
  };
}

export function InboxHealthSummary({
  filterClient = "all",
  accounts = [],
  inboxHealth,
}: InboxHealthSummaryProps) {
  // Filter by tag (since inboxes are shared, not client-specific)
  const filteredAccounts = useMemo(() => {
    if (filterClient === "all") return accounts;
    // Filter by tag that matches the client name
    return accounts.filter((a) => 
      a.tags.some(tag => tag.toLowerCase().includes(filterClient.toLowerCase()))
    );
  }, [accounts, filterClient]);

  const stats = useMemo(() => {
    if (filteredAccounts.length === 0) {
      return {
        total: 0,
        connected: 0,
        disconnected: 0,
        warmup: 0,
        avgHealth: 0,
      };
    }

    const connected = filteredAccounts.filter((a) => a.status === "connected").length;
    const disconnected = filteredAccounts.filter((a) => a.status === "disconnected").length;
    const warmup = filteredAccounts.filter((a) => a.status === "warmup").length;
    const avgHealth = Math.round(
      filteredAccounts.reduce((sum, a) => sum + a.healthScore, 0) / filteredAccounts.length
    );

    return {
      total: filteredAccounts.length,
      connected,
      disconnected,
      warmup,
      avgHealth,
    };
  }, [filteredAccounts]);

  const displayStats = filterClient === "all" && inboxHealth ? inboxHealth : stats;

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-lg font-semibold">Inbox Health</CardTitle>
          </div>
          <Badge
            variant={displayStats.avgHealth >= 80 ? "default" : displayStats.avgHealth >= 60 ? "secondary" : "destructive"}
            className="text-xs"
          >
            {displayStats.avgHealth}% avg
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {displayStats.total === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No inboxes to display.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Overall Health Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Health</span>
                <span className="font-medium">{displayStats.avgHealth}%</span>
              </div>
              <Progress
                value={displayStats.avgHealth}
                className={cn(
                  "h-2",
                  displayStats.avgHealth >= 80 && "[&>div]:bg-green-500",
                  displayStats.avgHealth >= 60 && displayStats.avgHealth < 80 && "[&>div]:bg-yellow-500",
                  displayStats.avgHealth < 60 && "[&>div]:bg-red-500"
                )}
              />
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-500">{displayStats.connected}</div>
                <div className="text-xs text-muted-foreground">Connected</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Flame className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-yellow-500">{displayStats.warmup}</div>
                <div className="text-xs text-muted-foreground">Warmup</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-red-500">{displayStats.disconnected}</div>
                <div className="text-xs text-muted-foreground">Disconnected</div>
              </div>
            </div>

            {/* Total */}
            <div className="text-center text-sm text-muted-foreground">
              {displayStats.total} total inboxes
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
