import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { NotificationService } from '../notifications/services/notification.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ConsultantService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) { }

  private async validateUniqueFields(consultantData: any) {
    const checks = [
      {
        field: 'email',
        value: consultantData.email,
        message: 'Email already registered'
      },
      {
        field: 'phoneNumber',
        value: consultantData.phoneNumber,
        message: 'Phone number already registered'
      },
      {
        field: 'nationalId',
        value: consultantData.nationalId,
        message: 'National ID already registered'
      },
      {
        field: 'kraPinNumber',
        value: consultantData.kraPinNumber,
        message: 'KRA PIN already registered'
      }
    ];

    for (const check of checks) {
      const existing = await this.userModel.findOne({ [check.field]: check.value });
      if (existing) {
        throw new BadRequestException(check.message);
      }
    }
  }

  private async sendRegistrationNotifications(consultant: UserDocument) {
    // Send email notification
    await this.notificationService.sendEmail(
      consultant.email,
      'SRCC Consultant Registration Confirmation',
      `Dear ${consultant.firstName},

Thank you for registering as a consultant with SRCC. Your application has been received and is currently under review.

We will carefully evaluate your qualifications and experience. You will receive another notification once your application has been reviewed.

Best regards,
SRCC Team`
    );

    // Send SMS notification
    await this.notificationService.sendSMS(
      consultant.phoneNumber,
      `Dear ${consultant.firstName}, thank you for registering with SRCC. Your consultant application is under review. We will notify you once the review is complete.`
    );
  }

  private async sendApprovalNotifications(consultant: UserDocument) {
    // Send email notification
    await this.notificationService.sendEmail(
      consultant.email,
      'SRCC Consultant Application Approved',
      `Dear ${consultant.firstName},

Congratulations! Your application to become a consultant with SRCC has been approved.

You can now log in to your account using your registered email and password. We look forward to working with you.

Important Next Steps:
1. Log in to your account
2. Complete your profile if needed
3. Review available projects
4. Update your availability status

If you have any questions, please don't hesitate to contact our support team.

Best regards,
SRCC Team`
    );

    // Send SMS notification
    await this.notificationService.sendSMS(
      consultant.phoneNumber,
      `Congratulations ${consultant.firstName}! Your SRCC consultant application has been approved. You can now log in to your account. Welcome to the team!`
    );
  }

  private async sendRejectionNotifications(consultant: UserDocument, reason?: string) {
    // Send email notification
    await this.notificationService.sendEmail(
      consultant.email,
      'SRCC Consultant Application Status',
      `Dear ${consultant.firstName},

Thank you for your interest in becoming a consultant with SRCC.

After careful review of your application, we regret to inform you that we are unable to proceed with your application at this time.

${reason ? `Reason: ${reason}

` : ''}You are welcome to apply again in the future when you have gained more experience or if your circumstances change.

Best regards,
SRCC Team`
    );

    // Send SMS notification
    await this.notificationService.sendSMS(
      consultant.phoneNumber,
      `Dear ${consultant.firstName}, we have reviewed your SRCC consultant application. Unfortunately, we are unable to proceed with your application at this time. Check your email for details.`
    );
  }

  async register(consultantData: any): Promise<UserDocument> {
    // Validate unique fields
    await this.validateUniqueFields(consultantData);

    // Hash the password
    const hashedPassword = await bcrypt.hash(consultantData.password, 10);

    // Create new consultant
    const newConsultant = new this.userModel({
      ...consultantData,
      password: hashedPassword,
      status: 'pending',
      roles: ['consultant']
    });

    // Save the consultant
    const savedConsultant = await newConsultant.save();

    // Send notifications
    await this.sendRegistrationNotifications(savedConsultant);

    return savedConsultant;
  }

  async getPendingConsultants(): Promise<UserDocument[]> {
    return this.userModel.find({
      roles: 'consultant',
      status: 'pending'
    }).exec();
  }

  async approveConsultant(id: string): Promise<UserDocument> {
    const consultant = await this.userModel.findById(id);
    if (!consultant) {
      throw new NotFoundException('Consultant not found');
    }

    if (consultant.status !== 'pending') {
      throw new BadRequestException('Consultant application is not pending');
    }

    consultant.status = 'active';
    const updatedConsultant = await consultant.save();

    // Send notifications
    await this.sendApprovalNotifications(updatedConsultant);

    return updatedConsultant;
  }

  async rejectConsultant(id: string, reason?: string): Promise<UserDocument> {
    const consultant = await this.userModel.findById(id);
    if (!consultant) {
      throw new NotFoundException('Consultant not found');
    }

    if (consultant.status !== 'pending') {
      throw new BadRequestException('Consultant application is not pending');
    }

    consultant.status = 'rejected';
    const updatedConsultant = await consultant.save();

    // Send notifications
    await this.sendRejectionNotifications(updatedConsultant, reason);

    return updatedConsultant;
  }
}
