"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getMockTasks } from "@/lib/mock-data";
import { CATEGORY_LABELS, SEVERITY_STYLES } from "@/types/task";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DailyTasksProps {
  filterClient?: string;
}

export function DailyTasks({ filterClient = "all" }: DailyTasksProps) {
  const { daily: allDaily } = getMockTasks();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const daily = useMemo(() => {
    if (filterClient === "all") return allDaily;
    return allDaily.filter((t) => t.clientName === filterClient);
  }, [allDaily, filterClient]);

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

  const pendingTasks = daily.filter((t) => !completedIds.has(t.id));
  const completedTasks = daily.filter((t) => completedIds.has(t.id));
  const criticalCount = pendingTasks.filter(
    (t) => t.severity === "critical"
  ).length;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Today's Tasks
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-assigned based on analysis
          </p>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <Badge variant="danger" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} critical
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            {pendingTasks.length} pending
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {pendingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 h-12 w-12 text-green-400" />
              <p className="text-lg font-medium text-foreground">
                {filterClient === "all" ? "All tasks completed!" : "No tasks for this client"}
              </p>
              <p className="text-sm text-muted-foreground">
                {filterClient === "all" 
                  ? "Great work today. Check back tomorrow for new tasks."
                  : "This client has no pending tasks."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task, index) => {
                const styles = SEVERITY_STYLES[task.severity];
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "rounded-lg border border-border p-4 transition-all duration-200",
                      "animate-fadeIn border-l-4",
                      styles.border,
                      styles.bg
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={completedIds.has(task.id)}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {task.title}
                          </span>
                        </div>
                        <p className="mb-3 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {CATEGORY_LABELS[task.category] || task.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", styles.text)}
                          >
                            {task.severity}
                          </Badge>
                          {filterClient === "all" && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {task.clientName}
                            </Badge>
                          )}
                          {typeof task.metrics?.replyRate === "number" && (
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              {formatPercentage(task.metrics.replyRate)} RR
                            </Badge>
                          )}
                          {typeof task.metrics?.uncontactedLeads === "number" && (
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              {formatNumber(task.metrics.uncontactedLeads)} leads
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {completedTasks.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                {completedTasks.length} completed today
              </summary>
              <div className="mt-3 space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground line-through opacity-60"
                  >
                    <Checkbox checked disabled className="opacity-50" />
                    {task.title}
                  </div>
                ))}
              </div>
            </details>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
