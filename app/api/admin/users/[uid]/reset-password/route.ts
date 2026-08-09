import { NextRequest, NextResponse } from 'next/server';
import { writeAdminActivity } from '@/lib/adminAudit';
import {
  adminAuthErrorResponse,
  getAdminProfile,
  requireAdminSession,
} from '@/lib/adminServerAuth';
import { adminAuth } from '@/lib/firebaseAdmin';
import { sendManagedEmail } from '@/lib/email/service';
import { passwordResetTemplate } from '@/lib/email/templates';
import { getSiteUrlString } from '@/lib/site';
import {
  getRequestBrowser,
  getRequestIp,
  hasTrustedRequestOrigin,
} from '@/lib/adminRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


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

    const template = passwordResetTemplate(profile.fullName, resetLink);
    const emailResult = await sendManagedEmail({
      eventKey: `admin-password-reset:${profile.uid}:${Date.now().toString().slice(0, -5)}`,
      emailType: 'admin_password_reset',
      to: profile.email,
      sender: 'admin',
      userId: profile.uid,
      subject: 'Reset your JayLuxe administrator password',
      html: template.html,
      text: template.text,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        { ok: false, message: 'The password reset link was created, but the email could not be sent.' },
        { status: 502 },
      );
    }


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
