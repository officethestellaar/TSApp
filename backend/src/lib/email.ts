import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendResetPasswordEmail = async (email: string, tempPassword: string) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

  console.log(`[Auth] Attempting real SMTP transmission to ${email}...`);

  const mailOptions = {
    from: `"Stellaar Support" <${process.env.SMTP_USER || 'support@stellaar.com'}>`,
    to: email,
    subject: 'Security Key Reset - Stellaar',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #1a237e; text-align: center;">Security Key Reset</h2>
        <p>You are receiving this email because a password reset was requested for your account.</p>
        <p>Your security key has been reset to the following temporary node:</p>
        <div style="text-align: center; margin: 30px 0; background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; font-weight: bold; color: #1a237e;">
          ${tempPassword}
        </div>
        <p>Please use this key to enter the estate and immediately reconfigure your security credentials in your profile dashboard.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #1a237e; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Estate</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777777; text-align: center;">Stellaar V2.0 - Secure Management Node</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendNewActivityEmail = async (emails: string[], activityName: string, activityDesc: string, startTime: Date) => {
  if (!process.env.SMTP_USER) {
    console.log(`[DEV] NEW ACTIVITY EMAIL DISPATCHED to ${emails.length} members for ${activityName}`);
    return;
  }

  const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/member/activities`;
  const formattedDate = new Date(startTime).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const mailOptions = {
    from: `"Stellaar Curation" <${process.env.SMTP_USER || 'support@stellaar.com'}>`,
    bcc: emails, // Use BCC to protect member privacy
    subject: `New Estate Experience: ${activityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #c5a059; text-align: center;">New Estate Curation Added</h2>
        <p>A new experience has been added to the Stellaar registry for your consideration.</p>
        <div style="margin: 30px 0; background-color: #0a192f; color: #ffffff; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #c5a059;">${activityName}</h3>
          <p style="font-size: 14px; opacity: 0.9;">${activityDesc}</p>
          <p style="font-size: 14px; margin-bottom: 0;"><strong>Scheduled For:</strong> ${formattedDate}</p>
        </div>
        <p>Reservations are now open. Please visit the member portal to secure your node.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${portalUrl}" style="background-color: #c5a059; color: #0a192f; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Curation</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777777; text-align: center;">Stellaar V2.0 - Premium Management Node</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Email] Failed to dispatch activity notification:', error);
  }
};
