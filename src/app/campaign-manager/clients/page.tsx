"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useDashboardData";
import { BUCKET_CONFIGS, type IssueBucket } from "@/types/analysis";
import { formatNumber, formatPercentage } from "@/lib/utils";
import {
  Search,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const { clients, isLoading, isError, error, refetch, isFetching } = useClients();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBucket, setSelectedBucket] = useState<IssueBucket | "all">("all");

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = client.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesBucket =
        selectedBucket === "all" || client.classification.bucket === selectedBucket;
      return matchesSearch && matchesBucket;
    });
  }, [clients, searchQuery, selectedBucket]);

  const bucketCounts = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc[client.classification.bucket] = (acc[client.classification.bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [clients]);

  const handleClientClick = (clientId: string) => {
    router.push(`/campaign-manager/clients/${clientId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-border bg-card/50">
              <CardContent className="p-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-2 w-full mb-4" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to load clients</h2>
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-muted-foreground">
            {clients.length} clients with auto-classifications
          </p>
        </div>
        <Button variant="outline" className="gap-2" asChild>
          <a href="https://app.instantly.ai" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open in Instantly
          </a>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedBucket === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBucket("all")}
          >
            All ({clients.length})
          </Button>
          {Object.entries(BUCKET_CONFIGS).map(([bucket, config]) => {
            const count = bucketCounts[bucket] || 0;
            if (count === 0) return null;
            return (
              <Button
                key={bucket}
                variant={selectedBucket === bucket ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBucket(bucket as IssueBucket)}
                className="gap-1"
              >
                {config.icon} {config.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Client Cards */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No clients found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const config = BUCKET_CONFIGS[client.classification.bucket];
            const trendUp = client.metrics.replyRate >= 1;
            
            return (
              <Card
                key={client.id}
                className={cn(
                  "border-border bg-card/50 backdrop-blur-sm cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg",
                  client.classification.severity === "critical" && "border-red-500/30",
                  client.classification.severity === "high" && "border-orange-500/30"
                )}
                onClick={() => handleClientClick(client.id)}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          config.color === "destructive" && "bg-red-500/10 text-red-500",
                          config.color === "warning" && "bg-yellow-500/10 text-yellow-500",
                          config.color === "success" && "bg-green-500/10 text-green-500",
                          config.color === "secondary" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {config.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{client.name}</h3>
                        <Badge
                          variant={
                            config.color === "destructive"
                              ? "destructive"
                              : config.color === "success"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs mt-1"
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Menu would go here
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Health Score */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Health Score</span>
                      <span className="font-medium">{client.healthScore}%</span>
                    </div>
                    <Progress
                      value={client.healthScore}
                      className={cn(
                        "h-2",
                        client.healthScore >= 70 && "[&>div]:bg-green-500",
                        client.healthScore >= 40 && client.healthScore < 70 && "[&>div]:bg-yellow-500",
                        client.healthScore < 40 && "[&>div]:bg-red-500"
                      )}
                    />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        Reply Rate
                        {trendUp ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <div className="font-semibold">
                        {formatPercentage(client.metrics.replyRate)}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground mb-1">Conversion</div>
                      <div className="font-semibold">
                        {formatPercentage(client.metrics.conversionRate)}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground mb-1">Total Sent</div>
                      <div className="font-semibold">
                        {formatNumber(client.metrics.totalSent)}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground mb-1">Opportunities</div>
                      <div className="font-semibold">{client.metrics.opportunities}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
