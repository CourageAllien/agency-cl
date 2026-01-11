"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getMockClassifications } from "@/lib/mock-data";
import { BUCKET_CONFIGS, type IssueBucket } from "@/types/analysis";
import { formatNumber, formatPercentage, calculateHealthScore } from "@/lib/utils";
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  Mail,
  Target,
  MoreVertical,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const classifications = getMockClassifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBucket, setSelectedBucket] = useState<IssueBucket | "all">("all");

  const filteredClients = classifications.filter((client) => {
    const matchesSearch = client.clientName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesBucket =
      selectedBucket === "all" || client.bucket === selectedBucket;
    return matchesSearch && matchesBucket;
  });

  const bucketCounts = classifications.reduce((acc, client) => {
    acc[client.bucket] = (acc[client.bucket] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleClientClick = (clientId: string) => {
    router.push(`/campaign-manager/clients/${clientId}`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">
            {classifications.length} clients with auto-classifications
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Open in Instantly
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
            All ({classifications.length})
          </Button>
          {Object.entries(BUCKET_CONFIGS)
            .sort((a, b) => a[1].priority - b[1].priority)
            .filter(([bucket]) => bucketCounts[bucket])
            .map(([bucket, config]) => (
              <Button
                key={bucket}
                variant={selectedBucket === bucket ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBucket(bucket as IssueBucket)}
                className="gap-1"
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {bucketCounts[bucket]}
                </Badge>
              </Button>
            ))}
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredClients.map((client) => {
          const config = BUCKET_CONFIGS[client.bucket];
          const healthScore = calculateHealthScore({
            replyRate: client.metrics.replyRate,
            conversionRate: client.metrics.conversionRate,
            avgInboxHealth: client.metrics.avgInboxHealth,
            uncontactedLeads: client.metrics.uncontactedLeads,
          });

          return (
            <Card
              key={client.clientId}
              onClick={() => handleClientClick(client.clientId)}
              className={cn(
                "group cursor-pointer border transition-all hover:shadow-lg hover:scale-[1.01]",
                config.borderColor
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-lg",
                        config.bgColor
                      )}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {client.clientName}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={cn("mt-1 text-xs", config.color)}
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
                      // Could add a menu here
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Health Score */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Health Score</span>
                    <span
                      className={cn(
                        "font-medium",
                        healthScore >= 70
                          ? "text-green-400"
                          : healthScore >= 40
                          ? "text-yellow-400"
                          : "text-red-400"
                      )}
                    >
                      {healthScore}%
                    </span>
                  </div>
                  <Progress
                    value={healthScore}
                    className="h-2"
                    indicatorClassName={cn(
                      healthScore >= 70
                        ? "bg-green-500"
                        : healthScore >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    )}
                  />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="text-muted-foreground">Reply Rate</div>
                    <div className="flex items-center gap-1 font-medium text-foreground">
                      {formatPercentage(client.metrics.replyRate)}
                      {client.metrics.replyRate >= 1 ? (
                        <TrendingUp className="h-3 w-3 text-green-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="text-muted-foreground">Conversion</div>
                    <div className="font-medium text-foreground">
                      {formatPercentage(client.metrics.conversionRate)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="text-muted-foreground">Leads Left</div>
                    <div className="font-medium text-foreground">
                      {formatNumber(client.metrics.uncontactedLeads)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="text-muted-foreground">Opportunities</div>
                    <div className="font-medium text-foreground">
                      {client.metrics.opportunities}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    {client.reason}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.metrics.activeInboxes} inboxes
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {client.metrics.activeCampaigns} campaigns
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">No clients found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
