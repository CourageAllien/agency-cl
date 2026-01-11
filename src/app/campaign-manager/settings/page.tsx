"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BENCHMARKS } from "@/lib/engine/benchmarks";
import {
  Settings,
  Key,
  Database,
  Bell,
  RefreshCw,
  Save,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";

interface CustomBenchmark {
  id: string;
  name: string;
  value: number;
  unit: string;
  dataSource: string;
  description: string;
}

interface BenchmarkState {
  criticalReplyRate: number;
  lowReplyRate: number;
  goodReplyRate: number;
  criticalConversion: number;
  targetConversion: number;
  aspirationalConversion: number;
  criticalUncontacted: number;
  warningUncontacted: number;
  earlyStage: number;
  viableThreshold: number;
  tamExhausted: number;
  healthyInbox: number;
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [benchmarks, setBenchmarks] = useState<BenchmarkState>({
    criticalReplyRate: BENCHMARKS.CRITICAL_REPLY_RATE,
    lowReplyRate: BENCHMARKS.LOW_REPLY_RATE,
    goodReplyRate: BENCHMARKS.GOOD_REPLY_RATE,
    criticalConversion: BENCHMARKS.CRITICAL_CONVERSION,
    targetConversion: BENCHMARKS.TARGET_CONVERSION,
    aspirationalConversion: BENCHMARKS.ASPIRATIONAL_CONVERSION,
    criticalUncontacted: BENCHMARKS.CRITICAL_UNCONTACTED,
    warningUncontacted: BENCHMARKS.WARNING_UNCONTACTED,
    earlyStage: BENCHMARKS.EARLY_STAGE,
    viableThreshold: BENCHMARKS.VIABLE_THRESHOLD,
    tamExhausted: BENCHMARKS.TAM_EXHAUSTED,
    healthyInbox: BENCHMARKS.HEALTHY_INBOX,
  });

  const [customBenchmarks, setCustomBenchmarks] = useState<CustomBenchmark[]>([
    {
      id: "1",
      name: "Weekly Meeting Target",
      value: 15,
      unit: "meetings",
      dataSource: "opportunities",
      description: "Target qualified meetings per month for Tier 1a clients",
    },
    {
      id: "2",
      name: "Positive Reply Rate Tier 1",
      value: 18,
      unit: "%",
      dataSource: "replyRate",
      description: "Target positive reply rate for Make Money offers with strong TAM",
    },
  ]);

  const [newBenchmark, setNewBenchmark] = useState<Partial<CustomBenchmark>>({
    name: "",
    value: 0,
    unit: "%",
    dataSource: "replyRate",
    description: "",
  });

  const [editingBenchmark, setEditingBenchmark] = useState<CustomBenchmark | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(new Date());

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleSync = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLastSync(new Date());
    setIsSaving(false);
  };

  const handleAddBenchmark = () => {
    if (!newBenchmark.name || newBenchmark.value === undefined) return;
    
    const benchmark: CustomBenchmark = {
      id: Date.now().toString(),
      name: newBenchmark.name,
      value: newBenchmark.value,
      unit: newBenchmark.unit || "%",
      dataSource: newBenchmark.dataSource || "replyRate",
      description: newBenchmark.description || "",
    };
    
    setCustomBenchmarks((prev) => [...prev, benchmark]);
    setNewBenchmark({
      name: "",
      value: 0,
      unit: "%",
      dataSource: "replyRate",
      description: "",
    });
    setShowAddDialog(false);
  };

  const handleEditBenchmark = () => {
    if (!editingBenchmark) return;
    
    setCustomBenchmarks((prev) =>
      prev.map((b) => (b.id === editingBenchmark.id ? editingBenchmark : b))
    );
    setEditingBenchmark(null);
    setShowEditDialog(false);
  };

  const handleDeleteBenchmark = (id: string) => {
    setCustomBenchmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const DATA_SOURCES = [
    { value: "replyRate", label: "Reply Rate" },
    { value: "conversionRate", label: "Conversion Rate" },
    { value: "opportunities", label: "Opportunities" },
    { value: "totalSent", label: "Total Sent" },
    { value: "uncontactedLeads", label: "Uncontacted Leads" },
    { value: "inboxHealth", label: "Inbox Health Score" },
    { value: "positiveReplies", label: "Positive Replies" },
    { value: "meetingsBooked", label: "Meetings Booked" },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure benchmarks, API connections, and preferences
        </p>
      </div>

      <Tabs defaultValue="benchmarks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="benchmarks" className="gap-2">
            <Zap className="h-4 w-4" />
            Benchmarks
          </TabsTrigger>
          <TabsTrigger value="custom-benchmarks" className="gap-2">
            <Plus className="h-4 w-4" />
            Custom Benchmarks
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Database className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Default Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Reply Rate Thresholds</CardTitle>
              <CardDescription>
                Set the thresholds for classifying reply rate performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Critical (Copy Issue)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={benchmarks.criticalReplyRate}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          criticalReplyRate: parseFloat(e.target.value),
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Below this = Copy Issue bucket
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Low (Needs Attention)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={benchmarks.lowReplyRate}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          lowReplyRate: parseFloat(e.target.value),
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Below this = needs attention
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Good (Copy Working)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={benchmarks.goodReplyRate}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          goodReplyRate: parseFloat(e.target.value),
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Above this = copy is working
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Conversion Thresholds</CardTitle>
              <CardDescription>
                Reply to meeting conversion rate benchmarks (Weekly: 40% positive reply to meeting rate)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Critical Conversion
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={benchmarks.criticalConversion}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          criticalConversion: parseInt(e.target.value),
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Below this = Subsequence Issue bucket
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Target Conversion
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={benchmarks.targetConversion}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          targetConversion: parseInt(e.target.value),
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum acceptable target
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Aspirational Conversion
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={benchmarks.aspirationalConversion}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          aspirationalConversion: parseInt(e.target.value),
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Goal target (40% documented)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Lead Volume Thresholds</CardTitle>
              <CardDescription>
                Uncontacted lead thresholds for volume alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Critical Uncontacted
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={benchmarks.criticalUncontacted}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          criticalUncontacted: parseInt(e.target.value),
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">leads</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Below this = Volume Issue bucket
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Warning Uncontacted
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={benchmarks.warningUncontacted}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          warningUncontacted: parseInt(e.target.value),
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">leads</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Start planning for new leads
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Campaign Stage Thresholds</CardTitle>
              <CardDescription>
                Lifetime send thresholds for campaign classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Early Stage
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={benchmarks.earlyStage}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          earlyStage: parseInt(e.target.value),
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">sends</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Below this = Too Early bucket
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Viable Threshold
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={benchmarks.viableThreshold}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          viableThreshold: parseInt(e.target.value),
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">sends</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enough data to judge viability
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    TAM Exhausted
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={benchmarks.tamExhausted}
                      onChange={(e) =>
                        setBenchmarks((prev) => ({
                          ...prev,
                          tamExhausted: parseInt(e.target.value),
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">sends</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consider recycling leads
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* Custom Benchmarks Tab */}
        <TabsContent value="custom-benchmarks" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Custom Benchmarks</CardTitle>
                <CardDescription>
                  Add your own benchmarks based on offer type, TAM, and mechanism strength
                </CardDescription>
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Benchmark
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Benchmark</DialogTitle>
                    <DialogDescription>
                      Create a new benchmark based on your specific criteria
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Benchmark Name</label>
                      <Input
                        placeholder="e.g., Tier 1a Meeting Target"
                        value={newBenchmark.name}
                        onChange={(e) => setNewBenchmark((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Target Value</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={newBenchmark.value}
                          onChange={(e) => setNewBenchmark((prev) => ({ ...prev, value: parseFloat(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Unit</label>
                        <Select
                          value={newBenchmark.unit}
                          onValueChange={(value) => setNewBenchmark((prev) => ({ ...prev, unit: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="%">Percentage (%)</SelectItem>
                            <SelectItem value="meetings">Meetings</SelectItem>
                            <SelectItem value="leads">Leads</SelectItem>
                            <SelectItem value="sends">Sends</SelectItem>
                            <SelectItem value="replies">Replies</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Source</label>
                      <Select
                        value={newBenchmark.dataSource}
                        onValueChange={(value) => setNewBenchmark((prev) => ({ ...prev, dataSource: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_SOURCES.map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        placeholder="Describe when this benchmark applies"
                        value={newBenchmark.description}
                        onChange={(e) => setNewBenchmark((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddBenchmark}>Add Benchmark</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {customBenchmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Zap className="mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">No custom benchmarks</p>
                  <p className="text-sm text-muted-foreground">
                    Add benchmarks for different offer types and tiers
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customBenchmarks.map((benchmark) => (
                    <div
                      key={benchmark.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{benchmark.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {benchmark.value} {benchmark.unit}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {DATA_SOURCES.find(s => s.value === benchmark.dataSource)?.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{benchmark.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingBenchmark(benchmark);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBenchmark(benchmark.id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Benchmarks Reference */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Performance Benchmarks by Offer Type</CardTitle>
              <CardDescription>
                Reference table from Courage Weekly/Daily Tasks + KPIs document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-medium text-muted-foreground">Tier</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Offer Type</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Mechanism</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">TAM</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Booking Target</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Reply Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2">1a</td>
                      <td className="py-2">Make Money</td>
                      <td className="py-2">Medium/Strong</td>
                      <td className="py-2">Strong (100k+)</td>
                      <td className="py-2 font-medium text-foreground">15 meetings/mo</td>
                      <td className="py-2 font-medium text-green-400">18%</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2">2a</td>
                      <td className="py-2">Make Money</td>
                      <td className="py-2">Medium/Strong</td>
                      <td className="py-2">Weak (&lt;100k)</td>
                      <td className="py-2 font-medium text-foreground">10 meetings/mo</td>
                      <td className="py-2 font-medium text-green-400">18%</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2">2a</td>
                      <td className="py-2">Make Money</td>
                      <td className="py-2">Weak</td>
                      <td className="py-2">Strong</td>
                      <td className="py-2 font-medium text-foreground">10 meetings/mo</td>
                      <td className="py-2 font-medium text-yellow-400">13%</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2">2b</td>
                      <td className="py-2">Save Money/Time</td>
                      <td className="py-2">Medium/Strong</td>
                      <td className="py-2">Strong</td>
                      <td className="py-2 font-medium text-foreground">10 meetings/mo</td>
                      <td className="py-2 font-medium text-yellow-400">10%</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2">3a</td>
                      <td className="py-2">Make Money</td>
                      <td className="py-2">Weak</td>
                      <td className="py-2">Weak</td>
                      <td className="py-2 font-medium text-foreground">5 meetings/mo</td>
                      <td className="py-2 font-medium text-yellow-400">13%</td>
                    </tr>
                    <tr>
                      <td className="py-2">3b</td>
                      <td className="py-2">Save Money/Time</td>
                      <td className="py-2">Weak</td>
                      <td className="py-2">Weak</td>
                      <td className="py-2 font-medium text-foreground">5 meetings/mo</td>
                      <td className="py-2 font-medium text-red-400">6%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ExternalLink className="h-5 w-5" />
                Instantly API
              </CardTitle>
              <CardDescription>
                Connect to Instantly for campaign data sync
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Connected</div>
                    <div className="text-sm text-muted-foreground">
                      Last synced: {lastSync?.toLocaleString() || "Never"}
                    </div>
                  </div>
                </div>
                <Button onClick={handleSync} variant="outline" className="gap-2">
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync Now
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Instantly API key"
                    className="flex-1"
                  />
                  <Button variant="outline">
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://app.instantly.ai/app/settings/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Instantly Settings → Integrations
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Coming Soon</CardTitle>
              <CardDescription>
                Future integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { name: "Apollo", description: "Lead data enrichment" },
                  { name: "Slack", description: "Notifications & alerts" },
                  { name: "Supabase", description: "Data persistence" },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="rounded-lg border border-dashed border-border p-4 text-center opacity-50"
                  >
                    <div className="text-sm font-medium text-foreground">
                      {integration.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {integration.description}
                    </div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      Coming Soon
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>
                Configure when and how you receive alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">
                  Coming Soon
                </p>
                <p className="text-sm text-muted-foreground">
                  Notification settings will be available in a future update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Benchmark</DialogTitle>
            <DialogDescription>
              Update your custom benchmark settings
            </DialogDescription>
          </DialogHeader>
          {editingBenchmark && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Benchmark Name</label>
                <Input
                  value={editingBenchmark.name}
                  onChange={(e) => setEditingBenchmark({ ...editingBenchmark, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Value</label>
                  <Input
                    type="number"
                    value={editingBenchmark.value}
                    onChange={(e) => setEditingBenchmark({ ...editingBenchmark, value: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit</label>
                  <Select
                    value={editingBenchmark.unit}
                    onValueChange={(value) => setEditingBenchmark({ ...editingBenchmark, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="%">Percentage (%)</SelectItem>
                      <SelectItem value="meetings">Meetings</SelectItem>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="sends">Sends</SelectItem>
                      <SelectItem value="replies">Replies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Source</label>
                <Select
                  value={editingBenchmark.dataSource}
                  onValueChange={(value) => setEditingBenchmark({ ...editingBenchmark, dataSource: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editingBenchmark.description}
                  onChange={(e) => setEditingBenchmark({ ...editingBenchmark, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEditBenchmark}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
