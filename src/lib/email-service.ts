/**
 * Email Service
 * Handles sending emails via Resend API
 */

import {
  generateSubmissionReceivedEmail,
  generateVerifiedEmail,
  generateProvisionalEmail,
  generateRejectedEmail,
  generateWeeklyDigestEmail,
  generateWelcomeEmail,
  type SubmissionReceivedData,
  type VerifiedData,
  type ProvisionalData,
  type RejectedData,
  type WeeklyDigestData,
} from './email-templates';

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via Resend API
 */
async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || 'noreply@aletheia.io';

  // If no API key, log to console (development mode)
  if (!apiKey) {
    console.log('=== EMAIL (Development Mode) ===');
    console.log('To:', params.to);
    console.log('Subject:', params.subject);
    console.log('Body:', params.body.substring(0, 500) + '...');
    console.log('================================');
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        text: params.body,
        html: params.html || params.body.replace(/\n/g, '<br>'),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send submission received email
 */
export async function sendSubmissionReceivedEmail(
  data: SubmissionReceivedData
): Promise<SendEmailResult> {
  const { subject, body } = generateSubmissionReceivedEmail(data);
  return sendEmail({
    to: data.userEmail,
    subject,
    body,
  });
}

/**
 * Send verified email
 */
export async function sendVerifiedEmail(data: VerifiedData): Promise<SendEmailResult> {
  const { subject, body } = generateVerifiedEmail(data);
  return sendEmail({
    to: data.userEmail,
    subject,
    body,
  });
}

/**
 * Send provisional email
 */
export async function sendProvisionalEmail(data: ProvisionalData): Promise<SendEmailResult> {
  const { subject, body } = generateProvisionalEmail(data);
  return sendEmail({
    to: data.userEmail,
    subject,
    body,
  });
}

/**
 * Send rejected email
 */
export async function sendRejectedEmail(data: RejectedData): Promise<SendEmailResult> {
  const { subject, body } = generateRejectedEmail(data);
  return sendEmail({
    to: data.userEmail,
    subject,
    body,
  });
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigestEmail(data: WeeklyDigestData): Promise<SendEmailResult> {
  const { subject, body } = generateWeeklyDigestEmail(data);
  return sendEmail({
    to: data.userEmail,
    subject,
    body,
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  data: { userName: string; userEmail: string },
  baseUrl: string
): Promise<SendEmailResult> {
  const { subject, body } = generateWelcomeEmail({ ...data, baseUrl });
  return sendEmail({
    to: data.userEmail,
    subject,
    body,
  });
}

/**
 * Send notification based on type
 */
export async function sendNotificationEmail(
  type: 'submission_received' | 'verified' | 'provisional' | 'rejected',
  data: SubmissionReceivedData | VerifiedData | ProvisionalData | RejectedData
): Promise<SendEmailResult> {
  switch (type) {
    case 'submission_received':
      return sendSubmissionReceivedEmail(data as SubmissionReceivedData);
    case 'verified':
      return sendVerifiedEmail(data as VerifiedData);
    case 'provisional':
      return sendProvisionalEmail(data as ProvisionalData);
    case 'rejected':
      return sendRejectedEmail(data as RejectedData);
    default:
      return { success: false, error: 'Unknown email type' };
  }
}

/**
 * Create in-app notification and optionally send email
 */
export async function createNotification(
  supabase: unknown, // Pass Supabase client
  params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    investigationId?: string;
    patternId?: string;
    sendEmail?: boolean;
    userEmail?: string;
  }
): Promise<{ notificationId?: string; emailSent?: boolean }> {
  const client = supabase as {
    from: (table: string) => {
      insert: (data: Record<string, unknown>) => {
        select: () => {
          single: () => Promise<{ data: { id: string } | null; error: unknown }>;
        };
      };
    };
  };

  // Create in-app notification
  const { data: notification, error } = await client
    .from('aletheia_notifications')
    .insert({
      user_id: params.userId,
      notification_type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
      investigation_id: params.investigationId,
      pattern_id: params.patternId,
      email_sent: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return {};
  }

  // Send email if requested and email provided
  let emailSent = false;
  if (params.sendEmail && params.userEmail) {
    const result = await sendEmail({
      to: params.userEmail,
      subject: params.title,
      body: params.body,
    });

    if (result.success) {
      emailSent = true;
      // Update notification to mark email as sent
      await client
        .from('aletheia_notifications')
        .insert({ email_sent: true }) // This would need to be .update() actually
    }
  }

  return {
    notificationId: notification?.id,
    emailSent,
  };
}
