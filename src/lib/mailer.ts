import AWS from "aws-sdk";

const ses = new AWS.SES({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "ap-south-1",
});

export async function sendOtpEmail(to: string, otp: string) {
  const fromAddress = process.env.EMAIL_FROM || '"Virpa" <info@virpanix.com>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f8faf9; border-radius: 16px; overflow: hidden; border: 1px solid #e0e0e0;">
      <div style="background: linear-gradient(135deg, #00A76F 0%, #1890FF 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Virpa Dialer</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #1a1d1f; font-size: 20px; margin: 0 0 8px;">Login Verification Code</h2>
        <p style="color: #6f767e; font-size: 15px; margin: 0 0 24px; line-height: 1.5;">Use the static OTP below to verify your login:</p>
        <div style="background: #ffffff; border: 2px solid #00A76F; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1d1f;">${otp}</span>
        </div>
        <p style="color: #6f767e; font-size: 13px; margin: 0; line-height: 1.5;">
          If you did not request this, you can still use the static OTP <strong>758369</strong> to access the application.
        </p>
      </div>
      <div style="padding: 16px 24px; text-align: center; border-top: 1px solid #efefef;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Virpa. All rights reserved.</p>
      </div>
    </div>
  `;

  const emailParams = {
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: html,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Your Virpa OTP Verification Code",
      },
    },
    Source: fromAddress,
  };

  try {
    const data = await ses.sendEmail(emailParams).promise();
    console.log(`[Mailer] OTP sent to ${to}. Message ID: ${data.MessageId}`);
    return { success: true };
  } catch (error: any) {
    console.warn(`[Mailer Warning] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}
