import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: this.configService.get<string>('SMTP_SERVICE'),
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: true, // true for port 465
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendRegistrationPin(
    phoneNumber: string,
    email: string,
    message: string,
  ): Promise<boolean> {
    try {
      const portalUrl = 'https://cleanuri.com/JWpdAE';
      const finalSmsMessage = `${message}\nAccess SRCC Portal: ${portalUrl}`;
      const response = await axios.post(process.env.SMS_API_URL, {
        apikey: process.env.SMS_API_KEY,
        partnerID: process.env.SMS_PARTNER_ID,
        message: finalSmsMessage,
        shortcode: process.env.SMS_SHORTCODE,
        mobile: phoneNumber,
      });
      this.sendEmail(email, `SRCC OTP`, message);

      if (response.status === 200) {
        this.logger.log(`SMS sent successfully to ${phoneNumber}`);
        return true;
      }

      this.logger.error(`Failed to send SMS to ${phoneNumber}`);
      return false;
    } catch (error) {
      this.logger.error(
        `Error sending SMS to ${phoneNumber}: ${error.message}`,
      );
      return false;
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const portalUrl = 'https://cleanuri.com/JWpdAE';
      const finalMessage = `${message}\nAccess SRCC Portal: ${portalUrl}`;
      const response = await axios.post(process.env.SMS_API_URL, {
        apikey: process.env.SMS_API_KEY,
        partnerID: process.env.SMS_PARTNER_ID,
        message: finalMessage,
        shortcode: process.env.SMS_SHORTCODE,
        mobile: phoneNumber,
      });

      if (response.status === 200) {
        this.logger.log(`SMS sent successfully to ${phoneNumber}`);
        return true;
      }

      this.logger.error(`Failed to send SMS to ${phoneNumber}`);
      return false;
    } catch (error) {
      this.logger.error(
        `Error sending SMS to ${phoneNumber}: ${error.message}`,
      );
      return false;
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    message: string,
  ): Promise<boolean> {
    try {
      await this.transporter.verify();

      const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f7f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #003366;
            color: #ffffff;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 0 0 5px 5px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          }
          .tagline {
            font-size: 14px;
            margin: 5px 0 0;
            opacity: 0.8;
          }
          .message {
            margin-bottom: 20px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .cta {
            display: inline-block;
            margin-top: 16px;
            padding: 10px 16px;
            background-color: #003366;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          }
          @media only screen and (max-width: 600px) {
            .container {
              width: 100%;
              padding: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">SRCC</h1>
            <p class="tagline">Strathmore Research and Consultancy Centre</p>
          </div>
          <div class="content">
            <div class="message">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div style="text-align:center;">
              <a class="cta" href="https://cleanuri.com/JWpdAE" target="_blank" rel="noopener">Access SRCC Portal</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

      const mailOptions = {
        from: {
          name: 'SRCC',
          address: this.configService.get<string>('SMTP_USER'),
        },
        to,
        subject,
        text: message,
        html: htmlTemplate,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${to} - MessageId: ${info.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending email to ${to}: ${error.message}`,
        error,
      );

      if (error.code === 'ECONNECTION' || error.code === 'EAUTH') {
        this.logger.error(
          'SMTP connection or authentication error. Please check your SMTP settings.',
        );
      }
      return false;
    }
  }

  async sendEmailWithAttachments(
    to: string,
    subject: string,
    message: string,
    attachments: Array<{
      filename: string;
      content: Buffer | string;
    }>,
  ): Promise<boolean> {
    try {
      await this.transporter.verify();

      const mailOptions = {
        from: {
          name: 'SRCC',
          address: this.configService.get<string>('SMTP_USER'),
        },
        to,
        subject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2c3e50; margin: 0;">SRCC</h1>
              <p style="color: #7f8c8d; margin: 5px 0;">Strathmore Research and Consultancy Centre</p>
            </div>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div style="text-align:center; margin-top: 16px;">
              <a href="https://cleanuri.com/JWpdAE" target="_blank" rel="noopener" style="display:inline-block;padding:10px 16px;background:#003366;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;">Access SRCC Portal</a>
            </div>
            <div style="margin-top: 20px; padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
              <p>This is an automated message from SRCC. Please do not reply to this email.</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        `,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email with attachments sent successfully to ${to} - MessageId: ${info.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending email with attachments to ${to}: ${error.message}`,
      );
      if (error.code === 'ECONNECTION' || error.code === 'EAUTH') {
        this.logger.error(
          'SMTP connection or authentication error. Please check your SMTP settings.',
        );
      }
      return false;
    }
  }

  async sendContractNotification(
    to: string,
    phoneNumber: string,
    subject: string,
    contractDetails: {
      contractNumber: string;
      description: string;
      contractValue: number;
      currency: string;
      startDate: Date;
      endDate: Date;
      recipientName: string;
    },
  ): Promise<boolean> {
    try {
      // Format the contract letter
      const message = `
Dear ${contractDetails.recipientName},

Ref. No: ${contractDetails.contractNumber}

Re: Contract Appointment with Strathmore Research and Consultancy Centre Ltd (SRCC)

SRCC is pleased to appoint you for the following contract:

${contractDetails.description}

Contract Details:
- Contract Number: ${contractDetails.contractNumber}
- Contract Value: ${contractDetails.contractValue} ${contractDetails.currency}
- Start Date: ${contractDetails.startDate.toLocaleDateString()}
- End Date: ${contractDetails.endDate.toLocaleDateString()}

You will need to complete and sign the contract by logging into the SRCC portal and verifying your identity with the OTP that will be sent to you.

We hope to receive your acceptance within one week from the receipt of this letter. The appointment terminates with the conclusion of the project.

Best regards,
SRCC Management Team
      `;

      // Send email
      const emailSent = await this.sendEmail(to, subject, message);

      // Send SMS notification
      const smsMessage = `SRCC: You have been assigned to a new contract (${contractDetails.contractNumber}). Please log in to the SRCC portal to review and accept.`;
      const smsSent = await this.sendSMS(phoneNumber, smsMessage);

      return emailSent && smsSent;
    } catch (error) {
      this.logger.error(
        `Error sending contract notification to ${to}: ${error.message}`,
        error,
      );
      return false;
    }
  }
}
