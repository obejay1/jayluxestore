export type SystemEventType = 'error' | 'payment_failure' | 'email_failure' | 'security_warning';

export type SystemEvent = {
  type: SystemEventType;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export function createSystemEvent(type: SystemEventType, message: string, metadata?: Record<string, unknown>): SystemEvent {
  return { type, message, metadata, createdAt: new Date().toISOString() };
}
