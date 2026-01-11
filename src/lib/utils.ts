import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function calculateHealthScore(metrics: {
  replyRate: number;
  conversionRate: number;
  avgInboxHealth: number;
  uncontactedLeads: number;
}): number {
  // Weighted health score calculation
  const weights = {
    replyRate: 0.3,
    conversion: 0.25,
    inbox: 0.25,
    leads: 0.2,
  };

  // Normalize each metric to 0-100
  const replyScore = Math.min(metrics.replyRate / 2 * 100, 100);
  const conversionScore = Math.min(metrics.conversionRate / 40 * 100, 100);
  const inboxScore = metrics.avgInboxHealth;
  const leadsScore = Math.min(metrics.uncontactedLeads / 10000 * 100, 100);

  return Math.round(
    replyScore * weights.replyRate +
    conversionScore * weights.conversion +
    inboxScore * weights.inbox +
    leadsScore * weights.leads
  );
}

export function getDaysUntil(date: string | Date): number {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000);
}

export function isOverdue(date: string | Date): boolean {
  return getDaysUntil(date) < 0;
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const value = String(item[key]);
    if (!groups[value]) {
      groups[value] = [];
    }
    groups[value].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
