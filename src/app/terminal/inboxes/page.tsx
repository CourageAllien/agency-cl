"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Shield,
  ChevronDown,
  ChevronUp,
  Flame,
  Activity,
} from "lucide-react";
import Link from "next/link";

interface Inbox {
  email: string;
  status: string;
  statusMessage?: string;
  warmupStatus: number;
  healthScore: number;
  dailyLimit: number;
  provider?: string;
  issues: string[];
  severity: string;
  affectedCampaigns: string[];
  actions: string[];
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  'CRITICAL': { 
    icon: <XCircle className="h-4 w-4" />, 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/10 border-red-500/30',
    label: 'Critical'
  },
  'HIGH': { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    label: 'High Priority'
  },
  'MEDIUM': { 
    icon: <Activity className="h-4 w-4" />, 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    label: 'Medium'
  },
  'HEALTHY': { 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    label: 'Healthy'
  },
};

export default function InboxesFullViewPage() {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{
    total: number;
    healthy: number;
    issues: number;
    disconnected: number;
    lowHealth: number;
  }>({ total: 0, healthy: 0, issues: 0, disconnected: 0, lowHealth: 0 });

  const fetchInboxes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'inbox health' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch inboxes');
      }
      
      const data = await response.json();
      // Data is in structured.metadata.rawAccounts from the command
      if (data.structured?.metadata?.rawAccounts) {
        setInboxes(data.structured.metadata.rawAccounts);
        if (data.structured.metadata.summary) {
          setSummary(data.structured.metadata.summary);
        }
      } else {
        console.log('No raw accounts in response, structured:', data.structured);
        setError('Inbox data not available in expected format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inboxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxes();
  }, []);

  const toggleExpand = (email: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(email)) {
      newExpanded.delete(email);
    } else {
      newExpanded.add(email);
    }
    setExpandedCards(newExpanded);
  };

  const filteredInboxes = inboxes.filter(inbox => {
    const matchesSearch = inbox.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inbox.severity === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = inboxes.reduce((acc, inbox) => {
    acc[inbox.severity] = (acc[inbox.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-emerald-400" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-400" />;
      case 'warmup':
        return <Flame className="h-4 w-4 text-orange-400" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 93) return 'text-emerald-400';
    if (score >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/terminal">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inbox Health</h1>
            <p className="text-sm text-muted-foreground">
              {inboxes.length} total inboxes • {filteredInboxes.length} shown
            </p>
          </div>
        </div>
        <Button onClick={fetchInboxes} variant="outline" disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {/* Summary Stats */}
      <div className="border-b border-border px-6 py-4 bg-muted/30">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-background">
            <div className="text-2xl font-bold">{summary.total || inboxes.length}</div>
            <div className="text-xs text-muted-foreground">Total Inboxes</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-2xl font-bold text-emerald-400">{summary.healthy || statusCounts['HEALTHY'] || 0}</div>
            <div className="text-xs text-muted-foreground">Healthy</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{summary.disconnected || 0}</div>
            <div className="text-xs text-muted-foreground">Disconnected</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">{summary.lowHealth || 0}</div>
            <div className="text-xs text-muted-foreground">Low Health</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{summary.issues || 0}</div>
            <div className="text-xs text-muted-foreground">With Issues</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses ({inboxes.length})</SelectItem>
              <SelectItem value="CRITICAL">
                🔴 Critical ({statusCounts['CRITICAL'] || 0})
              </SelectItem>
              <SelectItem value="HIGH">
                🟠 High Priority ({statusCounts['HIGH'] || 0})
              </SelectItem>
              <SelectItem value="MEDIUM">
                🟡 Medium ({statusCounts['MEDIUM'] || 0})
              </SelectItem>
              <SelectItem value="HEALTHY">
                🟢 Healthy ({statusCounts['HEALTHY'] || 0})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Chips */}
      <div className="border-b border-border px-6 py-3">
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
                statusFilter === key ? config.bgColor : "border-transparent hover:bg-muted"
              )}
            >
              <span className={config.color}>{config.icon}</span>
              <span className="text-sm font-medium">{config.label}</span>
              <Badge variant="secondary" className="ml-1">
                {statusCounts[key] || 0}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading inboxes...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-lg font-medium text-foreground">{error}</p>
              <Button onClick={fetchInboxes} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredInboxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">No inboxes found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredInboxes.map((inbox, idx) => {
                const config = STATUS_CONFIG[inbox.severity] || STATUS_CONFIG['HEALTHY'];
                const isExpanded = expandedCards.has(inbox.email);
                
                return (
                  <Card 
                    key={inbox.email} 
                    className={cn("border transition-all", config.bgColor)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground">
                              #{idx + 1}
                            </span>
                            {getStatusIcon(inbox.status)}
                            <CardTitle className="text-lg font-mono">{inbox.email}</CardTitle>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className={config.color}>
                              {config.icon}
                              <span className="ml-1">{inbox.severity}</span>
                            </Badge>
                            <span className={cn("text-sm font-medium", getHealthColor(inbox.healthScore))}>
                              Health: {inbox.healthScore}%
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Daily Limit: {inbox.dailyLimit}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleExpand(inbox.email)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="flex items-center justify-center gap-2">
                            {getStatusIcon(inbox.status)}
                            <span className="font-medium capitalize">{inbox.status}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Connection</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className={cn("text-lg font-bold", getHealthColor(inbox.healthScore))}>
                            {inbox.healthScore}%
                          </div>
                          <div className="text-xs text-muted-foreground">Health Score</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="flex items-center justify-center gap-2">
                            <Flame className={cn("h-4 w-4", 
                              inbox.warmupStatus === 1 ? "text-orange-400" : "text-muted-foreground"
                            )} />
                            <span>{inbox.warmupStatus === 1 ? 'Active' : 'Inactive'}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Warmup</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="text-lg font-bold">{inbox.dailyLimit}</div>
                          <div className="text-xs text-muted-foreground">Daily Limit</div>
                        </div>
                      </div>

                      {/* Issues */}
                      {inbox.issues && inbox.issues.length > 0 && (
                        <div className="p-3 rounded-lg bg-background/50 mb-4">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            Issues Detected
                          </h4>
                          <ul className="space-y-1">
                            {inbox.issues.map((issue, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-yellow-400" />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border space-y-4">
                          {/* Status Message */}
                          {inbox.statusMessage && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                              <div className="text-sm font-medium text-red-400">Status Message:</div>
                              <p className="text-sm mt-1">{inbox.statusMessage}</p>
                            </div>
                          )}

                          {/* Affected Campaigns */}
                          {inbox.affectedCampaigns && inbox.affectedCampaigns.length > 0 && (
                            <div className="p-3 rounded-lg border border-border">
                              <h4 className="font-medium mb-2">Affected Campaigns ({inbox.affectedCampaigns.length})</h4>
                              <div className="flex flex-wrap gap-2">
                                {inbox.affectedCampaigns.map((campaign, i) => (
                                  <Badge key={i} variant="secondary">{campaign}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommended Actions */}
                          {inbox.actions && inbox.actions.length > 0 && (
                            <div className="p-3 rounded-lg border border-border">
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Recommended Actions
                              </h4>
                              <ol className="space-y-2">
                                {inbox.actions.map((action, i) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                                      {i + 1}
                                    </span>
                                    {action}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Provider Info */}
                          {inbox.provider && (
                            <div className="p-3 rounded-lg border border-border">
                              <div className="text-sm">
                                <span className="font-medium text-muted-foreground">Provider: </span>
                                <span>{inbox.provider}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
