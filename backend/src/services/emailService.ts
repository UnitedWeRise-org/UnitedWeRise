import nodemailer from 'nodemailer';
import { isProduction } from '../utils/environment';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Try SMTP configuration first
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: isProduction()
          }
        });
        console.log('Email service initialized with SMTP');
        return;
      }

      // Fallback configurations can be added here for SendGrid, AWS SES, etc.
      console.warn('No email service configured. Please set SMTP or other email service credentials.');
      
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text || this.stripHtml(template.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Email verification template
  generateEmailVerificationTemplate(email: string, verifyToken: string, firstName?: string): EmailTemplate {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
    const name = firstName || 'there';

    return {
      to: email,
      subject: 'Verify Your United We Rise Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4b5c09 0%, #6b7f1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🇺🇸 United We Rise</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Verify Your Account</p>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #4b5c09; margin-top: 0;">Hi ${name}!</h2>
            
            <p>Welcome to United We Rise! We're excited to have you join our community of engaged citizens working together for positive change.</p>
            
            <p>To complete your registration and start connecting with your representatives and fellow citizens, please verify your email address:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #4b5c09; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #4b5c09; word-break: break-all;">${verifyUrl}</a>
            </p>
            
            <p style="font-size: 14px; color: #666;">
              This verification link will expire in 24 hours. If you didn't create an account with United We Rise, you can safely ignore this email.
            </p>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #666;">
              <p style="margin: 0;">
                <strong>United We Rise</strong><br>
                Connecting Citizens, Empowering Democracy
              </p>
              <p style="margin: 10px 0 0 0;">
                Questions? Contact us at support@yourdomain.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to United We Rise!
        
        Hi ${name}!
        
        Please verify your email address by visiting: ${verifyUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create an account, you can ignore this email.
        
        United We Rise - Connecting Citizens, Empowering Democracy
      `
    };
  }

  // Password reset template
  generatePasswordResetTemplate(email: string, resetToken: string, firstName?: string): EmailTemplate {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const name = firstName || 'there';

    return {
      to: email,
      subject: 'Reset Your United We Rise Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4b5c09 0%, #6b7f1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🇺🇸 United We Rise</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Password Reset</p>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #4b5c09; margin-top: 0;">Hi ${name},</h2>
            
            <p>We received a request to reset your United We Rise account password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #4b5c09; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${resetUrl}" style="color: #4b5c09; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <p style="font-size: 14px; color: #666;">
              This reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
        </body>
        </html>
      `
    };
  }

  // Welcome email after verification
  generateWelcomeTemplate(email: string, firstName?: string): EmailTemplate {
    const name = firstName || 'there';

    return {
      to: email,
      subject: 'Welcome to United We Rise! 🇺🇸',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to United We Rise</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4b5c09 0%, #6b7f1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Welcome ${name}!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You're now part of United We Rise</p>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Your email has been verified and your account is now active!</p>
            
            <h3 style="color: #4b5c09;">What you can do now:</h3>
            <ul style="padding-left: 20px;">
              <li><strong>Find Your Representatives:</strong> Use our interactive map to see your elected officials</li>
              <li><strong>Connect with Citizens:</strong> Follow other users and engage in meaningful discussions</li>
              <li><strong>Share Your Voice:</strong> Post about issues that matter to you</li>
              <li><strong>Stay Informed:</strong> Get updates on political developments in your area</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}" style="background: #4b5c09; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Start Exploring
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              <strong>Pro tip:</strong> Complete your profile and add your address to unlock all features, including finding your local representatives and connecting with citizens in your area.
            </p>
          </div>
        </body>
        </html>
      `
    };
  }

  // Moderation notification templates
  generateWarningTemplate(email: string, reason: string, severity: string, firstName?: string): EmailTemplate {
    const name = firstName ? firstName : email.split('@')[0];
    
    return {
      to: email,
      subject: `Account Warning - United We Rise`,
      text: `Hello ${name},

You have received a ${severity.toLowerCase()} warning on United We Rise for the following reason:

${reason}

Please review our community guidelines to avoid future violations. Continued violations may result in account restrictions or suspension.

If you believe this warning was issued in error, you may appeal by contacting our support team.

Best regards,
The United We Rise Moderation Team`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">United We Rise</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Community Guidelines Notice</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 30px;">
              <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">Account Warning Issued</h2>
              <p style="color: #b45309; margin: 0; font-weight: 500;">Severity: ${severity}</p>
            </div>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
              Hello ${name},
            </p>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
              You have received a <strong>${severity.toLowerCase()}</strong> warning on United We Rise for the following reason:
            </p>
            
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #1f2937; margin: 0; font-weight: 500;">${reason}</p>
            </div>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
              Please review our <a href="${process.env.FRONTEND_URL}/community-guidelines" style="color: #2563eb; text-decoration: none; font-weight: 500;">community guidelines</a> to avoid future violations. Continued violations may result in account restrictions or suspension.
            </p>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
              If you believe this warning was issued in error, you may appeal by contacting our support team.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/support" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Contact Support</a>
            </div>
          </div>
          
          <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Best regards,<br>
              The United We Rise Moderation Team
            </p>
          </div>
        </div>
      `
    };
  }

  generateSuspensionTemplate(email: string, reason: string, type: string, endsAt?: Date, firstName?: string): EmailTemplate {
    const name = firstName ? firstName : email.split('@')[0];
    const isPermanent = !endsAt;
    const endDate = endsAt ? endsAt.toLocaleDateString() : null;
    
    return {
      to: email,
      subject: `Account ${isPermanent ? 'Suspended' : 'Temporarily Suspended'} - United We Rise`,
      text: `Hello ${name},

Your United We Rise account has been ${isPermanent ? 'suspended' : 'temporarily suspended'} for the following reason:

${reason}

${isPermanent ? 'This suspension is permanent.' : `This suspension will expire on ${endDate}.`}

If you believe this action was taken in error, you may submit an appeal through our support system.

Best regards,
The United We Rise Moderation Team`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">United We Rise</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Account Action Notice</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin-bottom: 30px;">
              <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 20px;">Account ${isPermanent ? 'Suspended' : 'Temporarily Suspended'}</h2>
              <p style="color: #b91c1c; margin: 0; font-weight: 500;">Type: ${type.replace('_', ' ')}</p>
            </div>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
              Hello ${name},
            </p>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
              Your United We Rise account has been ${isPermanent ? 'suspended' : 'temporarily suspended'} for the following reason:
            </p>
            
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #1f2937; margin: 0; font-weight: 500;">${reason}</p>
            </div>
            
            ${!isPermanent ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="color: #92400e; margin: 0; font-weight: 600;">Suspension expires on ${endDate}</p>
            </div>
            ` : `
            <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="color: #dc2626; margin: 0; font-weight: 600;">This suspension is permanent</p>
            </div>
            `}
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
              If you believe this action was taken in error, you may submit an appeal through our support system.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/appeal" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Submit Appeal</a>
            </div>
          </div>
          
          <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Best regards,<br>
              The United We Rise Moderation Team
            </p>
          </div>
        </div>
      `
    };
  }

  generateReportUpdateTemplate(email: string, reportId: string, action: string, notes?: string, firstName?: string): EmailTemplate {
    const name = firstName ? firstName : email.split('@')[0];
    
    return {
      to: email,
      subject: `Report Update - United We Rise`,
      text: `Hello ${name},

Your report (ID: ${reportId}) has been reviewed and resolved.

Action taken: ${action.replace('_', ' ')}

${notes ? `Moderator notes: ${notes}` : ''}

Thank you for helping keep our community safe.

Best regards,
The United We Rise Moderation Team`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">United We Rise</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Report Update</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin-bottom: 30px;">
              <h2 style="color: #15803d; margin: 0 0 10px 0; font-size: 20px;">Report Resolved</h2>
              <p style="color: #166534; margin: 0; font-weight: 500;">Report ID: ${reportId}</p>
            </div>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
              Hello ${name},
            </p>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
              Your report has been reviewed and resolved by our moderation team.
            </p>
            
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #1f2937; margin: 0 0 10px 0; font-weight: 600;">Action taken:</p>
              <p style="color: #374151; margin: 0;">${action.replace('_', ' ')}</p>
              
              ${notes ? `
              <p style="color: #1f2937; margin: 20px 0 10px 0; font-weight: 600;">Moderator notes:</p>
              <p style="color: #374151; margin: 0;">${notes}</p>
              ` : ''}
            </div>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
              Thank you for helping keep our community safe. Your reports help us maintain a positive environment for all users.
            </p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Best regards,<br>
              The United We Rise Moderation Team
            </p>
          </div>
        </div>
      `
    };
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Candidate waiver approval template
  generateWaiverApprovalTemplate(email: string, candidateName: string, officeLevel: string, finalFee: number, firstName?: string): EmailTemplate {
    const name = firstName || candidateName.split(' ')[0];
    const isFullWaiver = finalFee === 0;
    
    return {
      to: email,
      subject: '✅ Fee Waiver Approved - United We Rise',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Fee Waiver Approved</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4b5c09 0%, #6b7f1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Waiver Approved!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Candidate Registration - United We Rise</p>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #4b5c09; margin-top: 0;">Great news, ${name}!</h2>
            
            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #155724; font-weight: 600;">
                Your hardship fee waiver has been approved for ${officeLevel} level candidacy.
              </p>
            </div>
            
            <p><strong>Final Registration Fee:</strong> ${isFullWaiver ? 'FREE (100% waiver)' : `$${finalFee} (reduced from original fee)`}</p>
            
            ${isFullWaiver ? `
              <p>Your registration is now <strong>complete</strong>! You can begin using your candidate profile immediately.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/candidate-dashboard" 
                   style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Access Your Candidate Dashboard
                </a>
              </div>
            ` : `
              <p>Please complete your registration by paying the reduced fee:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/candidate/payment" 
                   style="background: #4b5c09; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Pay $${finalFee} to Complete Registration
                </a>
              </div>
            `}
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #4b5c09; margin: 0 0 10px 0;">Next Steps:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                <li>Complete your candidate profile</li>
                <li>Verify all required documents</li>
                <li>Begin engaging with constituents</li>
                <li>Access campaign tools and resources</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Questions? Contact our candidate support team at <a href="mailto:candidates@unitedwerise.org" style="color: #4b5c09;">candidates@unitedwerise.org</a>
            </p>
          </div>
        </body>
        </html>
      `
    };
  }

  // Candidate waiver denial template
  generateWaiverDenialTemplate(email: string, candidateName: string, officeLevel: string, originalFee: number, denialReason?: string, firstName?: string): EmailTemplate {
    const name = firstName || candidateName.split(' ')[0];
    
    return {
      to: email,
      subject: '📋 Fee Waiver Decision - United We Rise',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Fee Waiver Decision</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4b5c09 0%, #6b7f1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">📋 Waiver Decision</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Candidate Registration - United We Rise</p>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #4b5c09; margin-top: 0;">Hello ${name},</h2>
            
            <p>Thank you for your interest in becoming a candidate on United We Rise. We have carefully reviewed your hardship fee waiver request.</p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #856404; font-weight: 600;">
                Unfortunately, your fee waiver request was not approved at this time.
              </p>
              ${denialReason ? `<p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">Reason: ${denialReason}</p>` : ''}
            </div>
            
            <p><strong>Registration Fee Required:</strong> $${originalFee} (${officeLevel} level)</p>
            
            <p>You can still complete your candidate registration by paying the standard fee:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/candidate/payment" 
                 style="background: #4b5c09; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Pay $${originalFee} to Complete Registration
              </a>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #4b5c09; margin: 0 0 10px 0;">Other Options:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                <li><strong>Community Endorsement:</strong> Get 10+ endorsements for 50% fee reduction</li>
                <li><strong>Reapply Later:</strong> You can request another waiver in 30 days</li>
                <li><strong>Appeal:</strong> Contact support if you believe this decision was in error</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Questions or want to appeal? Contact us at <a href="mailto:waivers@unitedwerise.org" style="color: #4b5c09;">waivers@unitedwerise.org</a>
            </p>
            
            <p style="font-size: 14px; color: #666;">
              <em>Note: Your registration will remain in our system for 60 days. You can complete payment anytime within this period.</em>
            </p>
          </div>
        </body>
        </html>
      `
    };
  }

  // Test email service
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email service connection successful');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();