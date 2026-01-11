// Task Types

import { IssueBucket, Severity } from './analysis';

export type TaskType = 'daily' | 'weekly';

export type TaskCategory = 
  | 'volume'
  | 'copy'
  | 'subsequence'
  | 'deliverability'
  | 'recycle'
  | 'review'
  | 'monitor'
  | 'benchmark'
  | 'conversion'
  | 'trends';

export interface AutoTask {
  id: string;
  type: TaskType;
  bucket: IssueBucket;
  severity: Severity;
  clientName: string;
  campaignName?: string;
  title: string;
  description: string;
  category: TaskCategory;
  metrics: Record<string, number | string>;
  createdAt: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface TasksState {
  daily: AutoTask[];
  weekly: AutoTask[];
  lastUpdated: string;
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  volume: '📉 Volume',
  copy: '✍️ Copy',
  subsequence: '🔄 Subsequence',
  deliverability: '📧 Deliverability',
  recycle: '♻️ Recycle',
  review: '🔍 Review',
  monitor: '👁️ Monitor',
  benchmark: '📊 Benchmark',
  conversion: '🎯 Conversion',
  trends: '📈 Trends',
};

export const SEVERITY_STYLES: Record<Severity, { border: string; bg: string; text: string }> = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-500/5',
    text: 'text-red-400',
  },
  high: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-500/5',
    text: 'text-orange-400',
  },
  medium: {
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-500/5',
    text: 'text-yellow-400',
  },
  low: {
    border: 'border-l-green-500',
    bg: 'bg-green-500/5',
    text: 'text-green-400',
  },
};
