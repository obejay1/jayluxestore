import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { writeAdminActivity } from '@/lib/adminAudit';
import {
  adminAuthErrorResponse,
  getAdminProfile,
  requireAdminSession,
} from '@/lib/adminServerAuth';
import { adminAuth } from '@/lib/firebaseAdmin';
import {
  getRequestBrowser,
  getRequestIp,
  hasTrustedRequestOrigin,
} from '@/lib/adminRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string } },
) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { ok: false, message: 'The request origin is not trusted.' },
      { status: 403 },
    );
  }

  try {
    const session = await requireAdminSession({ roles: ['super_admin'] });
    const profile = await getAdminProfile(params.uid);
    if (!profile) {
      return NextResponse.json(
        { ok: false, message: 'Administrator account not found.' },
        { status: 404 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from =
      process.env.ADMIN_EMAIL_FROM?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.CONTACT_FROM_EMAIL?.trim();

    if (!apiKey || !from) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Password reset email is not configured. Add RESEND_API_KEY and ADMIN_EMAIL_FROM or RESEND_FROM_EMAIL to .env.local.',
        },
        { status: 503 },
      );
    }

    const appUrl = getSiteUrlString();
    const resetLink = await adminAuth.generatePasswordResetLink(
      profile.email,
      appUrl
        ? {
            url: `${appUrl}/admin/login`,
            handleCodeInApp: false,
          }
        : undefined,
    );

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: [profile.email],
      subject: 'Reset your JayLuxe administrator password',
      text: [
        `Hello ${profile.fullName},`,
        '',
        'A JayLuxe Super Admin requested a password reset for your administrator account.',
        `Reset your password: ${resetLink}`,
        '',
        'Ignore this email if you did not expect this request.',
      ].join('\n'),
      html: `
        <div style="margin:0;background:#f7f3eb;padding:30px;font-family:Arial,sans-serif;color:#191610">
          <div style="max-width:620px;margin:auto;border:1px solid #e7ddcb;border-radius:20px;background:#fff;overflow:hidden">
            <div style="padding:28px;background:#17130f;color:#fff;text-align:center">
              <p style="margin:0;color:#d6ae50;font-weight:700;letter-spacing:.15em;text-transform:uppercase">JayLuxe Administration</p>
              <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-weight:500">Password reset</h1>
            </div>
            <div style="padding:32px">
              <p>Hello ${escapeHtml(profile.fullName)},</p>
              <p style="color:#625b51;line-height:1.7">A JayLuxe Super Admin requested a password reset for your administrator account.</p>
              <p style="margin:28px 0"><a href="${escapeHtml(resetLink)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#17130f;color:#fff;text-decoration:none;font-weight:700">Reset Password</a></p>
              <p style="color:#857c70;font-size:13px;line-height:1.6">Ignore this email if you did not expect this request.</p>
            </div>
          </div>
        </div>
      `,
    });

    if (result.error) throw new Error(result.error.message);

    await writeAdminActivity({
      actor: session.user,
      action: 'Password Reset',
      description: `Sent a Firebase password reset email to ${profile.fullName} (${profile.email}).`,
      targetType: 'adminUser',
      targetId: profile.uid,
      ipAddress: getRequestIp(request),
      browser: getRequestBrowser(request),
    });

    return NextResponse.json({
      ok: true,
      message: `A password reset email was sent to ${profile.email}.`,
    });
  } catch (error) {
    console.error('ADMIN PASSWORD RESET ERROR:', error);
    const result = adminAuthErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
