# Booking Email Notification Fix

Implemented:
- customer email is now required and validated
- booking confirmation email is sent to the customer
- booking notification email is sent to the configured admin recipient
- admin/customer delivery results are tracked separately on the booking document

Required Vercel environment variables:
- RESEND_API_KEY
- BOOKING_TO_EMAIL (set this to the Gmail/admin inbox that should receive booking alerts)
- BOOKING_FROM_EMAIL (must be a sender on a verified Resend domain, e.g. JayLuxe Bookings <bookings@jayluxestore.com>)

The jayluxestore.com domain/sender must be verified in Resend before production delivery will work.
