"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TransformedClient } from "@/hooks/useDashboardData";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TrendSparklinesProps {
  filterClient?: string;
  clients?: TransformedClient[];
}

// Generate mock trend data for visualization
function generateTrendData(baseValue: number, variance: number = 0.2) {
  const points = 7; // Last 7 days
  const data = [];
  let value = baseValue * (1 - variance);
  
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * variance * baseValue;
    value = Math.max(0, value + change);
    if (i === points - 1) {
      value = baseValue; // End at current value
    }
    data.push({
      day: `Day ${i + 1}`,
      value: Number(value.toFixed(2)),
    });
  }
  return data;
}

export function TrendSparklines({ filterClient = "all", clients = [] }: TrendSparklinesProps) {
  const filteredClients = useMemo(() => {
    if (filterClient === "all") return clients;
    return clients.filter((c) => c.name === filterClient);
  }, [clients, filterClient]);

  const metrics = useMemo(() => {
    if (filteredClients.length === 0) {
      return {
        replyRate: { value: 0, trend: "stable" as const, data: [] },
        conversionRate: { value: 0, trend: "stable" as const, data: [] },
        healthScore: { value: 0, trend: "stable" as const, data: [] },
      };
    }

    const avgReplyRate =
      filteredClients.reduce((sum, c) => sum + c.metrics.replyRate, 0) / filteredClients.length;
    const avgConversionRate =
      filteredClients.reduce((sum, c) => sum + c.metrics.conversionRate, 0) / filteredClients.length;
    const avgHealthScore =
      filteredClients.reduce((sum, c) => sum + c.healthScore, 0) / filteredClients.length;

    // Simulate trends (in real app, this would come from historical data)
    const replyTrend = avgReplyRate > 1 ? "up" : avgReplyRate < 0.5 ? "down" : "stable";
    const conversionTrend = avgConversionRate > 30 ? "up" : avgConversionRate < 20 ? "down" : "stable";
    const healthTrend = avgHealthScore > 70 ? "up" : avgHealthScore < 50 ? "down" : "stable";

    return {
      replyRate: {
        value: avgReplyRate,
        trend: replyTrend as "up" | "down" | "stable",
        data: generateTrendData(avgReplyRate),
      },
      conversionRate: {
        value: avgConversionRate,
        trend: conversionTrend as "up" | "down" | "stable",
        data: generateTrendData(avgConversionRate),
      },
      healthScore: {
        value: avgHealthScore,
        trend: healthTrend as "up" | "down" | "stable",
        data: generateTrendData(avgHealthScore, 0.1),
      },
    };
  }, [filteredClients]);

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === "down") return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const trendColor = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return "#22c55e";
    if (trend === "down") return "#ef4444";
    return "#6b7280";
  };

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-400" />
          <CardTitle className="text-lg font-semibold">Trend Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {filteredClients.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No data available for trends.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Reply Rate Trend */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Reply Rate</div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{metrics.replyRate.value.toFixed(2)}%</span>
                    <TrendIcon trend={metrics.replyRate.trend} />
                  </div>
                </div>
              </div>
              <div className="w-24 h-8">
                {metrics.replyRate.data.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.replyRate.data}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={trendColor(metrics.replyRate.trend)}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip
                        contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }}
                        labelStyle={{ color: "#888" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Conversion Rate Trend */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Conversion Rate</div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{metrics.conversionRate.value.toFixed(2)}%</span>
                    <TrendIcon trend={metrics.conversionRate.trend} />
                  </div>
                </div>
              </div>
              <div className="w-24 h-8">
                {metrics.conversionRate.data.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.conversionRate.data}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={trendColor(metrics.conversionRate.trend)}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip
                        contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }}
                        labelStyle={{ color: "#888" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Health Score Trend */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Avg Health Score</div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{Math.round(metrics.healthScore.value)}%</span>
                    <TrendIcon trend={metrics.healthScore.trend} />
                  </div>
                </div>
              </div>
              <div className="w-24 h-8">
                {metrics.healthScore.data.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.healthScore.data}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={trendColor(metrics.healthScore.trend)}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip
                        contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }}
                        labelStyle={{ color: "#888" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
