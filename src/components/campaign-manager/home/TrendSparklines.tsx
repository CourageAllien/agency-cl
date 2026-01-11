"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMockWeeklyTrends } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

interface TrendSparklinesProps {
  filterClient?: string;
}

export function TrendSparklines({ filterClient = "all" }: TrendSparklinesProps) {
  const allTrends = getMockWeeklyTrends();

  const trends = useMemo(() => {
    if (filterClient === "all") return allTrends;
    return {
      ...allTrends,
      clients: allTrends.clients.filter((c) => c.name === filterClient),
    };
  }, [allTrends, filterClient]);

  const improving = trends.clients.filter((c) => c.trend === "improving");
  const declining = trends.clients.filter((c) => c.trend === "declining");

  if (trends.clients.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Weekly Trends
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No trend data for this client</p>
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
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Weekly Trends
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Reply rate changes vs last week
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="success" className="text-xs">
            <TrendingUp className="mr-1 h-3 w-3" />
            {improving.length}
          </Badge>
          <Badge variant="danger" className="text-xs">
            <TrendingDown className="mr-1 h-3 w-3" />
            {declining.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {trends.clients
            .sort((a, b) => {
              // Sort: declining first, then improving, then stable
              const order = { declining: 0, improving: 1, stable: 2 };
              return order[a.trend] - order[b.trend];
            })
            .map((client) => (
              <div
                key={client.name}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-border p-3",
                  client.trend === "declining" && "bg-red-500/5 border-red-500/20",
                  client.trend === "improving" && "bg-green-500/5 border-green-500/20",
                  client.trend === "stable" && "bg-muted/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      client.trend === "declining" && "bg-red-500/20",
                      client.trend === "improving" && "bg-green-500/20",
                      client.trend === "stable" && "bg-muted"
                    )}
                  >
                    {client.trend === "improving" && (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    )}
                    {client.trend === "declining" && (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    )}
                    {client.trend === "stable" && (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
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
                    client.trend === "declining" && "text-red-400",
                    client.trend === "improving" && "text-green-400",
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
  );
}
