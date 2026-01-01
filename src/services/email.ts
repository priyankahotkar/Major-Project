import axios from 'axios';

const BREVO_API_KEY = process.env.REACT_APP_BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

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

    console.log('Email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendBookingEmails = async (
  mentorEmail: string,
  mentorName: string,
  menteeEmail: string,
  menteeName: string,
  bookingDate: string,
  timeSlot: string
) => {
  // Email to mentor
  const mentorEmailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Session Booked</h2>
      <p>Hello ${mentorName},</p>
      <p>${menteeName} has booked a mentoring session with you.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Session Details:</h3>
        <p><strong>Mentee Name:</strong> ${menteeName}</p>
        <p><strong>Date:</strong> ${bookingDate}</p>
        <p><strong>Time:</strong> ${timeSlot}</p>
      </div>

      <p>Please ensure you are available at the scheduled time for the meeting.</p>
      <p>Best regards,<br/>Mentor Connect Team</p>
    </div>
  `;

  // Email to mentee
  const menteeEmailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Session Booking Confirmed</h2>
      <p>Hello ${menteeName},</p>
      <p>Your mentoring session has been successfully booked with ${mentorName}.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Session Details:</h3>
        <p><strong>Mentor Name:</strong> ${mentorName}</p>
        <p><strong>Date:</strong> ${bookingDate}</p>
        <p><strong>Time:</strong> ${timeSlot}</p>
      </div>

      <p>Please join the meeting on time. You will receive a meeting link before the session starts.</p>
      <p>Best regards,<br/>Mentor Connect Team</p>
    </div>
  `;

  try {
    // Send email to mentor
    await sendEmail({
      to: mentorEmail,
      subject: `New Session Booked by ${menteeName}`,
      htmlContent: mentorEmailContent,
    });

    // Send email to mentee
    await sendEmail({
      to: menteeEmail,
      subject: `Mentoring Session Confirmed with ${mentorName}`,
      htmlContent: menteeEmailContent,
    });

    return { success: true, message: 'Emails sent successfully' };
  } catch (error) {
    console.error('Error sending booking emails:', error);
    throw error;
  }
};
