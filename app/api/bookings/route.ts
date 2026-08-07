import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

import { adminDb } from '@/lib/firebaseAdmin';
import { OFFICIAL_EMAIL } from '@/lib/contact';

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
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime());
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
    if (!isValidEmail(customerEmail)) {
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

    const resendKey = process.env.RESEND_API_KEY;
    const toEmail =
      process.env.BOOKING_TO_EMAIL ||
      process.env.CONTACT_TO_EMAIL ||
      OFFICIAL_EMAIL;
    const fromEmail =
      process.env.BOOKING_FROM_EMAIL?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.CONTACT_FROM_EMAIL?.trim();

    if (resendKey && toEmail && fromEmail) {
      const resend = new Resend(resendKey);
      const safeName = escapeHtml(customerName);
      const safeService = escapeHtml(serviceName);
      const safePhone = escapeHtml(customerPhone);
      const safeEmail = escapeHtml(customerEmail || 'Not supplied');
      const safeDate = escapeHtml(date);
      const safeTime = escapeHtml(time || 'To be confirmed');
      const safeLocation = escapeHtml(eventLocation || 'Not supplied');
      const safeNotes = escapeHtml(notes || 'None').replace(/\n/g, '<br />');

      const result = await resend.emails.send({
        from: fromEmail,
        to: [toEmail],
        replyTo: customerEmail || undefined,
        subject: `JayLuxe ${kind === 'bridal' ? 'bridal' : 'service'} booking — ${customerName}`,
        text: [
          `New ${kind} booking request`,
          `Booking ID: ${bookingRef.id}`,
          `Service: ${serviceName}`,
          `Customer: ${customerName}`,
          `Email: ${customerEmail || 'Not supplied'}`,
          `Phone: ${customerPhone}`,
          `Date: ${date}`,
          `Time: ${time || 'To be confirmed'}`,
          `Location: ${eventLocation || 'Not supplied'}`,
          `Notes: ${notes || 'None'}`,
        ].join('\n'),
        html: `
          <div style="font-family:Arial,sans-serif;background:#f6f1e8;padding:28px;color:#171717">
            <div style="max-width:680px;margin:auto;background:#fff;border:1px solid #e7ddcd;border-radius:16px;overflow:hidden">
              <div style="background:#111;padding:24px;color:#fff"><p style="color:#d4af37;margin:0 0 5px">JayLuxe Bookings</p><h1 style="margin:0;font-family:Georgia,serif">New booking request</h1></div>
              <div style="padding:26px;line-height:1.65">
                <p><strong>Service:</strong> ${safeService}</p>
                <p><strong>Customer:</strong> ${safeName}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Phone:</strong> ${safePhone}</p>
                <p><strong>Date:</strong> ${safeDate}</p>
                <p><strong>Time:</strong> ${safeTime}</p>
                <p><strong>Location:</strong> ${safeLocation}</p>
                <p><strong>Notes:</strong><br />${safeNotes}</p>
                <p style="color:#777;font-size:12px">Booking ID: ${bookingRef.id}</p>
              </div>
            </div>
          </div>
        `,
      });

      await bookingRef.update({
        emailStatus: result.error ? 'failed' : 'sent',
        emailError: result.error?.message || null,
        resendEmailId: result.data?.id || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await bookingRef.update({
        emailStatus: 'not-configured',
        updatedAt: FieldValue.serverTimestamp(),
      });
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
