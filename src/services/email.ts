import axios from 'axios';

const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Log on module load
console.log('[EMAIL SERVICE] Loaded. API Key available:', !!BREVO_API_KEY, 'Key length:', BREVO_API_KEY?.length || 0);

interface EmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

export const sendEmail = async ({
  to,
  subject,
  htmlContent,
  senderName = 'Mentor Connect',
  senderEmail = 'mentorconnect698@gmail.com',
}: EmailParams) => {
  try {
    console.log('[EMAIL] Sending email to:', to, 'API Key available:', !!BREVO_API_KEY);
    
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured');
    }

    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: to,
          },
        ],
        subject,
        htmlContent,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[EMAIL] Email sent successfully to:', to, response.data);
    return response.data;
  } catch (error: any) {
    console.error('[EMAIL] Error sending email to:', to);
    console.error('[EMAIL] Error details:', error?.response?.data || error?.message || error);
    throw error;
  }
};

export const sendBookingEmails = async (
  mentorEmail: string,
  mentorName: string,
  menteeEmail: string,
  menteeName: string,
  bookingDate: string,
  timeSlot: string,
  meetingLink?: string
) => {
  // Generate a meeting link if not provided
  const finalMeetingLink = meetingLink || `https://mentorconnect.com/meeting/${Date.now()}`;
  
  // Email to mentor
  const mentorEmailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 20px; }
        .details-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px; }
        .detail-row { display: flex; margin: 12px 0; align-items: flex-start; }
        .detail-label { font-weight: 600; color: #667eea; min-width: 120px; }
        .detail-value { color: #333; }
        .cta-section { text-align: center; margin: 30px 0; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 15px 0; }
        .cta-button:hover { background: #764ba2; }
        .link-text { color: #667eea; word-break: break-all; font-size: 13px; margin-top: 10px; }
        .footer { background: #f8f9fa; padding: 25px 20px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #e9ecef; }
        .footer-note { margin: 10px 0; }
        .divider { height: 1px; background: #e9ecef; margin: 25px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Session Booked</h1>
        </div>
        
        <div class="content">
          <p>Hello ${mentorName},</p>
          
          <p>${menteeName} has booked a mentoring session with you.</p>
          
          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">Mentee:</span>
              <span class="detail-value">${menteeName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${bookingDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${timeSlot}</span>
            </div>
          </div>
          
          <div class="cta-section">
            <p style="color: #666; margin-bottom: 10px;">Join the meeting:</p>
            <a href="${finalMeetingLink}" class="cta-button">Join Meeting</a>
            <p class="link-text">${finalMeetingLink}</p>
          </div>
          
          <p style="color: #666;">Please ensure you are available at the scheduled time. Make sure your camera and microphone are working properly.</p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">© 2026 Mentor Connect. All rights reserved.</p>
          <p class="footer-note">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Email to mentee
  const menteeEmailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 20px; }
        .details-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px; }
        .detail-row { display: flex; margin: 12px 0; align-items: flex-start; }
        .detail-label { font-weight: 600; color: #667eea; min-width: 120px; }
        .detail-value { color: #333; }
        .cta-section { text-align: center; margin: 30px 0; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 15px 0; }
        .cta-button:hover { background: #764ba2; }
        .link-text { color: #667eea; word-break: break-all; font-size: 13px; margin-top: 10px; }
        .footer { background: #f8f9fa; padding: 25px 20px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #e9ecef; }
        .footer-note { margin: 10px 0; }
        .highlight { color: #667eea; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Session Confirmed</h1>
        </div>
        
        <div class="content">
          <p>Hello ${menteeName},</p>
          
          <p>Your mentoring session has been successfully booked with <span class="highlight">${mentorName}</span>.</p>
          
          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">Mentor:</span>
              <span class="detail-value">${mentorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${bookingDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${timeSlot}</span>
            </div>
          </div>
          
          <div class="cta-section">
            <p style="color: #666; margin-bottom: 10px;">Click below to join the meeting:</p>
            <a href="${finalMeetingLink}" class="cta-button">Join Meeting</a>
            <p class="link-text">${finalMeetingLink}</p>
          </div>
          
          <p style="color: #666;">
            <strong>Before the session:</strong> Make sure your internet connection is stable, camera and microphone are working properly, and you're in a quiet environment.
          </p>
          
          <p style="color: #666;">
            <strong>Need help?</strong> If you have any issues joining the meeting or need to reschedule, contact our support team.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">© 2026 Mentor Connect. All rights reserved.</p>
          <p class="footer-note">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    console.log('[BOOKING_EMAIL] Starting to send booking emails...');
    console.log('[BOOKING_EMAIL] Mentor email:', mentorEmail, 'Mentee email:', menteeEmail);
    console.log('[BOOKING_EMAIL] Meeting link:', finalMeetingLink);
    
    // Send email to mentor
    await sendEmail({
      to: mentorEmail,
      subject: `New Session Booked by ${menteeName}`,
      htmlContent: mentorEmailContent,
    });

    // Send email to mentee
    await sendEmail({
      to: menteeEmail,
      subject: `Your Mentoring Session is Confirmed`,
      htmlContent: menteeEmailContent,
    });

    console.log('[BOOKING_EMAIL] Both emails sent successfully');
    return { success: true, message: 'Emails sent successfully' };
  } catch (error: any) {
    console.error('[BOOKING_EMAIL] Error sending booking emails:', error?.response?.data || error?.message || error);
    throw error;
  }
};
