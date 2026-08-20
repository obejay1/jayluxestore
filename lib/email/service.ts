import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

import { adminDb } from '@/lib/firebaseAdmin';
import { getEmailConfig, getEmailSender, type EmailSenderKind } from '@/lib/email/config';

type ManagedEmailTemplate = {
  id: string;
  variables: Record<string, string | number>;
};

type ManagedEmailInput = {
  eventKey: string;
  emailType: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: ManagedEmailTemplate;
  sender: EmailSenderKind;
  replyTo?: string;
  orderId?: string;
  userId?: string;
  scheduledAt?: string;
  headers?: Record<string, string>;
};

export type ManagedEmailResult = {
  ok: boolean;
  skipped?: boolean;
  status: 'sent' | 'scheduled' | 'duplicate' | 'in_progress' | 'failed' | 'not_configured';
  resendId?: string | null;
  error?: string;
};

const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

const SIMPLE_EMAIL_PATTERN = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

function isValidEmailAddress(value: string) {
  return SIMPLE_EMAIL_PATTERN.test(value);
}

function normalizeRecipient(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const namedAddress = trimmed.match(/^(.+?)\s*<([^<>]+)>$/);
  if (namedAddress) {
    const displayName = namedAddress[1].trim();
    const email = namedAddress[2].trim().toLowerCase();

    if (!displayName || !isValidEmailAddress(email)) return null;
    return `${displayName} <${email}>`;
  }

  const email = trimmed.toLowerCase();
  return isValidEmailAddress(email) ? email : null;
}

function normalizeRecipients(value: string | string[]) {
  const rawRecipients = (Array.isArray(value) ? value : [value])
    .flatMap((recipient) => {
      const trimmed = recipient.trim();
      if (!trimmed) return [];

      // Preserve display-name addresses such as "JayLuxe <hello@example.com>".
      // Plain comma/semicolon-separated addresses are expanded for convenience.
      if (trimmed.includes('<') || trimmed.includes('>')) return [trimmed];

      return trimmed
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    });

  const recipients: string[] = [];
  const invalidRecipients: string[] = [];

  for (const rawRecipient of rawRecipients) {
    const normalized = normalizeRecipient(rawRecipient);
    if (normalized) recipients.push(normalized);
    else invalidRecipients.push(rawRecipient);
  }

  return { recipients, invalidRecipients };
}

function eventDocumentId(eventKey: string, recipients: string[]) {
  return createHash('sha256')
    .update(`${eventKey}|${recipients.join(',')}`)
    .digest('hex');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown email error');
}

export async function sendManagedEmail(input: ManagedEmailInput): Promise<ManagedEmailResult> {
  const { recipients: originalRecipients, invalidRecipients } = normalizeRecipients(input.to);

  if (originalRecipients.length === 0 && invalidRecipients.length === 0) {
    return { ok: false, status: 'failed', error: 'Email recipient is missing.' };
  }

  if (invalidRecipients.length > 0) {
    console.error(`EMAIL RECIPIENT VALIDATION ERROR [${input.emailType}]`, {
      invalidRecipientCount: invalidRecipients.length,
    });
    return {
      ok: false,
      status: 'failed',
      error: 'One or more recipient email addresses are invalid.',
    };
  }

  const templateId = input.template?.id.trim() || '';
  const hasHtmlFallback = Boolean(input.html?.trim());

  if (!templateId && !hasHtmlFallback) {
    return {
      ok: false,
      status: 'failed',
      error: 'Email content is missing. Provide HTML content or a Resend template.',
    };
  }

  const config = getEmailConfig();
  const from = getEmailSender(input.sender);
  const eventId = eventDocumentId(input.eventKey, originalRecipients);
  const eventRef = adminDb.collection('emailEvents').doc(eventId);
  const now = Date.now();

  const claim = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    const data = snapshot.data() || {};
    const status = String(data.status || '');
    const updatedAtMs = Number(data.updatedAtMs || 0);

    if (status === 'sent' || status === 'scheduled') {
      return status === 'scheduled' ? 'duplicate' : 'duplicate';
    }

    if (status === 'sending' && updatedAtMs > 0 && now - updatedAtMs < CLAIM_TIMEOUT_MS) {
      return 'in_progress';
    }

    transaction.set(eventRef, {
      eventId: input.eventKey,
      emailType: input.emailType,
      orderId: input.orderId || null,
      userId: input.userId || null,
      recipient: originalRecipients.join(','),
      status: 'sending',
      attempts: Number(data.attempts || 0) + 1,
      createdAt: snapshot.exists ? data.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: now,
      error: null,
    }, { merge: true });

    return 'claimed';
  });

  if (claim === 'duplicate') {
    return { ok: true, skipped: true, status: 'duplicate' };
  }
  if (claim === 'in_progress') {
    return { ok: true, skipped: true, status: 'in_progress' };
  }

  if (!config.apiKey || !from) {
    const missing = !config.apiKey ? 'RESEND_API_KEY' : `${input.sender} sender address`;
    await eventRef.set({
      status: 'not_configured',
      error: `Missing ${missing}.`,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
    }, { merge: true });
    return { ok: false, status: 'not_configured', error: `Missing ${missing}.` };
  }

  const actualRecipients = originalRecipients;
  const subject = input.subject;

  try {
    const resend = new Resend(config.apiKey);
    const sendOptions = {
      idempotencyKey: `jl-${eventId}`,
    };
    const commonPayload = {
      from,
      to: actualRecipients,
      subject,
      replyTo: input.replyTo,
      scheduledAt: input.scheduledAt,
      headers: input.headers,
    };

    const { data, error } = templateId
      ? await resend.emails.send({
          ...commonPayload,
          template: {
            id: templateId,
            variables: input.template?.variables || {},
          },
        }, sendOptions)
      : await resend.emails.send({
          ...commonPayload,
          html: input.html || '',
          text: input.text,
        }, sendOptions);

    if (error) throw new Error(error.message);

    const finalStatus = input.scheduledAt ? 'scheduled' : 'sent';
    await eventRef.set({
      status: finalStatus,
      resendMessageId: data?.id || null,
      actualRecipient: actualRecipients.join(','),
      sender: from,
      subject,
      deliveryMode: templateId ? 'template' : 'html',
      templateId: templateId || null,
      scheduledAt: input.scheduledAt || null,
      sentAt: input.scheduledAt ? null : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
      error: null,
    }, { merge: true });

    return { ok: true, status: finalStatus, resendId: data?.id || null };
  } catch (error) {
    const message = errorMessage(error).slice(0, 1000);
    console.error(`EMAIL SEND ERROR [${input.emailType}]`, error);
    await eventRef.set({
      status: 'failed',
      error: message,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
    }, { merge: true });
    return { ok: false, status: 'failed', error: message };
  }
}

export async function verifyResendWebhook(input: {
  payload: string;
  id: string;
  timestamp: string;
  signature: string;
}) {
  const config = getEmailConfig();
  const webhookSecret = config.webhookSecret;
  if (!webhookSecret) {
    throw new Error('RESEND_WEBHOOK_SECRET is not configured.');
  }

  const resend = new Resend(config.apiKey || 're_webhook_verification_only');
  return resend.webhooks.verify({
    payload: input.payload,
    headers: {
      id: input.id,
      timestamp: input.timestamp,
      signature: input.signature,
    },
    webhookSecret,
  });
}
