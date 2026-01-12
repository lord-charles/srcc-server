import axios from 'axios';
import { Logger } from '@nestjs/common';

export interface EmailConfig {
  service: 'gmail' | 'zoho' | 'custom';
  host?: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;
}

export interface EmailPayload {
  config: EmailConfig;
  to: string;
  subject: string;
  message: string;
  html?: string;
  fromName?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    contentType?: string;
  }>;
}

export class EmailClientHelper {
  private readonly logger = new Logger(EmailClientHelper.name);
  private readonly emailServiceUrl: string;

  constructor(emailServiceUrl: string) {
    this.emailServiceUrl = emailServiceUrl;
  }

  async sendEmail(
    payload: EmailPayload,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      this.logger.log(`Sending email to ${payload.to} via email service`);

      const response = await axios.post(
        `${this.emailServiceUrl}/email/send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        },
      );

      if (response.data.success) {
        this.logger.log(
          `Email sent successfully to ${payload.to} - MessageId: ${response.data.messageId}`,
        );
        return response.data;
      } else {
        this.logger.error(
          `Email service failed for ${payload.to}: ${response.data.error}`,
        );
        return response.data;
      }
    } catch (error) {
      this.logger.error(
        `Error calling email service for ${payload.to}: ${error.message}`,
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.emailServiceUrl}/email/health`,
        {},
        {
          timeout: 5000,
        },
      );
      return response.data.status === 'ok';
    } catch (error) {
      this.logger.error('Email service health check failed:', error.message);
      return false;
    }
  }
}
