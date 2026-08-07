import axios from 'axios';

function getTermiiConfig() {
  const apiKey = process.env.TERMII_API_KEY?.trim();
  const baseUrl = process.env.TERMII_BASE_URL?.trim();
  const senderId = process.env.TERMII_SENDER_ID?.trim();

  if (!apiKey || !baseUrl || !senderId) {
    throw new Error('Termii is not configured.');
  }

  return { apiKey, baseUrl: baseUrl.replace(/\/$/, ''), senderId };
}

interface SendSMSParams {
  phone: string;
  message: string;
}

interface SendOTPParams {
  phone: string;
}

interface VerifyOTPParams {
  pinId: string;
  pin: string;
}

export async function sendSMS({
  phone,
  message,
}: SendSMSParams) {
  try {
    const { apiKey, baseUrl, senderId } = getTermiiConfig();
    const response = await axios.post(
      `${baseUrl}/sms/send`,
      {
        api_key: apiKey,
        to: phone,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
      }
    );

    return response.data;
  } catch (error) {
    console.error("Termii SMS Error:", error);
    throw error;
  }
}

export async function sendOTP({
  phone,
}: SendOTPParams) {
  try {
    const { apiKey, baseUrl, senderId } = getTermiiConfig();
    const response = await axios.post(
      `${baseUrl}/sms/otp/send`,
      {
        api_key: apiKey,
        message_type: "NUMERIC",
        to: phone,
        from: senderId,
        channel: "generic",
        pin_attempts: 3,
        pin_time_to_live: 600,
        pin_length: 6,
        pin_placeholder: "<123456>",
        message_text:
          "Your JayLuxe verification code is <123456>. It expires in 10 minutes.",
      }
    );

    return response.data;
  } catch (error) {
    console.error("OTP Send Error:", error);
    throw error;
  }
}

export async function verifyOTP({
  pinId,
  pin,
}: VerifyOTPParams) {
  try {
    const { apiKey, baseUrl } = getTermiiConfig();
    const response = await axios.post(
      `${baseUrl}/sms/otp/verify`,
      {
        api_key: apiKey,
        pin_id: pinId,
        pin,
      }
    );

    return response.data;
  } catch (error) {
    console.error("OTP Verify Error:", error);
    throw error;
  }
}

export function orderConfirmationSMS(
  customerName: string,
  orderId: string
) {
  return `Hello ${customerName},

Your JayLuxe order #${orderId} has been received successfully.

We are preparing your order.

Thank you for shopping with JayLuxe.`;
}

export function processingSMS(
  customerName: string,
  orderId: string
) {
  return `Hello ${customerName},

Your JayLuxe order #${orderId} is now being processed.

We'll notify you once it has been shipped.`;
}

export function shippedSMS(
  customerName: string,
  orderId: string
) {
  return `Good news ${customerName}!

Your JayLuxe order #${orderId} has been shipped and is on its way.

Thank you for shopping with JayLuxe.`;
}

export function deliveredSMS(
  customerName: string,
  orderId: string
) {
  return `Hello ${customerName},

Your JayLuxe order #${orderId} has been delivered.

Thank you for choosing JayLuxe. We hope to serve you again soon!`;
}

export function paymentSuccessfulSMS(
  customerName: string,
  orderId: string
) {
  return `Hello ${customerName},

Your payment for order #${orderId} was successful.

Thank you for shopping with JayLuxe.`;
}

export function cancelledSMS(
  customerName: string,
  orderId: string
) {
  return `Hello ${customerName},

Unfortunately your order #${orderId} has been cancelled.

If you have any questions, please contact JayLuxe support.`;
}

export function outForDeliverySMS(
  customerName: string,
  orderId: string
) {
  return `Hello ${customerName},

Your JayLuxe order #${orderId} is out for delivery.

Please keep your phone available for the delivery agent.`;
}

export function welcomeSMS(
  customerName: string
) {
  return `Welcome to JayLuxe, ${customerName}!

Your account has been created successfully.

Enjoy shopping with us.`;
}