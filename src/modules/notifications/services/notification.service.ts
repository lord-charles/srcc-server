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
      const response = await axios.post(
        process.env.SMS_API_URL,
        {
          apikey: process.env.SMS_API_KEY,
          partnerID: process.env.SMS_PARTNER_ID,
          message: message,
          shortcode: process.env.SMS_SHORTCODE,
          mobile: phoneNumber,
        },
      );
      this.sendEmail(email, `SRCC Pin`, message);

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
      const response = await axios.post(
        process.env.SMS_API_URL,
        {
          apikey: process.env.SMS_API_KEY,
          partnerID: process.env.SMS_PARTNER_ID,
          message: message,
          shortcode: process.env.SMS_SHORTCODE,
          mobile: phoneNumber,
        },
      );

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
              <p style="color: #7f8c8d; margin: 5px 0;">Sustainable Resource Competency Center</p>
            </div>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 20px; padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
              <p>This is an automated message from SRCC. Please do not reply to this email.</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to} - MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`);
      if (error.code === 'ECONNECTION' || error.code === 'EAUTH') {
        this.logger.error('SMTP connection or authentication error. Please check your SMTP settings.');
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
              <p style="color: #7f8c8d; margin: 5px 0;">Sustainable Resource Competency Center</p>
            </div>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${message.replace(/\n/g, '<br>')}
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
      this.logger.log(`Email with attachments sent successfully to ${to} - MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending email with attachments to ${to}: ${error.message}`);
      if (error.code === 'ECONNECTION' || error.code === 'EAUTH') {
        this.logger.error('SMTP connection or authentication error. Please check your SMTP settings.');
      }
      return false;
    }
  }
}
