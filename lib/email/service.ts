import { createHash } from 'node:crypto';

import {
  SESClient,
  SendEmailCommand,
} from '@aws-sdk/client-ses';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

import { adminDb } from '@/lib/firebaseAdmin';
import {
  getEmailConfig,
  getEmailSender,
  type EmailSenderKind,
} from '@/lib/email/config';

type EmailProvider = 'resend' | 'ses';

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
  status:
    | 'sent'
    | 'scheduled'
    | 'duplicate'
    | 'in_progress'
    | 'failed'
    | 'not_configured';

  resendId?: string | null;

  provider?: EmailProvider;
  providerMessageId?: string | null;

  error?: string;
};

const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

const SIMPLE_EMAIL_PATTERN =
  /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

function isValidEmailAddress(value: string) {
  return SIMPLE_EMAIL_PATTERN.test(value);
}

function normalizeRecipient(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const namedAddress = trimmed.match(
    /^(.+?)\s*<([^<>]+)>$/
  );

  if (namedAddress) {
    const displayName = namedAddress[1].trim();
    const email = namedAddress[2]
      .trim()
      .toLowerCase();

    if (
      !displayName ||
      !isValidEmailAddress(email)
    ) {
      return null;
    }

    return `${displayName} <${email}>`;
  }

  const email = trimmed.toLowerCase();

  return isValidEmailAddress(email)
    ? email
    : null;
}

function plainEmailAddress(value: string) {
  const normalized = normalizeRecipient(value);

  if (!normalized) {
    throw new Error(
      `Invalid email address: ${value}`
    );
  }

  const namedAddress = normalized.match(
    /^(.+?)\s*<([^<>]+)>$/
  );

  if (namedAddress) {
    return namedAddress[2]
      .trim()
      .toLowerCase();
  }

  return normalized;
}

function normalizeRecipients(
  value: string | string[]
) {
  const rawRecipients = (
    Array.isArray(value)
      ? value
      : [value]
  ).flatMap((recipient) => {
    const trimmed = recipient.trim();

    if (!trimmed) {
      return [];
    }

    /*
     * Preserve display-name addresses such as:
     *
     * JayLuxe <hello@example.com>
     *
     * Plain comma/semicolon-separated
     * addresses are expanded.
     */
    if (
      trimmed.includes('<') ||
      trimmed.includes('>')
    ) {
      return [trimmed];
    }

    return trimmed
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  });

  const recipients: string[] = [];
  const invalidRecipients: string[] = [];

  for (const rawRecipient of rawRecipients) {
    const normalized =
      normalizeRecipient(rawRecipient);

    if (normalized) {
      recipients.push(normalized);
    } else {
      invalidRecipients.push(rawRecipient);
    }
  }

  return {
    recipients,
    invalidRecipients,
  };
}

function getConfiguredEmailProvider():
  | EmailProvider
  | null {
  const value = (
    process.env.EMAIL_PROVIDER ||
    'resend'
  )
    .trim()
    .toLowerCase();

  if (
    value === 'resend' ||
    value === 'ses'
  ) {
    return value;
  }

  return null;
}

function hasCustomHeaders(
  headers?: Record<string, string>
) {
  return Boolean(
    headers &&
      Object.keys(headers).length > 0
  );
}

/*
 * Amazon SES direct SendEmail does not
 * provide all of the Resend-specific
 * functionality currently used by JayLuxe.
 *
 * Keep Resend as a compatibility fallback
 * for:
 *
 * 1. Resend-hosted templates without HTML
 * 2. Scheduled emails
 * 3. Emails using custom headers
 */
function resolveEmailProvider(input: {
  configuredProvider: EmailProvider;
  templateId: string;
  hasHtmlFallback: boolean;
  scheduledAt?: string;
  headers?: Record<string, string>;
}): EmailProvider {
  if (
    input.configuredProvider !== 'ses'
  ) {
    return input.configuredProvider;
  }

  const resendTemplateOnly =
    Boolean(input.templateId) &&
    !input.hasHtmlFallback;

  const requiresResend =
    resendTemplateOnly ||
    Boolean(input.scheduledAt) ||
    hasCustomHeaders(input.headers);

  return requiresResend
    ? 'resend'
    : 'ses';
}

function eventDocumentId(
  eventKey: string,
  recipients: string[]
) {
  return createHash('sha256')
    .update(
      `${eventKey}|${recipients.join(',')}`
    )
    .digest('hex');
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(
        error ||
          'Unknown email error'
      );
}

