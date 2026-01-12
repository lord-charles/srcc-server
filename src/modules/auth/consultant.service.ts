import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { QuickRegisterOrganizationDto } from './dto/quick-register-organization.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import { NotificationService } from '../notifications/services/notification.service';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { SystemLogsService } from '../system-logs/services/system-logs.service';
import { LogSeverity } from '../system-logs/schemas/system-log.schema';

@Injectable()
export class ConsultantService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    private readonly notificationService: NotificationService,
    private readonly systemLogService: SystemLogsService,
  ) {}

  async quickRegister(consultantData: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    nationalId: string;
    password: string;
  }): Promise<UserDocument> {
    const { email, firstName, lastName, phoneNumber, nationalId, password } =
      consultantData;

    try {
      // Validate input data
      if (
        !email ||
        !firstName ||
        !lastName ||
        !phoneNumber ||
        !nationalId ||
        !password
      ) {
        throw new BadRequestException(
          'All fields are required for quick registration',
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new BadRequestException('Invalid email format');
      }

      // Validate phone number format
      const phoneRegex = /^254\d{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new BadRequestException(
          'Invalid phone number format. Must be in format: 254XXXXXXXXX',
        );
      }

      // Validate password strength
      if (password.length < 8) {
        throw new BadRequestException(
          'Password must be at least 8 characters long',
        );
      }

      const existingUser = await this.userModel.findOne({
        $or: [{ email }, { phoneNumber }, { nationalId }],
      });

      if (existingUser) {
        // If user exists and has completed full registration, throw conflict
        if (existingUser.registrationStatus === 'complete') {
          let conflictField = 'details';
          if (existingUser.email === email) conflictField = 'email';
          else if (existingUser.phoneNumber === phoneNumber)
            conflictField = 'phone number';
          else if (existingUser.nationalId === nationalId)
            conflictField = 'national ID';

          throw new ConflictException(
            `A user with this ${conflictField} already exists.`,
          );
        }

        // If user exists from a previous quick registration and is not fully verified
        if (
          existingUser.registrationStatus === 'quick' &&
          (!existingUser.isEmailVerified || !existingUser.isPhoneVerified)
        ) {
          try {
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(password, salt);

            existingUser.password = hashedPassword;
            existingUser.firstName = firstName;
            existingUser.lastName = lastName;
            existingUser.phoneNumber = phoneNumber;
            existingUser.nationalId = nationalId;
            existingUser.phoneVerificationPin = this.generatePin();
            existingUser.emailVerificationPin = this.generatePin();
            const pinExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            existingUser.phoneVerificationPinExpires = pinExpiry;
            existingUser.emailVerificationPinExpires = pinExpiry;

            const savedUser = await existingUser.save();

            // Resend notifications with error handling
            this.sendVerificationPins(savedUser, 'resend').catch((err) => {
              console.error('Failed to resend verification PINs:', err);
              // Log the error but don't fail the registration
              this.systemLogService
                .createLog(
                  'VERIFICATION_PIN_SEND_FAILED',
                  `Failed to resend verification PINs for user ${savedUser.email}: ${err.message}`,
                  LogSeverity.ERROR,
                  savedUser._id?.toString(),
                )
                .catch((logErr) =>
                  console.error('Failed to log error:', logErr),
                );
            });
            return savedUser;
          } catch (error) {
            console.error(
              'Error updating existing user for quick registration:',
              error,
            );
            throw new InternalServerErrorException(
              'Failed to update user registration',
            );
          }
        }
      }

      // Standard new quick registration
      try {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        const phoneVerificationPin = this.generatePin();
        const emailVerificationPin = this.generatePin();
        const pinExpiry = new Date(Date.now() + 10 * 60 * 1000);

        const newUser = new this.userModel({
          email,
          firstName,
          lastName,
          phoneNumber,
          nationalId,
          password: hashedPassword,
          status: 'pending_verification',
          roles: ['consultant'],
          registrationStatus: 'quick',
          isPhoneVerified: false,
          isEmailVerified: false,
          phoneVerificationPin,
          emailVerificationPin,
          phoneVerificationPinExpires: pinExpiry,
          emailVerificationPinExpires: pinExpiry,
        });

        const savedUser = await newUser.save();

        // Send verification PINs with error handling
        this.sendVerificationPins(savedUser, 'new').catch((err) => {
          console.error('Failed to send verification PINs:', err);
          // Log the error but don't fail the registration
          this.systemLogService
            .createLog(
              'VERIFICATION_PIN_SEND_FAILED',
              `Failed to send verification PINs for new user ${savedUser.email}: ${err.message}`,
              LogSeverity.ERROR,
              savedUser._id?.toString(),
            )
            .catch((logErr) => console.error('Failed to log error:', logErr));
        });

        // Log successful registration
        this.systemLogService
          .createLog(
            'QUICK_REGISTRATION_SUCCESS',
            `Quick registration successful for user: ${savedUser.firstName} ${savedUser.lastName} (${savedUser.email})`,
            LogSeverity.INFO,
            savedUser._id?.toString(),
          )
          .catch((err) => console.error('Failed to log registration:', err));

        return savedUser;
      } catch (error) {
        console.error('Error creating new user for quick registration:', error);

        // Log the error
        this.systemLogService
          .createLog(
            'QUICK_REGISTRATION_FAILED',
            `Quick registration failed for ${email}: ${error.message}`,
            LogSeverity.ERROR,
          )
          .catch((logErr) => console.error('Failed to log error:', logErr));

        if (error.code === 11000) {
          // MongoDB duplicate key error
          const duplicateField =
            Object.keys(error.keyPattern || {})[0] || 'field';
          throw new ConflictException(
            `A user with this ${duplicateField} already exists`,
          );
        }

        throw new InternalServerErrorException('Failed to create user account');
      }
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Handle unexpected errors
      console.error('Unexpected error in quickRegister:', error);
      throw new InternalServerErrorException(
        'An unexpected error occurred during registration',
      );
    }
  }

  private async sendVerificationPins(
    user: UserDocument,
    type: 'new' | 'resend',
  ): Promise<void> {
    const phoneMsg =
      type === 'new'
        ? `Your SRCC verification PIN is: ${user.phoneVerificationPin}.`
        : `Your new SRCC verification PIN is: ${user.phoneVerificationPin}.`;

    const emailMsg =
      type === 'new'
        ? `Your SRCC verification PIN is: ${user.emailVerificationPin}.`
        : `Your new SRCC verification PIN is: ${user.emailVerificationPin}.`;

    const promises = [
      this.notificationService.sendSMS(user.phoneNumber, phoneMsg),
      this.notificationService.sendEmail(
        user.email,
        'SRCC Account Verification',
        emailMsg,
      ),
    ];

    await Promise.all(promises);
  }

  async resendVerificationPins(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const pinExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (!user.isEmailVerified) {
      user.emailVerificationPin = this.generatePin();
      user.emailVerificationPinExpires = pinExpiry;
    }

    if (!user.isPhoneVerified) {
      user.phoneVerificationPin = this.generatePin();
      user.phoneVerificationPinExpires = pinExpiry;
    }

    await user.save();

    // Fire-and-forget notifications
    (async () => {
      try {
        if (!user.isPhoneVerified) {
          const phoneMsg = `Your new SRCC verification PIN is: ${user.phoneVerificationPin}.`;
          await this.notificationService.sendSMS(user.phoneNumber, phoneMsg);
        }
        if (!user.isEmailVerified) {
          const emailMsg = `Your new SRCC verification PIN is: ${user.emailVerificationPin}.`;
          await this.notificationService.sendEmail(
            user.email,
            'SRCC Account Verification',
            emailMsg,
          );
        }
      } catch (err) {
        console.error('Failed to resend verification PINs:', err);
      }
    })();

    return user;
  }

  async quickCompanyRegister(
    companyData: QuickRegisterOrganizationDto,
  ): Promise<OrganizationDocument> {
    const {
      businessEmail,
      businessPhone,
      registrationNumber,
      kraPin,
      password,
    } = companyData;

    const existingOrg = await this.organizationModel.findOne({
      $or: [{ businessEmail }, { registrationNumber }, { kraPin }],
    });

    if (existingOrg) {
      if (existingOrg.registrationStatus === 'complete') {
        throw new ConflictException(
          'An organization with these details already exists.',
        );
      }

      if (
        existingOrg.registrationStatus === 'quick' &&
        (!existingOrg.isEmailVerified || !existingOrg.isPhoneVerified)
      ) {
        const salt = await bcrypt.genSalt();
        existingOrg.password = await bcrypt.hash(password, salt);
        existingOrg.phoneVerificationPin = this.generatePin();
        existingOrg.emailVerificationPin = this.generatePin();
        const pinExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        existingOrg.phoneVerificationPinExpires = pinExpiry;
        existingOrg.emailVerificationPinExpires = pinExpiry;

        await existingOrg.save();

        // Resend notifications
        (async () => {
          try {
            const phoneMsg = `Your new SRCC verification PIN is: ${existingOrg.phoneVerificationPin}.`;
            await this.notificationService.sendSMS(
              existingOrg.businessPhone,
              phoneMsg,
            );
            const emailMsg = `Your new SRCC verification PIN is: ${existingOrg.emailVerificationPin}.`;
            await this.notificationService.sendEmail(
              existingOrg.businessEmail,
              'SRCC Account Verification',
              emailMsg,
            );
          } catch (err) {
            console.error(
              'Failed to resend verification PINs for company:',
              err,
            );
          }
        })();

        return existingOrg;
      }
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const phoneVerificationPin = this.generatePin();
    const emailVerificationPin = this.generatePin();
    const pinExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const newOrg = new this.organizationModel({
      businessEmail,
      businessPhone,
      registrationNumber,
      kraPin,
      password: hashedPassword,
      status: 'pending_verification',
      registrationStatus: 'quick',
      isPhoneVerified: false,
      isEmailVerified: false,
      phoneVerificationPin,
      emailVerificationPin,
      phoneVerificationPinExpires: pinExpiry,
      emailVerificationPinExpires: pinExpiry,
    });

    const savedOrg = await newOrg.save();

    // Fire-and-forget notifications
    (async () => {
      try {
        const phoneMsg = `Your SRCC verification PIN is: ${phoneVerificationPin}.`;
        await this.notificationService.sendSMS(
          savedOrg.businessPhone,
          phoneMsg,
        );

        const emailMsg = `Your SRCC verification PIN is: ${emailVerificationPin}.`;
        await this.notificationService.sendEmail(
          savedOrg.businessEmail,
          'SRCC Account Verification',
          emailMsg,
        );
      } catch (err) {
        console.error('Failed to send verification PINs for company:', err);
      }
    })();

    return savedOrg;
  }

  async resendCompanyVerificationPins(
    businessEmail: string,
  ): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findOne({
      businessEmail,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    const pinExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (!organization.isEmailVerified) {
      organization.emailVerificationPin = this.generatePin();
      organization.emailVerificationPinExpires = pinExpiry;
    }

    if (!organization.isPhoneVerified) {
      organization.phoneVerificationPin = this.generatePin();
      organization.phoneVerificationPinExpires = pinExpiry;
    }

    await organization.save();

    // Fire-and-forget notifications
    (async () => {
      try {
        if (!organization.isPhoneVerified) {
          const phoneMsg = `Your new SRCC verification PIN is: ${organization.phoneVerificationPin}.`;
          await this.notificationService.sendSMS(
            organization.businessPhone,
            phoneMsg,
          );
        }
        if (!organization.isEmailVerified) {
          const emailMsg = `Your new SRCC verification PIN is: ${organization.emailVerificationPin}.`;
          await this.notificationService.sendEmail(
            organization.businessEmail,
            'SRCC Account Verification',
            emailMsg,
          );
        }
      } catch (err) {
        console.error('Failed to resend company verification PINs:', err);
      }
    })();

    return organization;
  }

  async resendOtp(email: string, type: 'user' | 'organization'): Promise<void> {
    if (type === 'user') {
      await this.resendVerificationPins(email);
    } else if (type === 'organization') {
      await this.resendCompanyVerificationPins(email);
    } else {
      throw new BadRequestException('Invalid user type for OTP resend.');
    }
  }

  async getVerificationStatus(
    email: string,
  ): Promise<{ isPhoneVerified: boolean; isEmailVerified: boolean }> {
    const user = await this.userModel
      .findOne({ email })
      .select('isPhoneVerified isEmailVerified')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      isPhoneVerified: user.isPhoneVerified,
      isEmailVerified: user.isEmailVerified,
    };
  }

  async getCompanyVerificationStatus(
    businessEmail: string,
  ): Promise<{ isPhoneVerified: boolean; isEmailVerified: boolean }> {
    const org = await this.organizationModel
      .findOne({ businessEmail })
      .select('isPhoneVerified isEmailVerified')
      .lean();

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      isPhoneVerified: org.isPhoneVerified,
      isEmailVerified: org.isEmailVerified,
    };
  }

  async register(consultantData: any, req?: Request): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      $or: [
        { email: consultantData.email },
        { phoneNumber: consultantData.phoneNumber },
      ],
    });

    if (existingUser && existingUser.registrationStatus === 'quick') {
      // This is a profile completion
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...updateData } = consultantData;
      Object.assign(existingUser, updateData);
      existingUser.registrationStatus = 'complete';
      existingUser.status = 'pending'; // Reset status to pending for admin approval

      const savedConsultant = await existingUser.save();

      // Fire-and-forget notifications and logging
      (async () => {
        try {
          await this.sendRegistrationNotifications(savedConsultant);
        } catch (err) {
          console.error('Failed to send registration notifications:', err);
        }
        try {
          await this.systemLogService.createLog(
            'User Registration Completion',
            `User completed registration: ${savedConsultant.firstName} ${savedConsultant.lastName} (${savedConsultant.email})`,
            LogSeverity.INFO,
            savedConsultant.employeeId?.toString(),
            req,
          );
        } catch (err) {
          console.error('Failed to create system log:', err);
        }
      })();

      return savedConsultant;
    }

    // This is a new full registration, validate all unique fields
    await this.validateUniqueFields(consultantData);

    const registrationPin = this.generatePin();
    consultantData.resetPin = registrationPin;

    const newConsultant = new this.userModel({
      ...consultantData,
      status: 'pending',
      roles: ['consultant'],
      registrationStatus: 'complete', // Full registration
    });

    const savedConsultant = await newConsultant.save();

    // Fire-and-forget notifications and logging
    (async () => {
      try {
        const pinMsg = `Your SRCC registration PIN is: ${registrationPin}. This PIN will be required to activate your account when approved.`;
        await this.notificationService.sendRegistrationPin(
          savedConsultant.phoneNumber,
          savedConsultant.email,
          pinMsg,
        );
        await this.sendRegistrationNotifications(savedConsultant);
      } catch (err) {
        console.error('Failed to send registration notifications:', err);
      }
      try {
        await this.systemLogService.createLog(
          'User Registration',
          `New user registered: ${savedConsultant.firstName} ${savedConsultant.lastName} (${savedConsultant.email})`,
          LogSeverity.INFO,
          savedConsultant.employeeId?.toString(),
          req,
        );
      } catch (err) {
        console.error('Failed to create system log:', err);
      }
    })();

    return savedConsultant;
  }

  async getPendingConsultants(): Promise<UserDocument[]> {
    return this.userModel
      .find({
        roles: 'consultant',
        status: 'pending',
      })
      .exec();
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
    await this.systemLogService.createLog(
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
  async registerOrganization(
    registerOrgDto: any,
    req?: Request,
  ): Promise<Organization> {
    try {
      // Validate organization data
      await this.validateOrganizationData(registerOrgDto);

      // Create new organization
      const organization = new this.organizationModel(registerOrgDto);

      // Log registration attempt
      await this.systemLogService.createLog(
        'ORGANIZATION_REGISTRATION_ATTEMPT',
        `Organization registration attempt: ${registerOrgDto.companyName} (Reg: ${registerOrgDto.registrationNumber}, KRA: ${registerOrgDto.kraPin})`,
        LogSeverity.INFO,
      );

      const savedOrg = await organization.save();

      // Log successful registration
      await this.systemLogService.createLog(
        'ORGANIZATION_REGISTRATION_SUCCESS',
        `New organization registered: ${savedOrg.companyName} (ID: ${savedOrg._id}, Reg: ${savedOrg.registrationNumber})`,
        LogSeverity.INFO,
      );

      // Send notifications
      await this.sendOrganizationRegistrationNotifications(savedOrg);

      return savedOrg;
    } catch (error) {
      // Log registration failure
      await this.systemLogService.createLog(
        'ORGANIZATION_REGISTRATION_FAILED',
        `Organization registration failed for ${registerOrgDto.companyName}: ${error.message}`,
        LogSeverity.ERROR,
      );

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to register organization: ' + error.message,
      );
    }
  }

  private async validateOrganizationData(orgData: any) {
    // Check for required fields
    const requiredFields = [
      'companyName',
      'registrationNumber',
      'kraPin',
      'businessEmail',
      'businessPhone',
    ];
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
        { businessEmail: orgData.businessEmail },
      ],
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
      throw new BadRequestException(
        'Invalid phone number format. Must be in format: 254XXXXXXXXX',
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orgData.businessEmail)) {
      throw new BadRequestException('Invalid email format');
    }
  }

  async getOrganizations(): Promise<Organization[]> {
    try {
      return await this.organizationModel
        .find()
        .select('-__v')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch organizations: ' + error.message,
      );
    }
  }

  async getOrganization(id: string): Promise<Organization> {
    try {
      const organization = await this.organizationModel
        .findById(id)
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
      throw new InternalServerErrorException(
        'Failed to fetch organization: ' + error.message,
      );
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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to approve organization: ' + error.message,
      );
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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to reject organization: ' + error.message,
      );
    }
  }

  async getPendingOrganizations(): Promise<Organization[]> {
    try {
      return await this.organizationModel
        .find({ status: 'pending' })
        .select('-__v')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch pending organizations: ' + error.message,
      );
    }
  }

  private async validateUniqueFields(consultantData: any) {
    try {
      const checks = [
        {
          field: 'email',
          value: consultantData.email,
          message: 'Email already registered',
        },
        {
          field: 'phoneNumber',
          value: consultantData.phoneNumber,
          message: 'Phone number already registered',
        },
        {
          field: 'nationalId',
          value: consultantData.nationalId,
          message: 'National ID already registered',
        },
        {
          field: 'kraPinNumber',
          value: consultantData.kraPinNumber,
          message: 'KRA PIN already registered',
        },
      ];

      await Promise.all(
        checks.map(async (check) => {
          const existing = await this.userModel.findOne({
            [check.field]: check.value,
          });
          if (existing) {
            // Log validation failure
            await this.systemLogService.createLog(
              'CONSULTANT_VALIDATION_FAILED',
              `Registration validation failed: ${check.message} (Field: ${check.field}, Value: ${check.value})`,
              LogSeverity.ERROR,
            );
            throw new BadRequestException(check.message);
          }
        }),
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to validate consultant data: ' + error.message,
      );
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
SRCC Team`,
    );

    // Send SMS notification
    await this.notificationService.sendSMS(
      consultant.phoneNumber,
      `Dear ${consultant.firstName}, thank you for registering with SRCC. Your consultant application is under review. We will notify you once the review is complete.`,
    );

    // Create system log
    await this.systemLogService.createLog(
      'CONSULTANT_REGISTRATION',
      `New consultant registration: ${consultant.firstName} ${consultant.lastName} (ID: ${consultant._id}, Email: ${consultant.email})`,
      LogSeverity.INFO,
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
SRCC Team`,
    );

    // Send SMS notification
    await this.notificationService.sendSMS(
      consultant.phoneNumber,
      `Congratulations ${consultant.firstName}! Your SRCC consultant application has been approved. You can now log in to your account. Welcome to the team!`,
    );

    // Create system log
    await this.systemLogService.createLog(
      'CONSULTANT_APPROVAL',
      `Consultant ${consultant.firstName} ${consultant.lastName} has been approved (ID: ${consultant._id})`,
      LogSeverity.INFO,
    );
  }

  private async sendRejectionNotifications(
    consultant: UserDocument,
    reason?: string,
  ) {
    // Send email notification
    await this.notificationService.sendEmail(
      consultant.email,
      'SRCC Consultant Application Status',
      `Dear ${consultant.firstName},

Thank you for your interest in becoming a consultant with SRCC.

After careful review of your application, we regret to inform you that we are unable to proceed with your application at this time.

${
  reason
    ? `Reason: ${reason}

`
    : ''
}You are welcome to apply again in the future when you have gained more experience or if your circumstances change.

Best regards,
SRCC Team`,
    );

    // Send SMS notification
    await this.notificationService.sendSMS(
      consultant.phoneNumber,
      `Dear ${consultant.firstName}, we have reviewed your SRCC consultant application. Unfortunately, we are unable to proceed with your application at this time. Check your email for details.`,
    );

    // Create system log
    await this.systemLogService.createLog(
      'CONSULTANT_REJECTION',
      `Consultant ${consultant.firstName} ${consultant.lastName} has been rejected (ID: ${consultant._id})${reason ? `, Reason: ${reason}` : ''}`,
      LogSeverity.INFO,
    );
  }

  private async sendOrganizationRegistrationNotifications(
    organization: OrganizationDocument,
  ) {
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
      emailBody,
    );

    // Send SMS notification
    const smsBody = `Dear ${organization.companyName}, your SRCC organization registration (Ref: ${organization.registrationNumber}) is under review. We will notify you once the review is complete.`;

    await this.notificationService.sendSMS(organization.businessPhone, smsBody);
  }

  private async sendOrganizationApprovalNotifications(
    organization: OrganizationDocument,
  ) {
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
      emailBody,
    );

    // Send SMS notification
    const smsBody = `Congratulations! ${organization.companyName}'s SRCC registration has been approved. You can now log in to your account and access all SRCC services.`;

    await this.notificationService.sendSMS(organization.businessPhone, smsBody);
  }

  private async sendOrganizationRejectionNotifications(
    organization: OrganizationDocument,
    reason?: string,
  ) {
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
      emailBody,
    );

    // Send SMS notification
    const smsBody = `Dear ${organization.companyName}, your SRCC registration has been rejected. Please check your email for details or contact our support team for assistance.`;

    await this.notificationService.sendSMS(organization.businessPhone, smsBody);
  }

  async verifyCompanyOtp(verifyOtpDto: {
    businessEmail: string;
    pin: string;
    verificationType: 'phone' | 'email';
  }): Promise<OrganizationDocument> {
    const { businessEmail, pin, verificationType } = verifyOtpDto;

    const org = await this.organizationModel
      .findOne({ businessEmail })
      .select(
        '+phoneVerificationPin +emailVerificationPin +phoneVerificationPinExpires +emailVerificationPinExpires',
      );

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const isPhoneVerification = verificationType === 'phone';
    const pinField = isPhoneVerification
      ? 'phoneVerificationPin'
      : 'emailVerificationPin';
    const pinExpiresField = isPhoneVerification
      ? 'phoneVerificationPinExpires'
      : 'emailVerificationPinExpires';
    const isVerifiedField = isPhoneVerification
      ? 'isPhoneVerified'
      : 'isEmailVerified';

    if (org[isVerifiedField]) {
      throw new BadRequestException(
        `This ${verificationType} is already verified.`,
      );
    }

    if (org[pinField] !== pin) {
      throw new BadRequestException('Invalid verification PIN');
    }

    if (org[pinExpiresField] < new Date()) {
      throw new BadRequestException('Verification PIN has expired');
    }

    org[isVerifiedField] = true;

    // Check if both are verified, then update status
    if (org.isEmailVerified && org.isPhoneVerified) {
      org.status = 'pending';
    }

    return org.save();
  }

  async verifyOtp(verifyOtpDto: {
    email: string;
    pin: string;
    verificationType: 'phone' | 'email';
  }): Promise<UserDocument> {
    const { email, pin, verificationType } = verifyOtpDto;

    const user = await this.userModel
      .findOne({ email })
      .select(
        '+phoneVerificationPin +emailVerificationPin +phoneVerificationPinExpires +emailVerificationPinExpires',
      );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPhoneVerification = verificationType === 'phone';
    const pinField = isPhoneVerification
      ? 'phoneVerificationPin'
      : 'emailVerificationPin';
    const pinExpiresField = isPhoneVerification
      ? 'phoneVerificationPinExpires'
      : 'emailVerificationPinExpires';
    const isVerifiedField = isPhoneVerification
      ? 'isPhoneVerified'
      : 'isEmailVerified';

    if (user[isVerifiedField]) {
      throw new BadRequestException(
        `This ${verificationType} is already verified.`,
      );
    }

    if (user[pinField] !== pin) {
      throw new BadRequestException('Invalid verification PIN');
    }

    if (user[pinExpiresField] < new Date()) {
      throw new BadRequestException('Verification PIN has expired');
    }

    user[isVerifiedField] = true;

    // Check if both are verified, then update status
    if (user.isEmailVerified && user.isPhoneVerified) {
      user.status = 'pending'; // Ready for admin approval
    }

    return user.save();
  }

  private generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
