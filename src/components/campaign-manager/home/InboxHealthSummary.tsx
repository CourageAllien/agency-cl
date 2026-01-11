"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMockInboxHealth, mockAccounts } from "@/lib/mock-data";
import { Mail, AlertTriangle, CheckCircle2, XCircle, Zap } from "lucide-react";

interface InboxHealthSummaryProps {
  filterClient?: string;
}

export function InboxHealthSummary({ filterClient = "all" }: InboxHealthSummaryProps) {
  const filteredAccounts = useMemo(() => {
    if (filterClient === "all") return mockAccounts;
    return mockAccounts.filter((a) => a.clientName === filterClient);
  }, [filterClient]);

  const health = useMemo(() => {
    const connected = filteredAccounts.filter(a => a.status === 'connected');
    const disconnectedAccounts = filteredAccounts.filter(a => a.status === 'disconnected');
    const lowHealthAccounts = connected.filter(a => a.healthScore < 93);
    const healthyAccounts = connected.filter(a => a.healthScore >= 93);
    
    return {
      total: filteredAccounts.length,
      healthy: healthyAccounts.length,
      lowHealth: lowHealthAccounts.length,
      disconnected: disconnectedAccounts.length,
      warming: 0,
      avgHealthScore: connected.length > 0 
        ? Math.round(connected.reduce((sum, a) => sum + a.healthScore, 0) / connected.length)
        : 0,
    };
  }, [filteredAccounts]);

  const healthyPercent = health.total > 0 ? Math.round((health.healthy / health.total) * 100) : 0;
  
  // Get problematic inboxes
  const disconnected = filteredAccounts.filter(a => a.status === 'disconnected');
  const lowHealth = filteredAccounts.filter(a => a.status === 'connected' && a.healthScore < 93);

  if (health.total === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-purple-400" />
              Inbox Health
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No inboxes for this client</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-purple-400" />
            Inbox Health
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {health.total} total inbox{health.total !== 1 ? "es" : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{health.avgHealthScore}%</div>
          <div className="text-xs text-muted-foreground">avg health</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health distribution bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Distribution</span>
            <span className="text-green-400">{healthyPercent}% healthy</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(health.healthy / health.total) * 100}%` }}
            />
            <div
              className="bg-yellow-500 transition-all"
              style={{ width: `${(health.lowHealth / health.total) * 100}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${(health.disconnected / health.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Healthy ({health.healthy})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Low ({health.lowHealth})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span>Disconnected ({health.disconnected})</span>
            </div>
          </div>
        </div>

        {/* Issues list */}
        {(disconnected.length > 0 || lowHealth.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Issues requiring attention
            </div>
            <div className="space-y-2">
              {disconnected.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-foreground">{account.email}</span>
                  </div>
                  <Badge variant="danger" className="text-xs">Disconnected</Badge>
                </div>
              ))}
              {lowHealth.slice(0, 3).map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg bg-yellow-500/10 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-foreground">{account.email}</span>
                  </div>
                  <Badge variant="warning" className="text-xs">
                    {account.healthScore}% health
                  </Badge>
                </div>
              ))}
              {lowHealth.length > 3 && (
                <div className="text-center text-xs text-muted-foreground">
                  +{lowHealth.length - 3} more low health inboxes
                </div>
              )}
            </div>
          </div>
        )}

        {disconnected.length === 0 && lowHealth.length === 0 && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span className="text-sm text-green-400">All inboxes healthy!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
