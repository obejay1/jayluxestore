'use client';

export async function recordAdminActivity(input: {
  action: string;
  description: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch('/api/admin/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch (error) {
    console.error('Activity logging failed:', error);
  }
}
