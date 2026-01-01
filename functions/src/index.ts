import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

interface BookingData {
  menteeId: string;
  menteeName: string;
  mentorId: string;
  mentorName: string;
  date: string;
  timeSlot: string;
}

// Configure email service (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Function to send booking confirmation emails
export const sendBookingEmail = functions.firestore
  .onDocumentCreated("bookings/{bookingId}", async (event) => {
    const bookingData = event.data?.data() as BookingData | undefined;
    
    if (!bookingData) {
      console.error("No booking data found");
      return;
    }

    try {
      // Get mentor details
      const mentorRef = db.collection("users").doc(bookingData.mentorId);
      const mentorSnap = await mentorRef.get();
      const mentorEmail = mentorSnap.data()?.email;

      // Get mentee details
      const menteeRef = db.collection("users").doc(bookingData.menteeId);
      const menteeSnap = await menteeRef.get();
      const menteeEmail = menteeSnap.data()?.email;

      if (!mentorEmail || !menteeEmail) {
        console.error("Email addresses not found for mentor or mentee");
        return;
      }

      const bookingDate = new Date(bookingData.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Email to mentor
      const mentorMailOptions = {
        from: process.env.EMAIL_USER,
        to: mentorEmail,
        subject: `New Session Booked by ${bookingData.menteeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Session Booked</h2>
            <p>Hello ${bookingData.mentorName},</p>
            <p>${bookingData.menteeName} has booked a mentoring session with you.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Session Details:</h3>
              <p><strong>Mentee Name:</strong> ${bookingData.menteeName}</p>
              <p><strong>Date:</strong> ${bookingDate}</p>
              <p><strong>Time:</strong> ${bookingData.timeSlot}</p>
            </div>

            <p>Please ensure you are available at the scheduled time for the meeting.</p>
            <p>Best regards,<br/>Mentor Connect Team</p>
          </div>
        `,
      };

      // Email to mentee
      const menteeMailOptions = {
        from: process.env.EMAIL_USER,
        to: menteeEmail,
        subject: `Mentoring Session Confirmed with ${bookingData.mentorName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Session Booking Confirmed</h2>
            <p>Hello ${bookingData.menteeName},</p>
            <p>Your mentoring session has been successfully booked with ${bookingData.mentorName}.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Session Details:</h3>
              <p><strong>Mentor Name:</strong> ${bookingData.mentorName}</p>
              <p><strong>Date:</strong> ${bookingDate}</p>
              <p><strong>Time:</strong> ${bookingData.timeSlot}</p>
            </div>

            <p>Please join the meeting on time. You will receive a meeting link before the session starts.</p>
            <p>Best regards,<br/>Mentor Connect Team</p>
          </div>
        `,
      };

      // Send both emails
      await transporter.sendMail(mentorMailOptions);
      console.log("Email sent to mentor:", mentorEmail);

      await transporter.sendMail(menteeMailOptions);
      console.log("Email sent to mentee:", menteeEmail);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  });
