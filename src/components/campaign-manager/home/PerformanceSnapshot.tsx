"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMockPortfolioMetrics, getMockHistoricalData } from "@/lib/mock-data";
import { formatNumber, formatPercentage } from "@/lib/utils";
import {
  Send,
  MessageSquare,
  Target,
  Mail,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: string;
  sparklineData?: { value: number }[];
}

function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  trendValue,
  color,
  sparklineData,
}: MetricCardProps) {
  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", color)} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-foreground">{value}</span>
              {subValue && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {subValue}
                </span>
              )}
            </div>
            {trend && trendValue && (
              <div
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs",
                  trend === "up" && "text-green-400",
                  trend === "down" && "text-red-400",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trend === "up" && <TrendingUp className="h-3 w-3" />}
                {trend === "down" && <TrendingDown className="h-3 w-3" />}
                {trend === "neutral" && <Minus className="h-3 w-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {sparklineData && (
            <div className="h-12 w-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color.includes("green") ? "#22c55e" : 
                           color.includes("blue") ? "#3b82f6" : 
                           color.includes("purple") ? "#a855f7" : 
                           "#8b5cf6"}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformanceSnapshot() {
  const metrics = getMockPortfolioMetrics();
  const historical = getMockHistoricalData();

  const replySparkline = historical.replyRateTrend.map(d => ({ value: d.value }));
  const oppSparkline = historical.opportunitiesTrend.map(d => ({ value: d.value }));
  const sentSparkline = historical.sentTrend.map(d => ({ value: d.value }));

  return (
    <>
      <MetricCard
        title="Total Sent"
        value={formatNumber(metrics.totalSent)}
        subValue="lifetime"
        icon={Send}
        trend="up"
        trendValue="+12% this week"
        color="text-blue-400"
        sparklineData={sentSparkline}
      />
      <MetricCard
        title="Reply Rate"
        value={formatPercentage(metrics.avgReplyRate)}
        subValue="average"
        icon={MessageSquare}
        trend="up"
        trendValue="+0.2% vs last week"
        color="text-green-400"
        sparklineData={replySparkline}
      />
      <MetricCard
        title="Opportunities"
        value={metrics.totalOpportunities}
        subValue="total"
        icon={Target}
        trend="up"
        trendValue="+18 this week"
        color="text-purple-400"
        sparklineData={oppSparkline}
      />
      <MetricCard
        title="Active Inboxes"
        value={metrics.activeInboxes}
        subValue={`${metrics.avgInboxHealth}% health`}
        icon={Mail}
        trend="neutral"
        trendValue="Stable"
        color="text-yellow-400"
      />
    </>
  );
}
