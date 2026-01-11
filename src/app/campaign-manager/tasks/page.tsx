"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getMockTasks, getMockClassifications } from "@/lib/mock-data";
import { CATEGORY_LABELS, SEVERITY_STYLES, type AutoTask } from "@/types/task";
import { BUCKET_CONFIGS } from "@/types/analysis";
import { formatNumber, formatPercentage } from "@/lib/utils";
import {
  Search,
  CheckSquare,
  Clock,
  Calendar,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Users,
  X,
} from "lucide-react";

type FilterType = "all" | "critical" | "high" | "medium" | "low";

export default function TasksPage() {
  const { daily, weekly } = getMockTasks();
  const classifications = getMockClassifications();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<FilterType>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");

  const clientNames = useMemo(() => {
    const names = new Set<string>();
    [...daily, ...weekly].forEach((task) => names.add(task.clientName));
    return ["all", ...Array.from(names).sort()];
  }, [daily, weekly]);

  const toggleTask = (taskId: string) => {
    setCompletedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const filterTasks = (tasks: AutoTask[]) => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity =
        filterSeverity === "all" || task.severity === filterSeverity;
      const matchesClient =
        selectedClient === "all" || task.clientName === selectedClient;
      return matchesSearch && matchesSeverity && matchesClient;
    });
  };

  const allTasks = [...daily, ...weekly];
  const filteredTasks = filterTasks(allTasks);
  const pendingTasks = filteredTasks.filter((t) => !completedIds.has(t.id));
  const completedTasks = filteredTasks.filter((t) => completedIds.has(t.id));

  const severityCounts = allTasks.reduce(
    (acc, task) => {
      if (!completedIds.has(task.id)) {
        acc[task.severity] = (acc[task.severity] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const TaskItem = ({ task, index }: { task: AutoTask; index: number }) => {
    const styles = SEVERITY_STYLES[task.severity];
    const bucketConfig = BUCKET_CONFIGS[task.bucket];
    const isCompleted = completedIds.has(task.id);

    return (
      <div
        className={cn(
          "group rounded-lg border p-4 transition-all duration-200",
          isCompleted ? "opacity-50" : "hover:shadow-md",
          styles.border,
          styles.bg
        )}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => toggleTask(task.id)}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className={cn("text-lg", isCompleted && "line-through")}>
                {bucketConfig.icon}
              </span>
              <span
                className={cn(
                  "font-medium text-foreground",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </span>
            </div>
            <p
              className={cn(
                "mb-3 text-sm text-muted-foreground",
                isCompleted && "line-through"
              )}
            >
              {task.description}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {CATEGORY_LABELS[task.category] || task.category}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", styles.text)}>
                {task.severity}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                {task.type === "daily" ? (
                  <Clock className="mr-1 h-3 w-3" />
                ) : (
                  <Calendar className="mr-1 h-3 w-3" />
                )}
                {task.type}
              </Badge>
              {typeof task.metrics?.replyRate === "number" && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {formatPercentage(task.metrics.replyRate as number)} RR
                </Badge>
              )}
              {typeof task.metrics?.uncontactedLeads === "number" && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {formatNumber(task.metrics.uncontactedLeads as number)} leads
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="mb-1">
              Due: {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            <div className="text-muted-foreground/60">
              {task.clientName}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">
            {pendingTasks.length} pending tasks across all categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          {severityCounts.critical > 0 && (
            <Badge variant="danger" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {severityCounts.critical} critical
            </Badge>
          )}
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {completedTasks.length} done
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Client Filter */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              {clientNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name === "all" ? "All Clients" : name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient !== "all" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedClient("all")}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant={filterSeverity === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSeverity("all")}
          >
            All
          </Button>
          <Button
            variant={filterSeverity === "critical" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSeverity("critical")}
            className="gap-1"
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Critical
          </Button>
          <Button
            variant={filterSeverity === "high" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSeverity("high")}
            className="gap-1"
          >
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            High
          </Button>
          <Button
            variant={filterSeverity === "medium" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSeverity("medium")}
            className="gap-1"
          >
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            Medium
          </Button>
          <Button
            variant={filterSeverity === "low" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSeverity("low")}
            className="gap-1"
          >
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Low
          </Button>
        </div>
      </div>

      {/* Filtered Client Info Badge */}
      {selectedClient !== "all" && (
        <Badge variant="outline" className="gap-2 px-3 py-1.5 text-sm">
          <Users className="h-3 w-3" />
          Showing tasks for: <span className="font-semibold">{selectedClient}</span>
        </Badge>
      )}

      {/* Tasks */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-2">
            Daily ({filterTasks(daily).filter((t) => !completedIds.has(t.id)).length})
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            Weekly ({filterTasks(weekly).filter((t) => !completedIds.has(t.id)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingTasks.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="mb-3 h-12 w-12 text-green-400" />
                <p className="text-lg font-medium text-foreground">
                  {selectedClient === "all" ? "All tasks completed!" : "No tasks for this client!"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedClient === "all" 
                    ? "Great work. Check back for new tasks."
                    : "Try selecting a different client."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task, index) => (
                <TaskItem key={task.id} task={task} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTasks.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckSquare className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">
                  No completed tasks yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Complete some tasks to see them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task, index) => (
                <TaskItem key={task.id} task={task} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <div className="space-y-3">
            {filterTasks(daily)
              .filter((t) => !completedIds.has(t.id))
              .map((task, index) => (
                <TaskItem key={task.id} task={task} index={index} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <div className="space-y-3">
            {filterTasks(weekly)
              .filter((t) => !completedIds.has(t.id))
              .map((task, index) => (
                <TaskItem key={task.id} task={task} index={index} />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
