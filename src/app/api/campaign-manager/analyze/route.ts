import { NextResponse } from 'next/server';
import { getMockClassifications, getMockInboxHealth, getMockTasks, getMockWeeklyTrends } from '@/lib/mock-data';

export async function GET() {
  try {
    // In production, this would fetch from database after sync
    const classifications = getMockClassifications();
    const inboxHealth = getMockInboxHealth();
    const weeklyTrends = getMockWeeklyTrends();
    const tasks = getMockTasks();

    // Group classifications by bucket
    const byBucket = classifications.reduce((acc, c) => {
      acc[c.bucket] = (acc[c.bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      classifications,
      inboxHealth,
      weeklyTrends,
      tasks,
      summary: {
        totalClients: classifications.length,
        byBucket,
        criticalTasks: tasks.daily.filter(t => t.severity === 'critical').length,
        analyzedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
