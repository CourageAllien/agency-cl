"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useDashboardData";
import {
  Search,
  Mail,
  AlertTriangle,
  CheckCircle,
  Flame,
  ExternalLink,
  RefreshCw,
  Tag,
  X,
  AlertCircle,
} from "lucide-react";

export default function InboxesPage() {
  const { accounts, inboxHealth, allTags, isLoading, isError, error, refetch, isFetching } = useAccounts();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // Get unique tags from accounts or from API response
  const uniqueTags = useMemo(() => {
    // Use allTags from API if available
    if (allTags && allTags.length > 0) {
      return allTags;
    }
    // Fallback to extracting from accounts
    const tags = new Set<string>();
    accounts.forEach((account) => {
      account.tags?.forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [accounts, allTags]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch =
        account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "connected" && account.status === "connected") ||
        (statusFilter === "disconnected" && account.status === "disconnected") ||
        (statusFilter === "warmup" && account.status === "warmup") ||
        (statusFilter === "error" && account.sendingError);

      const matchesTag =
        tagFilter === "all" || (account.tags && account.tags.includes(tagFilter));

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [accounts, searchQuery, statusFilter, tagFilter]);

  const statusCounts = useMemo(() => {
    return {
      connected: accounts.filter((a) => a.status === "connected").length,
      disconnected: accounts.filter((a) => a.status === "disconnected").length,
      warmup: accounts.filter((a) => a.status === "warmup").length,
      error: accounts.filter((a) => a.sendingError).length,
    };
  }, [accounts]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
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
        <h2 className="text-xl font-semibold">Failed to load inboxes</h2>
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
            <h1 className="text-2xl font-bold text-foreground">Inboxes</h1>
            {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-muted-foreground">
            {accounts.length} email accounts monitored
          </p>
        </div>
        <Button variant="outline" className="gap-2" asChild>
          <a href="https://app.instantly.ai/accounts" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open in Instantly
          </a>
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Connected</span>
            </div>
            <div className="text-2xl font-bold text-green-500 mt-1">
              {statusCounts.connected}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Warmup</span>
            </div>
            <div className="text-2xl font-bold text-yellow-500 mt-1">
              {statusCounts.warmup}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Disconnected</span>
            </div>
            <div className="text-2xl font-bold text-red-500 mt-1">
              {statusCounts.disconnected}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Avg Health</span>
            </div>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {inboxHealth?.avgHealth || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="warmup">Warmup</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
            <SelectItem value="error">Sending Error</SelectItem>
          </SelectContent>
        </Select>
        {/* Tag filter - shows when tags are available */}
        {uniqueTags.length > 0 ? (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[160px]">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {uniqueTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            <Tag className="h-3 w-3 inline mr-1" />
            No tags available
          </div>
        )}
        {(statusFilter !== "all" || tagFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setTagFilter("all");
            }}
            className="gap-1"
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active Filters Badge */}
      {(statusFilter !== "all" || tagFilter !== "all") && (
        <div className="flex gap-2">
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setStatusFilter("all")}
              />
            </Badge>
          )}
          {tagFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Tag: {tagFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setTagFilter("all")}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Inbox List */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No inboxes found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((account) => (
            <Card
              key={account.id}
              className={cn(
                "border-border bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30",
                account.status === "disconnected" && "border-red-500/30",
                account.sendingError && "border-red-500/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        account.status === "connected" && "bg-green-500/10",
                        account.status === "warmup" && "bg-yellow-500/10",
                        account.status === "disconnected" && "bg-red-500/10"
                      )}
                    >
                      {account.status === "connected" && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {account.status === "warmup" && (
                        <Flame className="h-5 w-5 text-yellow-500" />
                      )}
                      {account.status === "disconnected" && (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                    </div>

                    {/* Email & Client */}
                    <div>
                      <div className="font-medium text-foreground">{account.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {account.provider}{account.tags.length > 0 && ` • ${account.tags[0]}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Tags */}
                    {account.tags && account.tags.length > 0 && (
                      <div className="flex gap-1">
                        {account.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {account.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{account.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Health Score */}
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Health</span>
                        <span className="font-medium">{account.healthScore}%</span>
                      </div>
                      <Progress
                        value={account.healthScore}
                        className={cn(
                          "h-1.5",
                          account.healthScore >= 70 && "[&>div]:bg-green-500",
                          account.healthScore >= 40 && account.healthScore < 70 && "[&>div]:bg-yellow-500",
                          account.healthScore < 40 && "[&>div]:bg-red-500"
                        )}
                      />
                    </div>

                    {/* Send Limit */}
                    <div className="text-right min-w-[80px]">
                      <div className="text-sm font-medium">
                        {account.sentToday}/{account.dailySendLimit}
                      </div>
                      <div className="text-xs text-muted-foreground">sent today</div>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {account.errorMessage && (
                  <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      {account.errorMessage}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
