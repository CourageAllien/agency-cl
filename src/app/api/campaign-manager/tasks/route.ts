import { NextResponse } from 'next/server';
import { getMockTasks } from '@/lib/mock-data';

// In-memory task completion state (would be database in production)
const completedTasks = new Set<string>();

export async function GET() {
  try {
    const { daily, weekly } = getMockTasks();
    
    // Apply completion state
    const dailyWithStatus = daily.map(t => ({
      ...t,
      completed: completedTasks.has(t.id),
      completedAt: completedTasks.has(t.id) ? new Date().toISOString() : undefined,
    }));
    
    const weeklyWithStatus = weekly.map(t => ({
      ...t,
      completed: completedTasks.has(t.id),
      completedAt: completedTasks.has(t.id) ? new Date().toISOString() : undefined,
    }));

    return NextResponse.json({
      daily: dailyWithStatus,
      weekly: weeklyWithStatus,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { taskId, completed } = await request.json();
    
    if (completed) {
      completedTasks.add(taskId);
    } else {
      completedTasks.delete(taskId);
    }

    return NextResponse.json({ 
      success: true, 
      taskId, 
      completed,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