async function sendWithSes(input: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const region =
    process.env.AWS_REGION?.trim();

  if (!region) {
    throw new Error(
      'AWS_REGION is not configured.'
    );
  }

  /*
   * AWS SDK automatically reads:
   *
   * AWS_ACCESS_KEY_ID
   * AWS_SECRET_ACCESS_KEY
   *
   * from the server environment.
   */
  const ses = new SESClient({
    region,
  });

  /*
   * SES Destination addresses are kept as
   * plain email addresses.
   */
  const recipients = input.to.map(
    plainEmailAddress
  );

  if (recipients.length === 0) {
    throw new Error(
      'SES recipient is missing.'
    );
  }

  if (recipients.length > 50) {
    throw new Error(
      'Amazon SES supports a maximum of 50 recipients per SendEmail request.'
    );
  }

  const configurationSetName =
    process.env
      .AWS_SES_CONFIGURATION_SET
      ?.trim() || undefined;

  const replyToAddresses =
    input.replyTo
      ? [
          plainEmailAddress(
            input.replyTo
          ),
        ]
      : undefined;

  const command =
    new SendEmailCommand({
      Source: input.from,

      Destination: {
        ToAddresses: recipients,
      },

      Message: {
        Subject: {
          Charset: 'UTF-8',
          Data: input.subject,
        },

        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: input.html,
          },

          ...(input.text
            ? {
                Text: {
                  Charset:
                    'UTF-8',
                  Data: input.text,
                },
              }
            : {}),
        },
      },

      ...(replyToAddresses
        ? {
            ReplyToAddresses:
              replyToAddresses,
          }
        : {}),

      ...(configurationSetName
        ? {
            ConfigurationSetName:
              configurationSetName,
          }
        : {}),
    });

  const response =
    await ses.send(command);

  return {
    id: response.MessageId || null,
  };
}

