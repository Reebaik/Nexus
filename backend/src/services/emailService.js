import nodemailer from 'nodemailer';

let transporter;

const createTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user, 
        pass: testAccount.pass, 
      },
    });
    
    console.log('Ethereal Email Configured (Dev Mode)');
    console.log(`User: ${testAccount.user}`);
    console.log(`Pass: ${testAccount.pass}`);
  }
  return transporter;
};


export const sendResetPasswordEmail = async (email, resetUrl) => {
  const mailTransporter = await createTransporter();

  const mailOptions = {
    from: '"Nexus Support" <support@nexus.com>',
    to: email,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
          .content { padding: 40px 32px; color: #374151; line-height: 1.6; }
          .content h2 { margin-top: 0; color: #111827; font-size: 20px; font-weight: 600; }
          .content p { margin-bottom: 24px; font-size: 16px; }
          .button-wrapper { text-align: center; margin: 32px 0; }
          .button { background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s; }
          .button:hover { background-color: #1d4ed8; }
          .footer { background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer p { margin: 0; color: #6b7280; font-size: 14px; }
          .link-fallback { margin-top: 24px; font-size: 14px; color: #6b7280; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nexus Project Hub</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset the password for your Nexus account. If you didn't make this request, you can safely ignore this email.</p>
            <div class="button-wrapper">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <div class="link-fallback">
              <p>Button not working? Copy and paste this link into your browser:</p>
              <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Nexus Project Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    
    // Preview only available when sending through an Ethereal account
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        console.log('Preview URL: %s', previewUrl);
    }
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
