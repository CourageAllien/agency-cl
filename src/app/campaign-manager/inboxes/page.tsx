"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { mockAccounts, getMockInboxHealth, getAllTags } from "@/lib/mock-data";
import {
  Search,
  Mail,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw,
  ExternalLink,
  Filter,
  ArrowUpDown,
  X,
  Tag,
} from "lucide-react";

type FilterStatus = "all" | "connected" | "disconnected" | "low-health" | "sending-error";

export default function InboxesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"health" | "name" | "client">("health");
  
  const allTags = useMemo(() => getAllTags(), []);
  const health = getMockInboxHealth();

  const filteredAccounts = useMemo(() => {
    return mockAccounts
      .filter((account) => {
        const matchesSearch =
          account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          account.clientName.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesTag = selectedTag === "all" || account.tags?.includes(selectedTag);
        
        let matchesFilter = true;
        if (filterStatus === "connected") {
          matchesFilter = account.status === "connected";
        } else if (filterStatus === "disconnected") {
          matchesFilter = account.status === "disconnected";
        } else if (filterStatus === "low-health") {
          matchesFilter = account.status === "connected" && account.healthScore < 93;
        } else if (filterStatus === "sending-error") {
          matchesFilter = account.sendingError === true;
        }
        
        return matchesSearch && matchesFilter && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === "health") {
          // Disconnected first, then by health score ascending
          if (a.status === "disconnected" && b.status !== "disconnected") return -1;
          if (b.status === "disconnected" && a.status !== "disconnected") return 1;
          return a.healthScore - b.healthScore;
        }
        if (sortBy === "name") return a.email.localeCompare(b.email);
        if (sortBy === "client") return a.clientName.localeCompare(b.clientName);
        return 0;
      });
  }, [searchQuery, filterStatus, selectedTag, sortBy]);

  // Stats for the filtered results
  const filteredStats = useMemo(() => {
    const connected = filteredAccounts.filter(a => a.status === 'connected');
    const disconnected = filteredAccounts.filter(a => a.status === 'disconnected');
    const lowHealth = connected.filter(a => a.healthScore < 93);
    const sendingErrors = filteredAccounts.filter(a => a.sendingError);
    const healthy = connected.filter(a => a.healthScore >= 93);
    
    return {
      total: filteredAccounts.length,
      healthy: healthy.length,
      lowHealth: lowHealth.length,
      disconnected: disconnected.length,
      sendingErrors: sendingErrors.length,
      avgHealthScore: connected.length > 0 
        ? Math.round(connected.reduce((sum, a) => sum + a.healthScore, 0) / connected.length)
        : 0,
    };
  }, [filteredAccounts]);

  const getHealthColor = (score: number) => {
    if (score >= 93) return "text-green-400";
    if (score >= 85) return "text-yellow-400";
    return "text-red-400";
  };

  const getHealthBg = (score: number) => {
    if (score >= 93) return "bg-green-500";
    if (score >= 85) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inboxes</h1>
          <p className="text-muted-foreground">
            {health.total} inboxes across all clients
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Manage in Instantly
        </Button>
      </div>

      {/* Health Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{filteredStats.healthy}</div>
              <div className="text-sm text-muted-foreground">Healthy</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
              <Zap className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{filteredStats.lowHealth}</div>
              <div className="text-sm text-muted-foreground">Low Health</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{filteredStats.disconnected}</div>
              <div className="text-sm text-muted-foreground">Disconnected</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
              <AlertTriangle className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{filteredStats.sendingErrors}</div>
              <div className="text-sm text-muted-foreground">Sending Errors</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
              <Mail className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{filteredStats.avgHealthScore}%</div>
              <div className="text-sm text-muted-foreground">Avg Health</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search inboxes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Tag Filter */}
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTag !== "all" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedTag("all")}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "connected" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("connected")}
            className="gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Button>
          <Button
            variant={filterStatus === "low-health" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("low-health")}
            className="gap-1"
          >
            <Zap className="h-3 w-3" />
            Low Health
          </Button>
          <Button
            variant={filterStatus === "disconnected" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("disconnected")}
            className="gap-1"
          >
            <XCircle className="h-3 w-3" />
            Disconnected
          </Button>
          <Button
            variant={filterStatus === "sending-error" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("sending-error")}
            className="gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            Sending Errors
          </Button>
        </div>
        <Button variant="outline" size="sm" className="ml-auto gap-1">
          <ArrowUpDown className="h-3 w-3" />
          Sort by {sortBy}
        </Button>
      </div>

      {/* Filtered Tag Info Badge */}
      {selectedTag !== "all" && (
        <Badge variant="outline" className="gap-2 px-3 py-1.5 text-sm">
          <Tag className="h-3 w-3" />
          Showing inboxes with tag: <span className="font-semibold">{selectedTag}</span>
          <span className="text-muted-foreground">({filteredStats.total} inboxes)</span>
        </Badge>
      )}

      {/* Inbox Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredAccounts.map((account) => (
          <Card
            key={account.id}
            className={cn(
              "group border transition-all hover:shadow-lg",
              account.status === "disconnected" && "border-red-500/30 bg-red-500/5",
              account.status === "connected" &&
                account.healthScore < 93 &&
                "border-yellow-500/30 bg-yellow-500/5",
              account.sendingError && "border-orange-500/30"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      account.status === "disconnected"
                        ? "bg-red-500/20"
                        : account.sendingError
                        ? "bg-orange-500/20"
                        : account.healthScore >= 93
                        ? "bg-green-500/20"
                        : "bg-yellow-500/20"
                    )}
                  >
                    {account.status === "disconnected" ? (
                      <XCircle className="h-5 w-5 text-red-400" />
                    ) : account.sendingError ? (
                      <AlertTriangle className="h-5 w-5 text-orange-400" />
                    ) : account.healthScore >= 93 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {account.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {account.clientName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* Health Score */}
                {account.status === "connected" ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Health Score</span>
                      <span className={cn("font-medium", getHealthColor(account.healthScore))}>
                        {account.healthScore}%
                      </span>
                    </div>
                    <Progress
                      value={account.healthScore}
                      className="h-1.5"
                      indicatorClassName={getHealthBg(account.healthScore)}
                    />
                  </div>
                ) : (
                  <div className="rounded bg-red-500/10 p-2 text-center text-xs text-red-400">
                    Re-authentication required
                  </div>
                )}

                {/* Sending Error */}
                {account.sendingError && (
                  <div className="rounded bg-orange-500/10 p-2 text-xs text-orange-400">
                    ⚠️ {account.errorMessage || "Sending error detected"}
                  </div>
                )}

                {/* Stats */}
                {account.status === "connected" && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-muted-foreground">
                      Sent today: <span className="text-foreground">{account.sentToday}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Limit: <span className="text-foreground">{account.dailySendLimit}</span>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {account.tags && account.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {account.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {account.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{account.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Provider Badge */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs capitalize">
                    {account.provider}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {account.status === "disconnected" ? (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Reconnect
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3 w-3" />
                        View
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Mail className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">No inboxes found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search, tag, or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