async function sendWithResend(input: {
  apiKey: string;
  eventId: string;
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateVariables?: Record<
    string,
    string | number
  >;
  replyTo?: string;
  scheduledAt?: string;
  headers?: Record<string, string>;
}) {
  const resend = new Resend(
    input.apiKey
  );

  const sendOptions = {
    idempotencyKey: `jl-${input.eventId}`,
  };

  const commonPayload = {
    from: input.from,
    to: input.to,
    subject: input.subject,
    replyTo: input.replyTo,
    scheduledAt: input.scheduledAt,
    headers: input.headers,
  };

  if (input.templateId) {
    const { data, error } =
      await resend.emails.send(
        {
          ...commonPayload,

          template: {
            id: input.templateId,

            variables:
              input.templateVariables ||
              {},
          },
        },
        sendOptions
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    return {
      id: data?.id || null,
    };
  }

  const { data, error } =
    await resend.emails.send(
      {
        ...commonPayload,

        html: input.html || '',

        text: input.text,
      },
      sendOptions
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return {
    id: data?.id || null,
  };
}

export async function sendManagedEmail(
  input: ManagedEmailInput
): Promise<ManagedEmailResult> {
  const {
    recipients: originalRecipients,
    invalidRecipients,
  } = normalizeRecipients(input.to);

  if (
    originalRecipients.length === 0 &&
    invalidRecipients.length === 0
  ) {
    return {
      ok: false,
      status: 'failed',
      error:
        'Email recipient is missing.',
    };
  }

  if (
    invalidRecipients.length > 0
  ) {
    console.error(
      `EMAIL RECIPIENT VALIDATION ERROR [${input.emailType}]`,
      {
        invalidRecipientCount:
          invalidRecipients.length,
      }
    );

    return {
      ok: false,
      status: 'failed',
      error:
        'One or more recipient email addresses are invalid.',
    };
  }

  if (
    originalRecipients.length > 50
  ) {
    return {
      ok: false,
      status: 'failed',
      error:
        'A maximum of 50 recipients is allowed per email request.',
    };
  }

  const configuredProvider =
    getConfiguredEmailProvider();

  if (!configuredProvider) {
    return {
      ok: false,
      status: 'not_configured',
      error:
        'EMAIL_PROVIDER must be either "resend" or "ses".',
    };
  }

  const templateId =
    input.template?.id.trim() || '';

  const hasHtmlFallback = Boolean(
    input.html?.trim()
  );

  if (
    !templateId &&
    !hasHtmlFallback
  ) {
    return {
      ok: false,
      status: 'failed',
      error:
        'Email content is missing. Provide HTML content or a Resend template.',
    };
  }

  const emailProvider =
    resolveEmailProvider({
      configuredProvider,
      templateId,
      hasHtmlFallback,
      scheduledAt:
        input.scheduledAt,
      headers: input.headers,
    });

  /*
   * SES cannot render a Resend-hosted
   * template.
   *
   * If SES is selected and HTML exists,
   * the HTML fallback is sent through SES.
   *
   * If there is no HTML fallback,
   * resolveEmailProvider() keeps the
   * message on Resend.
   */
  if (
    emailProvider === 'ses' &&
    !hasHtmlFallback
  ) {
    return {
      ok: false,
      status: 'failed',
      provider: 'ses',
      error:
        'Amazon SES requires HTML content for this email. The Resend template cannot be rendered by SES.',
    };
  }

  const config = getEmailConfig();

  const from =
    getEmailSender(input.sender);

  const eventId =
    eventDocumentId(
      input.eventKey,
      originalRecipients
    );

  const eventRef = adminDb
    .collection('emailEvents')
    .doc(eventId);

  const now = Date.now();

  const claim =
    await adminDb.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(
            eventRef
          );

        const data =
          snapshot.data() || {};

        const status = String(
          data.status || ''
        );

        const updatedAtMs =
          Number(
            data.updatedAtMs || 0
          );

        if (
          status === 'sent' ||
          status === 'scheduled'
        ) {
          return 'duplicate';
        }

        if (
          status === 'sending' &&
          updatedAtMs > 0 &&
          now - updatedAtMs <
            CLAIM_TIMEOUT_MS
        ) {
          return 'in_progress';
        }

        transaction.set(
          eventRef,
          {
            eventId:
              input.eventKey,

            emailType:
              input.emailType,

            orderId:
              input.orderId ||
              null,

            userId:
              input.userId ||
              null,

            recipient:
              originalRecipients.join(
                ','
              ),

            configuredProvider,

            emailProvider,

            status: 'sending',

            attempts:
              Number(
                data.attempts ||
                  0
              ) + 1,

            createdAt:
              snapshot.exists
                ? data.createdAt ||
                  FieldValue.serverTimestamp()
                : FieldValue.serverTimestamp(),

            updatedAt:
              FieldValue.serverTimestamp(),

            updatedAtMs: now,

            error: null,
          },
          {
            merge: true,
          }
        );

        return 'claimed';
      }
    );

  if (claim === 'duplicate') {
    return {
      ok: true,
      skipped: true,
      status: 'duplicate',
      provider: emailProvider,
    };
  }

  if (claim === 'in_progress') {
    return {
      ok: true,
      skipped: true,
      status: 'in_progress',
      provider: emailProvider,
    };
  }

  /*
   * Validate provider-specific
   * configuration after claiming the
   * event so configuration failures are
   * stored in Firestore.
   */
  if (!from) {
    const message = `Missing ${input.sender} sender address.`;

    await eventRef.set(
      {
        status:
          'not_configured',

        emailProvider,

        error: message,

        updatedAt:
          FieldValue.serverTimestamp(),

        updatedAtMs:
          Date.now(),
      },
      {
        merge: true,
      }
    );

    return {
      ok: false,
      status:
        'not_configured',
      provider: emailProvider,
      error: message,
    };
  }

  if (
    emailProvider === 'resend' &&
    !config.apiKey
  ) {
    const message =
      'Missing RESEND_API_KEY.';

    await eventRef.set(
      {
        status:
          'not_configured',

        emailProvider,

        error: message,

        updatedAt:
          FieldValue.serverTimestamp(),

        updatedAtMs:
          Date.now(),
      },
      {
        merge: true,
      }
    );

    return {
      ok: false,
      status:
        'not_configured',
      provider: emailProvider,
      error: message,
    };
  }

  if (
    emailProvider === 'ses' &&
    !process.env.AWS_REGION?.trim()
  ) {
    const message =
      'Missing AWS_REGION.';

    await eventRef.set(
      {
        status:
          'not_configured',

        emailProvider,

        error: message,

        updatedAt:
          FieldValue.serverTimestamp(),

        updatedAtMs:
          Date.now(),
      },
      {
        merge: true,
      }
    );

    return {
      ok: false,
      status:
        'not_configured',
      provider: emailProvider,
      error: message,
    };
  }

  if (
    emailProvider === 'ses' &&
    (
      !process.env
        .AWS_ACCESS_KEY_ID
        ?.trim() ||
      !process.env
        .AWS_SECRET_ACCESS_KEY
        ?.trim()
    )
  ) {
    const message =
      'AWS SES credentials are not configured. Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.';

    await eventRef.set(
      {
        status:
          'not_configured',

        emailProvider,

        error: message,

        updatedAt:
          FieldValue.serverTimestamp(),

        updatedAtMs:
          Date.now(),
      },
      {
        merge: true,
      }
    );

    return {
      ok: false,
      status:
        'not_configured',
      provider: emailProvider,
      error: message,
    };
  }

  const actualRecipients =
    originalRecipients;

  const subject =
    input.subject;

  try {
    let messageId:
      | string
      | null = null;

    if (
      emailProvider === 'ses'
    ) {
      const result =
        await sendWithSes({
          from,

          to: actualRecipients,

          subject,

          html:
            input.html || '',

          text: input.text,

          replyTo:
            input.replyTo,
        });

      messageId =
        result.id;
    } else {
      const result =
        await sendWithResend({
          apiKey:
            config.apiKey!,

          eventId,

          from,

          to: actualRecipients,

          subject,

          html: input.html,

          text: input.text,

          templateId:
            templateId ||
            undefined,

          templateVariables:
            input.template
              ?.variables,

          replyTo:
            input.replyTo,

          scheduledAt:
            input.scheduledAt,

          headers:
            input.headers,
        });

      messageId =
        result.id;
    }

    /*
     * SES direct SendEmail is immediate.
     * Scheduled sends are routed through
     * Resend above.
     */
    const finalStatus =
      emailProvider ===
        'resend' &&
      input.scheduledAt
        ? 'scheduled'
        : 'sent';

    await eventRef.set(
      {
        status:
          finalStatus,

        /*
         * Provider-neutral tracking.
         */
        emailProvider,

        providerMessageId:
          messageId,

        /*
         * Keep old Resend field for
         * backwards compatibility.
         */
        resendMessageId:
          emailProvider ===
          'resend'
            ? messageId
            : null,

        /*
         * Store SES ID separately as
         * well for easier admin/debugging.
         */
        sesMessageId:
          emailProvider ===
          'ses'
            ? messageId
            : null,

        actualRecipient:
          actualRecipients.join(
            ','
          ),

        sender: from,

        subject,

        deliveryMode:
          emailProvider ===
          'ses'
            ? 'html'
            : templateId
              ? 'template'
              : 'html',

        templateId:
          emailProvider ===
            'resend' &&
          templateId
            ? templateId
            : null,

        scheduledAt:
          emailProvider ===
            'resend'
            ? input.scheduledAt ||
              null
            : null,

        sentAt:
          finalStatus ===
          'scheduled'
            ? null
            : FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),

        updatedAtMs:
          Date.now(),

        error: null,
      },
      {
        merge: true,
      }
    );

    return {
      ok: true,

      status:
        finalStatus,

      provider:
        emailProvider,

      providerMessageId:
        messageId,

      resendId:
        emailProvider ===
        'resend'
          ? messageId
          : null,
    };
  } catch (error) {
    const message =
      errorMessage(
        error
      ).slice(0, 1000);

    console.error(
      `EMAIL SEND ERROR [${input.emailType}] [${emailProvider}]`,
      error
    );

    await eventRef.set(
      {
        status:
          'failed',

        emailProvider,

        error: message,

        updatedAt:
          FieldValue.serverTimestamp(),

        updatedAtMs:
          Date.now(),
      },
      {
        merge: true,
      }
    );

    return {
      ok: false,

      status:
        'failed',

      provider:
        emailProvider,

      error:
        message,
    };
  }
}

export async function verifyResendWebhook(
  input: {
    payload: string;
    id: string;
    timestamp: string;
    signature: string;
  }
) {
  const config =
    getEmailConfig();

  const webhookSecret =
    config.webhookSecret;

  if (!webhookSecret) {
    throw new Error(
      'RESEND_WEBHOOK_SECRET is not configured.'
    );
  }

  const resend = new Resend(
    config.apiKey ||
      're_webhook_verification_only'
  );

  return resend.webhooks.verify({
    payload: input.payload,

    headers: {
      id: input.id,
      timestamp:
        input.timestamp,
      signature:
        input.signature,
    },

    webhookSecret,
  });
}