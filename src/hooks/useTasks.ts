"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMockTasks } from "@/lib/mock-data";
import type { AutoTask, TaskType } from "@/types/task";

interface TasksData {
  daily: AutoTask[];
  weekly: AutoTask[];
  lastUpdated: string;
}

export function useTasks(type?: TaskType) {
  const queryClient = useQueryClient();

  const query = useQuery<TasksData>({
    queryKey: ["tasks"],
    queryFn: async () => {
      // In production, this would be an API call
      // const response = await fetch('/api/campaign-manager/tasks');
      // return response.json();
      
      // For now, return mock data
      const { daily, weekly } = getMockTasks();
      return {
        daily,
        weekly,
        lastUpdated: new Date().toISOString(),
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const toggleMutation = useMutation({
    mutationFn: async (taskId: string) => {
      // In production, this would be an API call
      // await fetch('/api/campaign-manager/tasks', {
      //   method: 'PATCH',
      //   body: JSON.stringify({ taskId, completed: !currentStatus }),
      // });
      return { taskId, completed: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const tasks = type
    ? type === "daily"
      ? query.data?.daily ?? []
      : query.data?.weekly ?? []
    : [...(query.data?.daily ?? []), ...(query.data?.weekly ?? [])];

  return {
    tasks,
    daily: query.data?.daily ?? [],
    weekly: query.data?.weekly ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    toggleTask: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
    refetch: query.refetch,
  };
}

export function useTaskSummary() {
  const { daily, weekly, isLoading } = useTasks();

  const pendingDaily = daily.filter((t) => !t.completed);
  const pendingWeekly = weekly.filter((t) => !t.completed);
  const criticalTasks = [...pendingDaily, ...pendingWeekly].filter(
    (t) => t.severity === "critical"
  );

  return {
    totalPending: pendingDaily.length + pendingWeekly.length,
    criticalCount: criticalTasks.length,
    dailyCount: pendingDaily.length,
    weeklyCount: pendingWeekly.length,
    isLoading,
  };
}
