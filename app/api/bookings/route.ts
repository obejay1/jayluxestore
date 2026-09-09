import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getEmailConfig } from '@/lib/email/config';
import { sendManagedEmail } from '@/lib/email/service';
import { sendSMS } from '@/lib/termii';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BookingPayload = {
  kind?: unknown;
  serviceId?: unknown;
  serviceName?: unknown;
  servicePrice?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  date?: unknown;
  time?: unknown;
  eventLocation?: unknown;
  notes?: unknown;
  website?: unknown;
};

function clean(value: unknown, maxLength: number) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime());
}


function formatBookingDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function formatBookingTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value || 'To be confirmed';

  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${suffix}`;
}
function formatSmsPhone(value: string) {
  const phone = value.replace(/[^\\d+]/g, '');
  if (phone.startsWith('+234')) return phone.slice(1);
  if (phone.startsWith('0')) return `234${phone.slice(1)}`;
  return phone.replace(/^\\+/, '');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BookingPayload;

    if (clean(body.website, 200)) {
      return NextResponse.json({ ok: true, message: 'Your booking request has been received.' });
    }

    const kind = clean(body.kind, 20).toLowerCase() === 'bridal' ? 'bridal' : 'service';
    const serviceId = clean(body.serviceId, 120);
    const serviceName = clean(body.serviceName, 160);
    const servicePrice = Math.max(0, Number(body.servicePrice || 0));
    const customerName = clean(body.customerName, 120);
    const customerEmail = clean(body.customerEmail, 160).toLowerCase();
    const customerPhone = clean(body.customerPhone, 40);
    const date = clean(body.date, 20);
    const time = clean(body.time, 20);
    const eventLocation = clean(body.eventLocation, 240);
    const notes = clean(body.notes, 2000);

    if (customerName.length < 2) {
      return NextResponse.json({ ok: false, message: 'Please enter your full name.' }, { status: 400 });
    }
    if (customerPhone.length < 7) {
      return NextResponse.json({ ok: false, message: 'Please enter a valid phone number.' }, { status: 400 });
    }
    if (!customerEmail || !isValidEmail(customerEmail)) {
      return NextResponse.json({ ok: false, message: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!serviceName) {
      return NextResponse.json({ ok: false, message: 'Please select a service or bridal package.' }, { status: 400 });
    }
    if (!isValidDate(date)) {
      return NextResponse.json({ ok: false, message: 'Please choose a valid appointment date.' }, { status: 400 });
    }
    if (kind === 'service' && !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ ok: false, message: 'Please choose a valid appointment time.' }, { status: 400 });
    }

    const bookingRef = adminDb.collection('bookings').doc();
    const bookingData = {
      id: bookingRef.id,
      type: kind === 'bridal' ? 'Bridal Package' : 'Service Booking',
      kind,
      serviceId,
      serviceName,
      packageName: kind === 'bridal' ? serviceName : null,
      servicePrice,
      customerName,
      customerEmail,
      customerEmailLower: customerEmail,
      customerPhone,
      date,
      eventDate: kind === 'bridal' ? date : null,
      time: kind === 'service' ? time : '',
      eventLocation,
      notes,
      message: notes,
      status: 'pending',
      source: 'website-booking-form',
      emailStatus: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await bookingRef.set(bookingData);

    const toEmail =
      process.env.BOOKING_TO_EMAIL?.trim() ||
      getEmailConfig().adminRecipient;
    const safeName = escapeHtml(customerName);
    const safeService = escapeHtml(serviceName);
    const safePhone = escapeHtml(customerPhone);
    const safeEmail = escapeHtml(customerEmail || 'Not supplied');
    const safeLocation = escapeHtml(eventLocation || 'Not supplied');
    const safeNotes = escapeHtml(notes || 'None').replace(/\n/g, '<br />');

    const displayDate = escapeHtml(formatBookingDate(date));
    const displayTime = escapeHtml(formatBookingTime(time));
    const bookingTypeLabel = kind === 'bridal' ? 'Bridal Package' : 'Service Booking';
    const safeBookingType = escapeHtml(bookingTypeLabel);
    const safeBookingId = escapeHtml(bookingRef.id);
    const customerLocationRow = eventLocation
      ? `<tr><td style="padding:0 0 16px;color:#756f65;font-size:13px;line-height:1.4;width:36%;vertical-align:top">Location</td><td style="padding:0 0 16px;color:#181818;font-size:14px;line-height:1.5;font-weight:600;vertical-align:top">${safeLocation}</td></tr>`
      : '';
    const customerNotesBlock = notes
      ? `<div style="margin-top:22px;padding:16px 18px;background:#faf8f3;border:1px solid #ece4d7;border-radius:10px"><p style="margin:0 0 6px;color:#756f65;font-size:12px;text-transform:uppercase;letter-spacing:1.1px">Your notes</p><p style="margin:0;color:#262626;font-size:14px;line-height:1.65">${safeNotes}</p></div>`
      : '';

    const [adminEmailResult, customerEmailResult] = await Promise.all([
      sendManagedEmail({
        eventKey: `booking-admin:${bookingRef.id}`,
        emailType: 'booking_admin_notification',
        to: toEmail,
        sender: 'bookings',
        replyTo: customerEmail,
        subject: `New JayLuxe Booking Request — ${customerName}`,
        text: [
          'NEW JAYLUXE BOOKING REQUEST',
          '',
          `Booking reference: ${bookingRef.id}`,
          `Booking type: ${bookingTypeLabel}`,
          `Service: ${serviceName}`,
          `Customer: ${customerName}`,
          `Email: ${customerEmail}`,
          `Phone: ${customerPhone}`,
          `Date: ${formatBookingDate(date)}`,
          `Time: ${formatBookingTime(time)}`,
          `Location: ${eventLocation || 'Not supplied'}`,
          `Notes: ${notes || 'None'}`,
          '',
          'Please review the request and contact the customer to confirm availability.',
          'JayLuxe Administration',
        ].join('\n'),
        html: `
          <!doctype html>
          <html>
            <body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4efe6;margin:0;padding:0">
                <tr>
                  <td align="center" style="padding:28px 14px">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:660px;background:#ffffff;border:1px solid #e5dbc9;border-radius:18px;overflow:hidden">
                      <tr>
                        <td style="background:#101010;padding:30px 32px 28px;border-bottom:3px solid #c7a45a">
                          <p style="margin:0 0 8px;color:#c7a45a;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">JayLuxe Administration</p>
                          <h1 style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:600">New Booking Request</h1>
                          <p style="margin:10px 0 0;color:#d5d5d5;font-size:14px;line-height:1.5">A new appointment request has been submitted through the JayLuxe website.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:28px 32px">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:22px">
                            <tr>
                              <td style="padding:0 0 12px">
                                <span style="display:inline-block;padding:7px 11px;border-radius:999px;background:#f7f0df;color:#8a6927;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase">Pending confirmation</span>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0 0 12px;color:#9a7734;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Appointment</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse">
                            <tr><td style="padding:0 0 14px;color:#756f65;font-size:13px;width:36%;vertical-align:top">Booking type</td><td style="padding:0 0 14px;color:#181818;font-size:14px;font-weight:600;vertical-align:top">${safeBookingType}</td></tr>
                            <tr><td style="padding:0 0 14px;color:#756f65;font-size:13px;vertical-align:top">Service</td><td style="padding:0 0 14px;color:#181818;font-size:14px;font-weight:600;vertical-align:top">${safeService}</td></tr>
                            <tr><td style="padding:0 0 14px;color:#756f65;font-size:13px;vertical-align:top">Date</td><td style="padding:0 0 14px;color:#181818;font-size:14px;font-weight:600;vertical-align:top">${displayDate}</td></tr>
                            <tr><td style="padding:0 0 14px;color:#756f65;font-size:13px;vertical-align:top">Time</td><td style="padding:0 0 14px;color:#181818;font-size:14px;font-weight:600;vertical-align:top">${displayTime}</td></tr>
                            <tr><td style="padding:0 0 14px;color:#756f65;font-size:13px;vertical-align:top">Location</td><td style="padding:0 0 14px;color:#181818;font-size:14px;font-weight:600;vertical-align:top">${safeLocation}</td></tr>
                          </table>

                          <div style="height:1px;background:#eee6d9;margin:10px 0 24px"></div>

                          <p style="margin:0 0 12px;color:#9a7734;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Customer</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse">
                            <tr><td style="padding:0 0 14px;color:#756f65;font-size:13px;width:36%;vertical-align:top">Name</td><td style="padding:0 0 14px;color:#181818;font-size:14px;font-weight:600;vertical-align:top">${safeName}</td></tr>
                            <tr><td style="padding:0 0 14px;color:#756f65;font-size:13px;vertical-align:top">Email</td><td style="padding:0 0 14px;color:#181818;font-size:14px;font-weight:600;vertical-align:top">${safeEmail}</td></tr>
                            <tr><td style="padding:0 0 14px;color:#756f65;font-size:13px;vertical-align:top">Phone</td><td style="padding:0 0 14px;color:#181818;font-size:14px;font-weight:600;vertical-align:top">${safePhone}</td></tr>
                          </table>

                          <div style="margin-top:8px;padding:17px 18px;background:#faf8f3;border:1px solid #ece4d7;border-radius:10px">
                            <p style="margin:0 0 6px;color:#756f65;font-size:12px;text-transform:uppercase;letter-spacing:1.1px">Customer notes</p>
                            <p style="margin:0;color:#262626;font-size:14px;line-height:1.65">${safeNotes}</p>
                          </div>

                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px">
                            <tr>
                              <td style="background:#101010;border-radius:8px">
                                <a href="mailto:${safeEmail}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700">Reply to customer</a>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:24px 0 0;color:#8a847a;font-size:12px;line-height:1.6">Booking reference: <strong style="color:#4d4942">${safeBookingId}</strong></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 32px;background:#fbf9f5;border-top:1px solid #eee6d9;text-align:center">
                          <p style="margin:0;color:#171717;font-family:Georgia,'Times New Roman',serif;font-size:17px">JayLuxe</p>
                          <p style="margin:6px 0 0;color:#8a847a;font-size:11px;letter-spacing:.7px">LUXURY BEAUTY · FASHION · LIFESTYLE</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>`,
      }),
      sendManagedEmail({
        eventKey: `booking-customer:${bookingRef.id}`,
        emailType: 'booking_customer_confirmation',
        to: customerEmail,
        sender: 'bookings',
        subject: `Your JayLuxe Booking Request Has Been Received — ${serviceName}`,
        text: [
          `Hello ${customerName},`,
          '',
          'Thank you for choosing JayLuxe. We have received your booking request and our team will contact you shortly to confirm availability and finalize your appointment.',
          '',
          `Service: ${serviceName}`,
          `Date: ${formatBookingDate(date)}`,
          `Time: ${formatBookingTime(time)}`,
          ...(eventLocation ? [`Location: ${eventLocation}`] : []),
          `Booking reference: ${bookingRef.id}`,
          'Status: Pending confirmation',
          '',
          'Please note: this email acknowledges your request; your appointment is confirmed once the JayLuxe team contacts you.',
          '',
          'Warm regards,',
          'JayLuxe Team',
          'jayluxestore.com',
        ].join('\n'),
        html: `
          <!doctype html>
          <html>
            <body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4efe6;margin:0;padding:0">
                <tr>
                  <td align="center" style="padding:28px 14px">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:660px;background:#ffffff;border:1px solid #e5dbc9;border-radius:18px;overflow:hidden">
                      <tr>
                        <td style="background:#101010;padding:32px;border-bottom:3px solid #c7a45a">
                          <p style="margin:0 0 8px;color:#c7a45a;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">JayLuxe</p>
                          <h1 style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:1.2;font-weight:600">Booking Request Received</h1>
                          <p style="margin:11px 0 0;color:#d5d5d5;font-size:14px;line-height:1.55">Thank you for choosing JayLuxe for your special occasion.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:30px 32px">
                          <p style="margin:0 0 16px;color:#242424;font-size:15px;line-height:1.7">Hello <strong>${safeName}</strong>,</p>
                          <p style="margin:0 0 22px;color:#4e4a44;font-size:14px;line-height:1.75">We have received your booking request. Our team will review the appointment details and contact you shortly to confirm availability and finalize your booking.</p>

                          <div style="margin:0 0 22px;padding:15px 17px;background:#f7f0df;border:1px solid #eadbb9;border-radius:10px">
                            <p style="margin:0;color:#876827;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Booking status</p>
                            <p style="margin:5px 0 0;color:#181818;font-size:15px;font-weight:700">Pending confirmation</p>
                          </div>

                          <p style="margin:0 0 14px;color:#9a7734;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Your booking details</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse">
                            <tr><td style="padding:0 0 16px;color:#756f65;font-size:13px;line-height:1.4;width:36%;vertical-align:top">Service</td><td style="padding:0 0 16px;color:#181818;font-size:14px;line-height:1.5;font-weight:600;vertical-align:top">${safeService}</td></tr>
                            <tr><td style="padding:0 0 16px;color:#756f65;font-size:13px;line-height:1.4;vertical-align:top">Date</td><td style="padding:0 0 16px;color:#181818;font-size:14px;line-height:1.5;font-weight:600;vertical-align:top">${displayDate}</td></tr>
                            <tr><td style="padding:0 0 16px;color:#756f65;font-size:13px;line-height:1.4;vertical-align:top">Time</td><td style="padding:0 0 16px;color:#181818;font-size:14px;line-height:1.5;font-weight:600;vertical-align:top">${displayTime}</td></tr>
                            ${customerLocationRow}
                            <tr><td style="padding:0;color:#756f65;font-size:13px;line-height:1.4;vertical-align:top">Booking reference</td><td style="padding:0;color:#181818;font-size:13px;line-height:1.5;font-weight:600;vertical-align:top;word-break:break-all">${safeBookingId}</td></tr>
                          </table>

                          ${customerNotesBlock}

                          <div style="height:1px;background:#eee6d9;margin:26px 0 22px"></div>

                          <p style="margin:0 0 10px;color:#4e4a44;font-size:13px;line-height:1.7"><strong style="color:#242424">What happens next?</strong><br />A member of the JayLuxe team will contact you to confirm availability and complete your appointment arrangements.</p>
                          <p style="margin:0 0 24px;color:#7d766d;font-size:12px;line-height:1.65">Please note: this email confirms that we received your request. Your appointment becomes confirmed after our team contacts you.</p>

                          <p style="margin:0;color:#4e4a44;font-size:14px;line-height:1.7">Warm regards,<br /><strong style="color:#181818">JayLuxe Team</strong></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:22px 32px;background:#101010;text-align:center">
                          <p style="margin:0;color:#c7a45a;font-family:Georgia,'Times New Roman',serif;font-size:19px">JayLuxe</p>
                          <p style="margin:7px 0 12px;color:#bdb8af;font-size:11px;letter-spacing:.8px">LUXURY BEAUTY · FASHION · LIFESTYLE</p>
                          <a href="https://jayluxestore.com" style="color:#ffffff;font-size:12px;text-decoration:none">jayluxestore.com</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>`,
      }),
    ]);

    const emailStatus = adminEmailResult.ok && customerEmailResult.ok ? 'sent' : 'partial_or_failed';

    await bookingRef.update({
      emailStatus,
      adminEmailStatus: adminEmailResult.status,
      adminEmailError: adminEmailResult.error || null,
      adminResendEmailId: adminEmailResult.resendId || null,
      customerEmailStatus: customerEmailResult.status,
      customerEmailError: customerEmailResult.error || null,
      customerResendEmailId: customerEmailResult.resendId || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send SMS notifications through Termii without blocking successful bookings.
    const bookingSmsTasks = [];

    const customerSmsPhone = formatSmsPhone(clean(String(body.customerPhone ?? ''), 40));
    if (customerSmsPhone) {
      bookingSmsTasks.push(
        sendSMS({
          phone: customerSmsPhone,
          message: `JayLuxe: Your booking request for ${clean(String(body.serviceName ?? 'our service'), 80)} has been received. We will contact you shortly.`,
        }),
      );
    }

    const adminPhone = process.env.JAYLUXE_ADMIN_SMS_PHONE;
    if (adminPhone) {
      bookingSmsTasks.push(
        sendSMS({
          phone: formatSmsPhone(adminPhone),
          message: `JayLuxe: New booking request from ${clean(String(body.customerName ?? 'Customer'), 80)} for ${clean(String(body.serviceName ?? 'service'), 80)}.`,
        }),
      );
    }

    if (bookingSmsTasks.length) {
      await Promise.allSettled(bookingSmsTasks);
    }

    return NextResponse.json({
      ok: true,
      bookingId: bookingRef.id,
      message: 'Your booking request has been sent. JayLuxe will contact you to confirm availability.',
    });
  } catch (error) {
    console.error('BOOKING API ERROR:', error);
    return NextResponse.json(
      { ok: false, message: 'We could not submit your booking. Please try again.' },
      { status: 500 },
    );
  }
}
