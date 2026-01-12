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
  Target,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Campaign {
  name: string;
  id: string;
  status: string;
  sent: number;
  contacted: number;
  uncontacted: number;
  totalLeads: number;
  replies: number;
  replyRate: number;
  opportunities: number;
  replyToOpp: number;
  bounced: number;
  bounceRate: number;
  positiveReplies: number;
  meetings: number;
  posReplyToMeeting: number;
  classification: string;
  reason: string;
  action: string;
  urgency: string;
}

const CLASSIFICATION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  'NEED NEW LIST': { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10 border-orange-500/30' 
  },
  'NOT PRIORITY': { 
    icon: <XCircle className="h-4 w-4" />, 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/10 border-red-500/30' 
  },
  'REVIEW': { 
    icon: <Target className="h-4 w-4" />, 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/10 border-yellow-500/30' 
  },
  'NO ACTION': { 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/30' 
  },
  'PENDING': { 
    icon: <Clock className="h-4 w-4" />, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10 border-blue-500/30' 
  },
};

export default function CampaignsFullViewPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'list' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      const data = await response.json();
      // Data is in structured.metadata.rawCampaigns from the command
      if (data.structured?.metadata?.rawCampaigns) {
        setCampaigns(data.structured.metadata.rawCampaigns);
      } else {
        // Fallback: try to parse from the response sections if available
        console.log('No raw campaigns in response, structured:', data.structured);
        setError('Campaign data not available in expected format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classificationFilter === "all" || c.classification === classificationFilter;
    return matchesSearch && matchesClass;
  });

  const classificationCounts = campaigns.reduce((acc, c) => {
    acc[c.classification] = (acc[c.classification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'URGENT':
        return <Badge className="bg-red-500 text-white">URGENT</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500 text-white">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500 text-black">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary">LOW</Badge>;
    }
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
            <h1 className="text-2xl font-bold text-foreground">Active Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              {campaigns.length} total campaigns • {filteredCampaigns.length} shown
            </p>
          </div>
        </div>
        <Button onClick={fetchCampaigns} variant="outline" disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {/* Filters */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={classificationFilter} onValueChange={setClassificationFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Classifications" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications ({campaigns.length})</SelectItem>
              <SelectItem value="NEED NEW LIST">
                ⚠️ Need New List ({classificationCounts['NEED NEW LIST'] || 0})
              </SelectItem>
              <SelectItem value="REVIEW">
                🔍 Review ({classificationCounts['REVIEW'] || 0})
              </SelectItem>
              <SelectItem value="NOT PRIORITY">
                🚫 Not Priority ({classificationCounts['NOT PRIORITY'] || 0})
              </SelectItem>
              <SelectItem value="NO ACTION">
                ✅ No Action ({classificationCounts['NO ACTION'] || 0})
              </SelectItem>
              <SelectItem value="PENDING">
                ⏳ Pending ({classificationCounts['PENDING'] || 0})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-border px-6 py-3 bg-muted/30">
        <div className="flex flex-wrap gap-6">
          {Object.entries(CLASSIFICATION_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setClassificationFilter(classificationFilter === key ? "all" : key)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
                classificationFilter === key ? config.bgColor : "border-transparent hover:bg-muted"
              )}
            >
              <span className={config.color}>{config.icon}</span>
              <span className="text-sm font-medium">{key}</span>
              <Badge variant="secondary" className="ml-1">
                {classificationCounts[key] || 0}
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
              <span className="ml-3 text-muted-foreground">Loading campaigns...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-lg font-medium text-foreground">{error}</p>
              <Button onClick={fetchCampaigns} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">No campaigns found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map((campaign, idx) => {
                const config = CLASSIFICATION_CONFIG[campaign.classification] || CLASSIFICATION_CONFIG['PENDING'];
                const isExpanded = expandedCards.has(campaign.id);
                const subsequencesBroken = campaign.positiveReplies > 10 && campaign.meetings === 0;
                
                return (
                  <Card 
                    key={campaign.id} 
                    className={cn("border transition-all", config.bgColor)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            {getUrgencyBadge(campaign.urgency)}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className={config.color}>
                              {config.icon}
                              <span className="ml-1">{campaign.classification}</span>
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {campaign.uncontacted.toLocaleString()} leads remaining
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleExpand(campaign.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="text-lg font-bold">{campaign.sent.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Sent</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className={cn("text-lg font-bold", 
                            campaign.replyRate >= 2 ? "text-emerald-400" : 
                            campaign.replyRate >= 0.45 ? "text-green-400" : "text-red-400"
                          )}>
                            {campaign.replyRate.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Reply Rate</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="text-lg font-bold">{campaign.replies}</div>
                          <div className="text-xs text-muted-foreground">Replies</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className={cn("text-lg font-bold",
                            campaign.opportunities === 0 && campaign.replies > 100 ? "text-red-400" : ""
                          )}>
                            {campaign.opportunities}
                          </div>
                          <div className="text-xs text-muted-foreground">Opportunities</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className={cn("text-lg font-bold",
                            campaign.posReplyToMeeting < 40 ? "text-yellow-400" : "text-emerald-400"
                          )}>
                            {campaign.posReplyToMeeting.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Conv Rate</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="text-lg font-bold">{campaign.meetings}</div>
                          <div className="text-xs text-muted-foreground">Meetings</div>
                        </div>
                      </div>

                      {/* Reason & Action - Always visible */}
                      <div className="flex flex-col gap-2 p-3 rounded-lg bg-background/50">
                        <div className="text-sm">
                          <span className="font-medium text-muted-foreground">Reason: </span>
                          <span>{campaign.reason}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-muted-foreground">Action: </span>
                          <span className="text-primary">{campaign.action}</span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border space-y-4">
                          {/* Subsequences Warning */}
                          {subsequencesBroken && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                              <div className="flex items-center gap-2 text-red-400 font-medium">
                                <AlertTriangle className="h-4 w-4" />
                                Subsequences Broken
                              </div>
                              <p className="text-sm mt-1">
                                {campaign.positiveReplies} positive replies → ZERO meetings. 
                                Fix price/info/meeting templates urgently.
                              </p>
                            </div>
                          )}

                          {/* Detailed Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg border border-border">
                              <div className="text-sm text-muted-foreground">Total Leads</div>
                              <div className="text-xl font-bold">{campaign.totalLeads.toLocaleString()}</div>
                            </div>
                            <div className="p-3 rounded-lg border border-border">
                              <div className="text-sm text-muted-foreground">Contacted</div>
                              <div className="text-xl font-bold">{campaign.contacted.toLocaleString()}</div>
                            </div>
                            <div className="p-3 rounded-lg border border-border">
                              <div className="text-sm text-muted-foreground">Bounced</div>
                              <div className="text-xl font-bold">{campaign.bounced} ({campaign.bounceRate.toFixed(2)}%)</div>
                            </div>
                            <div className="p-3 rounded-lg border border-border">
                              <div className="text-sm text-muted-foreground">Positive Replies</div>
                              <div className="text-xl font-bold">{campaign.positiveReplies}</div>
                            </div>
                          </div>

                          {/* Funnel Visualization */}
                          <div className="p-3 rounded-lg border border-border">
                            <h4 className="font-medium mb-3">Conversion Funnel</h4>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex-1 text-center">
                                <div className="font-bold">{campaign.sent.toLocaleString()}</div>
                                <div className="text-muted-foreground">Sent</div>
                              </div>
                              <div className="text-muted-foreground">→</div>
                              <div className="flex-1 text-center">
                                <div className="font-bold">{campaign.replies}</div>
                                <div className="text-muted-foreground">Replied</div>
                              </div>
                              <div className="text-muted-foreground">→</div>
                              <div className="flex-1 text-center">
                                <div className="font-bold">{campaign.positiveReplies}</div>
                                <div className="text-muted-foreground">Interested</div>
                              </div>
                              <div className="text-muted-foreground">→</div>
                              <div className="flex-1 text-center">
                                <div className="font-bold">{campaign.meetings}</div>
                                <div className="text-muted-foreground">Meetings</div>
                              </div>
                              <div className="text-muted-foreground">→</div>
                              <div className="flex-1 text-center">
                                <div className="font-bold">{campaign.opportunities}</div>
                                <div className="text-muted-foreground">Opps</div>
                              </div>
                            </div>
                          </div>
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
