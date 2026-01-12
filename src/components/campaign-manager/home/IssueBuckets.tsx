"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BUCKET_CONFIGS, type IssueBucket } from "@/types/analysis";
import type { TransformedClient } from "@/hooks/useDashboardData";
import {
  AlertTriangle,
  TrendingDown,
  Mail,
  Users,
  Target,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

const bucketIcons: Record<IssueBucket, React.ReactNode> = {
  VOLUME_ISSUE: <TrendingDown className="h-4 w-4" />,
  COPY_ISSUE: <Mail className="h-4 w-4" />,
  SUBSEQUENCE_ISSUE: <Target className="h-4 w-4" />,
  DELIVERABILITY_ISSUE: <AlertTriangle className="h-4 w-4" />,
  TAM_EXHAUSTED: <Users className="h-4 w-4" />,
  NOT_VIABLE: <XCircle className="h-4 w-4" />,
  PERFORMING_WELL: <CheckCircle className="h-4 w-4" />,
  TOO_EARLY: <Clock className="h-4 w-4" />,
};

interface IssueBucketsProps {
  filterClient?: string;
  clients?: TransformedClient[];
}

export function IssueBuckets({ filterClient = "all", clients = [] }: IssueBucketsProps) {
  const filteredClients = useMemo(() => {
    if (filterClient === "all") return clients;
    return clients.filter((c) => c.name === filterClient);
  }, [clients, filterClient]);

  const bucketGroups = useMemo(() => {
    const groups: Record<IssueBucket, TransformedClient[]> = {
      VOLUME_ISSUE: [],
      COPY_ISSUE: [],
      SUBSEQUENCE_ISSUE: [],
      DELIVERABILITY_ISSUE: [],
      TAM_EXHAUSTED: [],
      NOT_VIABLE: [],
      PERFORMING_WELL: [],
      TOO_EARLY: [],
    };

    filteredClients.forEach((client) => {
      const bucket = client.classification.bucket;
      if (groups[bucket]) {
        groups[bucket].push(client);
      }
    });

    return groups;
  }, [filteredClients]);

  // Only show buckets that have clients
  const activeBuckets = Object.entries(bucketGroups).filter(
    ([_, clients]) => clients.length > 0
  ) as [IssueBucket, TransformedClient[]][];

  if (activeBuckets.length === 0) {
    return (
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Issue Buckets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No clients to display. Data will appear once campaigns are synced.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Issue Buckets</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {filteredClients.length} clients auto-classified
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {activeBuckets.map(([bucket, bucketClients]) => {
              const config = BUCKET_CONFIGS[bucket];
              return (
                <div
                  key={bucket}
                  className={cn(
                    "rounded-lg border p-4",
                    config.color === "destructive" && "border-red-500/30 bg-red-500/5",
                    config.color === "warning" && "border-yellow-500/30 bg-yellow-500/5",
                    config.color === "success" && "border-green-500/30 bg-green-500/5",
                    config.color === "secondary" && "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          config.color === "destructive" && "text-red-500",
                          config.color === "warning" && "text-yellow-500",
                          config.color === "success" && "text-green-500",
                          config.color === "secondary" && "text-muted-foreground"
                        )}
                      >
                        {bucketIcons[bucket]}
                      </span>
                      <span className="font-medium text-sm">{config.label}</span>
                    </div>
                    <Badge
                      variant={
                        config.color === "destructive"
                          ? "destructive"
                          : config.color === "success"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {bucketClients.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bucketClients.map((client) => (
                      <Badge
                        key={client.id}
                        variant="outline"
                        className={cn(
                          "text-xs cursor-pointer hover:bg-accent transition-colors",
                          client.classification.severity === "critical" && "border-red-500/50",
                          client.classification.severity === "high" && "border-orange-500/50"
                        )}
                      >
                        {client.name}
                        <span className="ml-1 text-muted-foreground">
                          ({client.metrics.replyRate.toFixed(1)}%)
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
