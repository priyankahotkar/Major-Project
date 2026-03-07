import * as functions from "firebase-functions";
import axios from "axios";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailRequest {
  to: string;
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

/**
 * HTTP function to send emails via Brevo
 * This solves the IP whitelisting issue by using Firebase's stable IP
 */
export const brevoEmailProxy = functions.https.onCall(
  async (data: EmailRequest) => {
    try {
      if (!BREVO_API_KEY) {
        throw new Error("BREVO_API_KEY is not configured in environment");
      }

      console.log("[BREVO_PROXY] Sending email to:", data.to);

      const response = await axios.post(
        BREVO_API_URL,
        {
          sender: {
            name: data.senderName || "Mentor Connect",
            email: data.senderEmail || "mentorconnect698@gmail.com",
          },
          to: [{ email: data.to }],
          subject: data.subject,
          htmlContent: data.htmlContent,
        },
        {
          headers: {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("[BREVO_PROXY] Email sent successfully to:", data.to);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error("[BREVO_PROXY] Error:", error?.response?.data || error?.message);
      throw new functions.https.HttpsError(
        "internal",
        error?.response?.data?.message || "Failed to send email"
      );
    }
  }
);
