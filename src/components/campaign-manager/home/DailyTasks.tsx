"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BUCKET_CONFIGS, type IssueBucket } from "@/types/analysis";
import { Clock, AlertCircle } from "lucide-react";

interface DailyTask {
  id: string;
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  bucket: IssueBucket;
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string;
  completed: boolean;
}

interface DailyTasksProps {
  filterClient?: string;
  tasks?: DailyTask[];
}

export function DailyTasks({ filterClient = "all", tasks = [] }: DailyTasksProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterClient !== "all") {
      result = result.filter((t) => t.clientName === filterClient);
    }
    return result;
  }, [tasks, filterClient]);

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

  const completedCount = filteredTasks.filter(
    (t) => t.completed || completedTasks.has(t.id)
  ).length;

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-lg font-semibold">Daily Tasks</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{filteredTasks.length} done
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No daily tasks. All caught up! 🎉
          </p>
        ) : (
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isCompleted = task.completed || completedTasks.has(task.id);
                const config = BUCKET_CONFIGS[task.bucket];
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-all",
                      isCompleted
                        ? "bg-muted/30 border-border opacity-60"
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isCompleted && "line-through text-muted-foreground"
                          )}
                        >
                          {task.title}
                        </span>
                        {task.priority === "critical" && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor:
                              config?.color === "destructive"
                                ? "rgb(239 68 68 / 0.3)"
                                : config?.color === "warning"
                                ? "rgb(234 179 8 / 0.3)"
                                : undefined,
                          }}
                        >
                          {task.clientName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {config?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
