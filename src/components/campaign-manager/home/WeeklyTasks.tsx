"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getMockTasks } from "@/lib/mock-data";
import { CATEGORY_LABELS, SEVERITY_STYLES } from "@/types/task";
import { Calendar, TrendingUp } from "lucide-react";

interface WeeklyTasksProps {
  filterClient?: string;
}

export function WeeklyTasks({ filterClient = "all" }: WeeklyTasksProps) {
  const { weekly: allWeekly } = getMockTasks();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const weekly = useMemo(() => {
    if (filterClient === "all") return allWeekly;
    return allWeekly.filter((t) => t.clientName === filterClient);
  }, [allWeekly, filterClient]);

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

  const pendingTasks = weekly.filter((t) => !completedIds.has(t.id));
  const completedTasks = weekly.filter((t) => completedIds.has(t.id));

  // Get end of week
  const now = new Date();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  const friday = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
  const formattedFriday = friday.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-blue-400" />
            Weekly Review
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Due by {formattedFriday}
          </p>
        </div>
        <Badge variant="info" className="text-xs">
          {pendingTasks.length} items
        </Badge>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {pendingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">
                {filterClient === "all" ? "No weekly tasks" : "No weekly tasks for this client"}
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
                          {filterClient === "all" && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {task.clientName}
                            </Badge>
                          )}
                          {task.category === "trends" && (
                            <Badge variant="warning" className="flex items-center gap-1 text-xs">
                              <TrendingUp className="h-3 w-3" />
                              Trend
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {completedTasks.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    {completedTasks.length} completed this week
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
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
