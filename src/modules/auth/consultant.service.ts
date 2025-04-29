import { Injectable, BadRequestException, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { NotificationService } from '../notifications/services/notification.service';
import { Request } from 'express';
import { SystemLogsService } from '../system-logs/services/system-logs.service';
import { LogSeverity } from '../system-logs/schemas/system-log.schema';

@Injectable()
export class ConsultantService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    private readonly notificationService: NotificationService,
    private readonly systemLogService: SystemLogsService,
    private readonly systemLogsService: SystemLogsService,
  ) { }

  private async validateUniqueFields(consultantData: any) {
    try {
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

      await Promise.all(checks.map(async check => {
        const existing = await this.userModel.findOne({ [check.field]: check.value });
        if (existing) {
          // Log validation failure
          await this.systemLogService.createLog(
            'CONSULTANT_VALIDATION_FAILED',
            `Registration validation failed: ${check.message} (Field: ${check.field}, Value: ${check.value})`,
            LogSeverity.ERROR
          );
          throw new BadRequestException(check.message);
        }
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to validate consultant data: ' + error.message);
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

    // Create system log
    await this.systemLogService.createLog(
      'CONSULTANT_REGISTRATION',
      `New consultant registration: ${consultant.firstName} ${consultant.lastName} (ID: ${consultant._id}, Email: ${consultant.email})`,
      LogSeverity.INFO
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

    // Create system log
    await this.systemLogService.createLog(
      'CONSULTANT_APPROVAL',
      `Consultant ${consultant.firstName} ${consultant.lastName} has been approved (ID: ${consultant._id})`,
      LogSeverity.INFO
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

    // Create system log
    await this.systemLogService.createLog(
      'CONSULTANT_REJECTION',
      `Consultant ${consultant.firstName} ${consultant.lastName} has been rejected (ID: ${consultant._id})${reason ? `, Reason: ${reason}` : ''}`,
      LogSeverity.INFO
    );
  }

  private async sendOrganizationRegistrationNotifications(organization: OrganizationDocument) {
    // Send email notification
    const emailBody = `
Dear ${organization.companyName} Team,

Thank you for registering your organization with SRCC. Your application has been received and is currently under review.

Registration Details:
- Company Name: ${organization.companyName}
- Registration Number: ${organization.registrationNumber}
- Business Address: ${organization.businessAddress}
- County: ${organization.county}

Next Steps:
1. Our team will review your application and verify all submitted documents
2. You will receive a notification once the review is complete
3. If approved, you will be able to access all SRCC services
4. If we need any additional information, we will contact you

Please note that the review process typically takes 2-3 business days. You can check your application status by logging in to your account.

For any urgent queries, please contact our support team:
- Email: support@srcc.co.ke
- Phone: +254XXXXXXXXX

Best regards,
SRCC Team
    `;

    await this.notificationService.sendEmail(
      organization.businessEmail,
      'SRCC Organization Registration Confirmation',
      emailBody
    );

    // Send SMS notification
    const smsBody = `Dear ${organization.companyName}, your SRCC organization registration (Ref: ${organization.registrationNumber}) is under review. We will notify you once the review is complete.`;
    
    await this.notificationService.sendSMS(
      organization.businessPhone,
      smsBody
    );
  }

  private async sendOrganizationApprovalNotifications(organization: OrganizationDocument) {
    // Send email notification
    const emailBody = `
Dear ${organization.companyName} Team,

Congratulations! Your organization's registration with SRCC has been approved.

Important Information:
- Organization ID: ${organization._id}
- Registration Number: ${organization.registrationNumber}
- Access Level: Full
- Status: Active

Next Steps:
1. Log in to your SRCC account
2. Complete your organization profile
3. Add team members and assign roles
4. Browse available projects and opportunities
5. Update your service offerings

Important Links:
- Login: https://srcc.co.ke/login
- Organization Dashboard: https://srcc.co.ke/org/dashboard
- Help Center: https://srcc.co.ke/help

For any assistance, please contact our support team:
- Email: support@srcc.co.ke
- Phone: +254XXXXXXXXX

Welcome to SRCC!

Best regards,
SRCC Team
    `;

    await this.notificationService.sendEmail(
      organization.businessEmail,
      'SRCC Organization Registration Approved',
      emailBody
    );

    // Send SMS notification
    const smsBody = `Congratulations! ${organization.companyName}'s SRCC registration has been approved. You can now log in to your account and access all SRCC services.`;
    
    await this.notificationService.sendSMS(
      organization.businessPhone,
      smsBody
    );
  }

  private async sendOrganizationRejectionNotifications(organization: OrganizationDocument, reason?: string) {
    // Send email notification
    const emailBody = `
Dear ${organization.companyName} Team,

We regret to inform you that your organization's registration with SRCC has been rejected.

${reason ? `Reason for Rejection:\n${reason}\n\n` : ''}

If you would like to appeal this decision or submit a new application with updated information, please:
1. Review the rejection reason carefully
2. Gather any additional required documentation
3. Contact our support team for guidance
4. Submit a new application addressing the concerns

For assistance or clarification, please contact our support team:
- Email: support@srcc.co.ke
- Phone: +254XXXXXXXXX

We appreciate your interest in SRCC and hope to work with you in the future.

Best regards,
SRCC Team
    `;

    await this.notificationService.sendEmail(
      organization.businessEmail,
      'SRCC Organization Registration Update',
      emailBody
    );

    // Send SMS notification
    const smsBody = `Dear ${organization.companyName}, your SRCC registration has been rejected. Please check your email for details or contact our support team for assistance.`;
    
    await this.notificationService.sendSMS(
      organization.businessPhone,
      smsBody
    );
  }

  private generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async register(consultantData: any,
        req?: Request,
  ): Promise<UserDocument> {
    // Validate unique fields
    await this.validateUniqueFields(consultantData);

    // Generate and save registration PIN
    const registrationPin = this.generatePin();
    consultantData.registrationPin = registrationPin;

    // Create new consultant
    const newConsultant = new this.userModel({
      ...consultantData,
      status: 'pending',
      roles: ['consultant']
    });

    // Save the consultant
    const savedConsultant = await newConsultant.save();

    // Send PIN via NotificationService
    const pinMsg = `Your SRCC registration PIN is: ${registrationPin}. This PIN will be required to activate your account when approved.`;
    await this.notificationService.sendRegistrationPin(savedConsultant.phoneNumber, savedConsultant.email, pinMsg);

    // Send notifications
    await this.sendRegistrationNotifications(savedConsultant); 

    // Log successful registration
    await this.systemLogsService.createLog(
      'User Registration',
      `New user registered: ${savedConsultant.firstName} ${savedConsultant.lastName} (${savedConsultant.email})`,
      LogSeverity.INFO,
      savedConsultant.employeeId?.toString(),
      req,
    );
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

    // Log successful approval
    await this.systemLogsService.createLog(
      'User Approval',
      `User approved: ${updatedConsultant.firstName} ${updatedConsultant.lastName} (${updatedConsultant.email})`,
      LogSeverity.INFO,
      updatedConsultant.employeeId?.toString(),
    );
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

  // Organization Services
  async registerOrganization(registerOrgDto: any, req?: Request): Promise<Organization> {
    try {
      // Validate organization data
      await this.validateOrganizationData(registerOrgDto);

      // Create new organization
      const organization = new this.organizationModel(registerOrgDto);
      
      // Log registration attempt
      await this.systemLogService.createLog(
        'ORGANIZATION_REGISTRATION_ATTEMPT',
        `Organization registration attempt: ${registerOrgDto.companyName} (Reg: ${registerOrgDto.registrationNumber}, KRA: ${registerOrgDto.kraPin})`,
        LogSeverity.INFO
      );

      const savedOrg = await organization.save();

      // Log successful registration
      await this.systemLogService.createLog(
        'ORGANIZATION_REGISTRATION_SUCCESS',
        `New organization registered: ${savedOrg.companyName} (ID: ${savedOrg._id}, Reg: ${savedOrg.registrationNumber})`,
        LogSeverity.INFO
      );

      // Send notifications
      await this.sendOrganizationRegistrationNotifications(savedOrg);

      return savedOrg;
    } catch (error) {
      // Log registration failure
      await this.systemLogService.createLog(
        'ORGANIZATION_REGISTRATION_FAILED',
        `Organization registration failed for ${registerOrgDto.companyName}: ${error.message}`,
        LogSeverity.ERROR
      );

      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to register organization: ' + error.message);
    }
  }

  private async validateOrganizationData(orgData: any) {
    // Check for required fields
    const requiredFields = ['companyName', 'registrationNumber', 'kraPin', 'businessEmail', 'businessPhone'];
    for (const field of requiredFields) {
      if (!orgData[field]) {
        throw new BadRequestException(`${field} is required`);
      }
    }

    // Check for existing organization
    const existingOrg = await this.organizationModel.findOne({
      $or: [
        { registrationNumber: orgData.registrationNumber },
        { kraPin: orgData.kraPin },
        { businessEmail: orgData.businessEmail }
      ]
    });

    if (existingOrg) {
      let message = 'Organization with same ';
      if (existingOrg.registrationNumber === orgData.registrationNumber) {
        message += 'registration number';
      } else if (existingOrg.kraPin === orgData.kraPin) {
        message += 'KRA PIN';
      } else {
        message += 'business email';
      }
      message += ' already exists';
      
      throw new ConflictException(message);
    }

    // Validate phone number format
    const phoneRegex = /^254\d{9}$/;
    if (!phoneRegex.test(orgData.businessPhone)) {
      throw new BadRequestException('Invalid phone number format. Must be in format: 254XXXXXXXXX');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orgData.businessEmail)) {
      throw new BadRequestException('Invalid email format');
    }

  }

  async getOrganizations(): Promise<Organization[]> {
    try {
      return await this.organizationModel.find()
        .select('-__v')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch organizations: ' + error.message);
    }
  }

  async getOrganization(id: string): Promise<Organization> {
    try {
      const organization = await this.organizationModel.findById(id)
        .select('-__v')
        .exec();
      
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      return organization;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch organization: ' + error.message);
    }
  }

  async approveOrganization(id: string): Promise<Organization> {
    try {
      const organization = await this.organizationModel.findById(id);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      if (organization.status !== 'pending') {
        throw new BadRequestException('Organization is not in pending status');
      }

      // Update status and save
      organization.status = 'active';
      const updatedOrg = await organization.save();

      // Send notifications
      await this.sendOrganizationApprovalNotifications(updatedOrg);

      return updatedOrg;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to approve organization: ' + error.message);
    }
  }

  async rejectOrganization(id: string, reason: string): Promise<Organization> {
    try {
      const organization = await this.organizationModel.findById(id);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      if (organization.status !== 'pending') {
        throw new BadRequestException('Organization is not in pending status');
      }

      if (!reason) {
        throw new BadRequestException('Rejection reason is required');
      }

      // Update status and save
      organization.status = 'inactive';
      const updatedOrg = await organization.save();

      // Send notifications
      await this.sendOrganizationRejectionNotifications(updatedOrg, reason);

      return updatedOrg;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to reject organization: ' + error.message);
    }
  }

  async getPendingOrganizations(): Promise<Organization[]> {
    try {
      return await this.organizationModel.find({ status: 'pending' })
        .select('-__v')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch pending organizations: ' + error.message);
    }
  }
}
