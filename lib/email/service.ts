import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

import { adminDb } from '@/lib/firebaseAdmin';
import { getEmailConfig, getEmailSender, type EmailSenderKind } from '@/lib/email/config';

type ManagedEmailInput = {
  eventKey: string;
  emailType: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
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

function normalizeRecipients(value: string | string[]) {
  return (Array.isArray(value) ? value : [value])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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
  const originalRecipients = normalizeRecipients(input.to);
  if (originalRecipients.length === 0) {
    return { ok: false, status: 'failed', error: 'Email recipient is missing.' };
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
    const { data, error } = await resend.emails.send({
      from,
      to: actualRecipients,
      subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      scheduledAt: input.scheduledAt,
      headers: input.headers,
    }, {
      idempotencyKey: `jl-${eventId}`,
    });

    if (error) throw new Error(error.message);

    const finalStatus = input.scheduledAt ? 'scheduled' : 'sent';
    await eventRef.set({
      status: finalStatus,
      resendMessageId: data?.id || null,
      actualRecipient: actualRecipients.join(','),
      sender: from,
      subject,
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
