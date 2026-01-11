"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTasks, useDashboardData } from "@/hooks/useDashboardData";
import { BUCKET_CONFIGS, type IssueBucket } from "@/types/analysis";
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Filter,
  X,
  Users,
  RefreshCw,
} from "lucide-react";

export default function TasksPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardData();
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const dailyTasks = data?.tasks.daily || [];
  const weeklyTasks = data?.tasks.weekly || [];
  const clients = data?.clients || [];

  const clientNames = useMemo(() => {
    return ["all", ...clients.map((c) => c.name).sort()];
  }, [clients]);

  const filteredDailyTasks = useMemo(() => {
    if (selectedClient === "all") return dailyTasks;
    return dailyTasks.filter((t) => t.clientName === selectedClient);
  }, [dailyTasks, selectedClient]);

  const filteredWeeklyTasks = useMemo(() => {
    if (selectedClient === "all") return weeklyTasks;
    return weeklyTasks.filter((t) => t.clientName === selectedClient);
  }, [weeklyTasks, selectedClient]);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const dailyCompleted = filteredDailyTasks.filter(
    (t) => t.completed || completedTasks.has(t.id)
  ).length;

  const weeklyCompleted = filteredWeeklyTasks.filter(
    (t) => t.completed || completedTasks.has(t.id)
  ).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to load tasks</h2>
        <p className="text-muted-foreground">{error?.message || "Unknown error"}</p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const TaskItem = ({ task, isCompleted }: { task: typeof dailyTasks[0]; isCompleted: boolean }) => {
    const config = BUCKET_CONFIGS[task.bucket as IssueBucket];
    
    return (
      <div
        className={cn(
          "flex items-start gap-3 p-4 rounded-lg border transition-all",
          isCompleted
            ? "bg-muted/30 border-border opacity-60"
            : "bg-card border-border hover:border-primary/30"
        )}
      >
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => toggleTask(task.id)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "font-medium",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>
            {task.priority === "critical" && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            {task.priority === "high" && (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {task.clientName}
            </Badge>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                config?.color === "destructive" && "bg-red-500/10 text-red-500",
                config?.color === "warning" && "bg-yellow-500/10 text-yellow-500",
                config?.color === "success" && "bg-green-500/10 text-green-500"
              )}
            >
              {config?.label || task.bucket}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </span>
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-muted-foreground">
            Auto-generated tasks based on client classifications
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px]">
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
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Badge */}
      {selectedClient !== "all" && (
        <Badge variant="outline" className="gap-2 px-3 py-1.5">
          <Users className="h-3 w-3" />
          Showing tasks for: <span className="font-semibold">{selectedClient}</span>
        </Badge>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Daily Tasks</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{dailyCompleted}</span>
              <span className="text-muted-foreground">
                /{filteredDailyTasks.length} done
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-muted-foreground">Weekly Tasks</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{weeklyCompleted}</span>
              <span className="text-muted-foreground">
                /{filteredWeeklyTasks.length} done
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Completion Rate</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {filteredDailyTasks.length + filteredWeeklyTasks.length > 0
                  ? Math.round(
                      ((dailyCompleted + weeklyCompleted) /
                        (filteredDailyTasks.length + filteredWeeklyTasks.length)) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="daily" className="gap-2">
            <Clock className="h-4 w-4" />
            Daily ({filteredDailyTasks.length})
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <Calendar className="h-4 w-4" />
            Weekly ({filteredWeeklyTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Daily Tasks</CardTitle>
                <Badge variant="secondary">
                  {dailyCompleted}/{filteredDailyTasks.length} complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDailyTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All caught up! No daily tasks pending.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDailyTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isCompleted={task.completed || completedTasks.has(task.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Weekly Tasks</CardTitle>
                <Badge variant="secondary">
                  {weeklyCompleted}/{filteredWeeklyTasks.length} complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredWeeklyTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No weekly tasks scheduled.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWeeklyTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isCompleted={task.completed || completedTasks.has(task.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
