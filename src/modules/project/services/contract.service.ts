import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument } from '../schemas/contract.schema';
import { NotificationService } from '../../notifications/services/notification.service';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';
import * as crypto from 'crypto';
import { User } from 'src/modules/auth/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { Project } from 'project';

interface OtpData {
  otp: string;
  expires: Date;
  attempts: number;
  lastAttempt?: Date;
}

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private otpStore: Map<string, OtpData> = new Map();
  private readonly MAX_OTP_ATTEMPTS = 5;
  private readonly OTP_COOLDOWN_MINUTES = 2;
  private readonly OTP_EXPIRY_MINUTES: number;

  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {
    this.OTP_EXPIRY_MINUTES =
      this.configService.get<number>('OTP_EXPIRY_MINUTES') || 30;

    // Set up periodic cleanup of expired OTPs
    this.setupOtpCleanup();
  }

  private setupOtpCleanup(): void {
    setInterval(
      () => {
        this.logger.log('Running scheduled OTP cleanup');
        this.cleanupExpiredOtps();
      },
      60 * 60 * 1000,
    );
  }

  //  * Clean up expired OTPs from memory
  private cleanupExpiredOtps(): void {
    const now = new Date();
    let expiredCount = 0;

    this.otpStore.forEach((data, key) => {
      if (data.expires < now) {
        this.otpStore.delete(key);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      this.logger.log(`Cleaned up ${expiredCount} expired OTPs`);
    }
  }

  //  Generate a unique contract number with format SRCC-YYYY-XXXXX
  async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const latestContract = await this.contractModel
      .findOne({}, { contractNumber: 1 })
      .sort({ createdAt: -1 })
      .exec();

    let sequenceNumber = 1;

    if (latestContract) {
      const parts = latestContract.contractNumber.split('-');
      if (parts.length === 3 && parts[1] === year.toString()) {
        sequenceNumber = parseInt(parts[2], 10) + 1;
      }
    }

    return `SRCC-${year}-${sequenceNumber.toString().padStart(5, '0')}`;
  }

  // Create a new contract
  async create(
    createContractDto: CreateContractDto,
    currentUserId: string,
  ): Promise<Contract> {
    try {
      // Check if user exists
      const user = await this.userModel.findById(
        createContractDto.contractedUserId,
      );
      if (!user) {
        throw new NotFoundException(
          `User with ID ${createContractDto.contractedUserId} not found`,
        );
      }

      const contractNumber = await this.generateContractNumber();

      const newContract = new this.contractModel({
        ...createContractDto,
        contractNumber,
        createdBy: new Types.ObjectId(currentUserId),
        updatedBy: new Types.ObjectId(currentUserId),
        status: createContractDto.status || 'draft',
      });

      const savedContract = await newContract.save();
      await this.projectModel.findByIdAndUpdate(createContractDto.projectId, {
        $push: { teamMemberContracts: savedContract._id },
      });

      // Send notification if user has contact details
      if (user.email && user.phoneNumber) {
        await this.sendContractNotification(savedContract, user).catch(
          (error) => {
            this.logger.error(
              `Failed to send contract notification: ${error.message}`,
              error.stack,
            );
          },
        );
      } else {
        this.logger.warn(
          `Could not send notification to user ${user._id}: Missing email or phone number`,
        );
      }

      return savedContract;
    } catch (error) {
      this.logger.error(
        `Error creating contract: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  //  * Find all contracts
  async findAll(filters?: any): Promise<Contract[]> {
    try {
      let query = {};

      if (filters) {
        if (filters.status) {
          query['status'] = filters.status;
        }

        if (filters.startDate) {
          query['startDate'] = { $gte: new Date(filters.startDate) };
        }

        if (filters.endDate) {
          query['endDate'] = { $lte: new Date(filters.endDate) };
        }
      }

      return await this.contractModel
        .find(query)
        .populate('contractedUserId', 'firstName lastName email phoneNumber')
        .populate('projectId', 'name')
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding contracts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  //  * Find contracts by project ID
  async findByProject(projectId: string): Promise<Contract[]> {
    try {
      return await this.contractModel
        .find({ projectId: new Types.ObjectId(projectId) })
        .populate('contractedUserId', 'firstName lastName email phoneNumber')
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding contracts by project ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  //  * Find a contract by ID
  async findOne(id: string): Promise<Contract> {
    try {
      const contract = await this.contractModel
        .findById(id)
        .populate('contractedUserId', 'firstName lastName email phoneNumber')
        .populate('projectId', 'name')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .exec();

      if (!contract) {
        throw new NotFoundException(`Contract with ID ${id} not found`);
      }

      return contract;
    } catch (error) {
      this.logger.error(
        `Error finding contract by ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  //  * Update a contract
  async update(
    id: string,
    updateContractDto: UpdateContractDto,
    currentUserId: string,
  ): Promise<Contract> {
    try {
      // Validate dates if both are provided
      if (updateContractDto.startDate && updateContractDto.endDate) {
        if (
          new Date(updateContractDto.startDate) >
          new Date(updateContractDto.endDate)
        ) {
          throw new BadRequestException('Start date cannot be after end date');
        }
      }

      // Get current contract to track changes
      const currentContract = await this.findOne(id);

      // Prepare amendment record if needed
      const changedFields = [];
      for (const [key, value] of Object.entries(updateContractDto)) {
        if (currentContract[key] !== value) {
          changedFields.push(key);
        }
      }

      // Update contract with amendment record if there are changes
      const updateData: any = {
        ...updateContractDto,
        updatedBy: new Types.ObjectId(currentUserId),
      };

      if (changedFields.length > 0) {
        updateData.$push = {
          amendments: {
            date: new Date(),
            description: `Contract updated by user`,
            changedFields,
            approvedBy: new Types.ObjectId(currentUserId),
          },
        };
      }

      const contract = await this.contractModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .populate('contractedUserId', 'firstName lastName email phoneNumber')
        .populate('projectId', 'name')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .exec();

      if (!contract) {
        throw new NotFoundException(`Contract with ID ${id} not found`);
      }

      this.logger.log(
        `Updated contract with ID: ${id}, changed fields: ${changedFields.join(', ')}`,
      );

      // Notify user if status changed to active
      if (
        updateContractDto.status === 'active' &&
        currentContract.status !== 'active'
      ) {
        const user = await this.userModel.findById(contract.contractedUserId);
        if (user && user.email && user.phoneNumber) {
          await this.sendContractAcceptanceConfirmation(contract, user).catch(
            (error) => {
              this.logger.error(
                `Failed to send contract acceptance notification: ${error.message}`,
                error.stack,
              );
            },
          );
        }
      }

      return contract;
    } catch (error) {
      this.logger.error(
        `Error updating contract: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  //  * Remove a contract
  async remove(id: string): Promise<void> {
    try {
      const result = await this.contractModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException(`Contract with ID ${id} not found`);
      }
      this.logger.log(`Deleted contract with ID: ${id}`);
    } catch (error) {
      this.logger.error(
        `Error removing contract: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate OTP for contract acceptance
   * Implements rate limiting, expiration, and security measures
   */
  async generateOTP(contractId: string): Promise<string> {
    try {
      const contract = await this.findOne(contractId);

      // Verify contract is in a state that can be accepted
      if (
        contract.status === 'active' ||
        contract.status === 'completed' ||
        contract.status === 'terminated'
      ) {
        throw new ConflictException(
          `Contract is already in '${contract.status}' status and cannot be accepted`,
        );
      }

      const user = await this.userModel.findById(contract.contractedUserId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if there's an existing OTP that's not expired
      const existingOtpData = this.otpStore.get(contractId);
      const now = new Date();

      if (existingOtpData && existingOtpData.expires > now) {
        // If OTP was generated recently (within last 2 minutes), prevent regeneration to avoid abuse
        const cooldownPeriod = new Date(now);
        cooldownPeriod.setMinutes(
          cooldownPeriod.getMinutes() - this.OTP_COOLDOWN_MINUTES,
        );

        if (
          existingOtpData.lastAttempt &&
          existingOtpData.lastAttempt > cooldownPeriod
        ) {
          throw new ConflictException(
            `Please wait ${this.OTP_COOLDOWN_MINUTES} minutes before requesting a new OTP`,
          );
        }
      }

      // Generate a cryptographically secure 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();

      // Set expiration time
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + this.OTP_EXPIRY_MINUTES);

      // Store OTP with expiration and attempt tracking
      this.otpStore.set(contractId, {
        otp,
        expires: expiryTime,
        attempts: 0,
        lastAttempt: now,
      });

      this.logger.log(
        `Generated OTP for contract ${contractId}, expires at ${expiryTime.toISOString()}`,
      );

      // Send OTP via SMS and email
      const message = `Your OTP for contract acceptance is: ${otp}. This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.`;
      await this.notificationService.sendRegistrationPin(
        user.phoneNumber,
        user.email,
        message,
      );

      return otp;
    } catch (error) {
      this.logger.error(`Error generating OTP: ${error.message}`, error.stack);
      throw error;
    }
  }

  //  * Verify OTP and accept contract
  async verifyOTPAndAcceptContract(
    contractId: string,
    otp: string,
    currentUserId: string,
  ): Promise<Contract> {
    try {
      const storedOtpData = this.otpStore.get(contractId);
      const now = new Date();

      // Check if OTP exists
      if (!storedOtpData) {
        throw new NotFoundException(
          'OTP not found or expired. Please request a new OTP.',
        );
      }

      // Check if OTP is expired
      if (storedOtpData.expires < now) {
        this.otpStore.delete(contractId);
        throw new NotFoundException(
          'OTP has expired. Please request a new OTP.',
        );
      }

      // Update attempt count and last attempt time
      storedOtpData.attempts += 1;
      storedOtpData.lastAttempt = now;
      this.otpStore.set(contractId, storedOtpData);

      // Check if max attempts exceeded
      if (storedOtpData.attempts > this.MAX_OTP_ATTEMPTS) {
        this.otpStore.delete(contractId);
        throw new BadRequestException(
          `Maximum verification attempts exceeded. Please request a new OTP.`,
        );
      }

      // Verify OTP
      if (storedOtpData.otp !== otp) {
        const remainingAttempts =
          this.MAX_OTP_ATTEMPTS - storedOtpData.attempts;
        throw new BadRequestException(
          `Invalid OTP. You have ${remainingAttempts} attempts remaining.`,
        );
      }

      // Get contract to verify it's still in a valid state
      const contract = await this.findOne(contractId);
      if (
        contract.status === 'active' ||
        contract.status === 'completed' ||
        contract.status === 'terminated'
      ) {
        this.otpStore.delete(contractId);
        throw new ConflictException(
          `Contract is already in '${contract.status}' status and cannot be accepted`,
        );
      }

      // OTP is valid, update contract status to active
      const updatedContract = await this.contractModel
        .findByIdAndUpdate(
          contractId,
          {
            status: 'active',
            updatedBy: new Types.ObjectId(currentUserId),
            $push: {
              amendments: {
                date: new Date(),
                description: 'Contract accepted by user',
                changedFields: ['status'],
                approvedBy: new Types.ObjectId(currentUserId),
              },
            },
          },
          { new: true },
        )
        .exec();

      if (!updatedContract) {
        throw new NotFoundException(`Contract with ID ${contractId} not found`);
      }

      // Clean up OTP
      this.otpStore.delete(contractId);
      this.logger.log(
        `Contract ${contractId} successfully accepted with OTP verification`,
      );

      // Send confirmation notification
      const user = await this.userModel.findById(contract.contractedUserId);
      if (user) {
        await this.sendContractAcceptanceConfirmation(
          updatedContract,
          user,
        ).catch((error) => {
          this.logger.error(
            `Failed to send acceptance confirmation: ${error.message}`,
            error.stack,
          );
        });
      }

      return updatedContract;
    } catch (error) {
      this.logger.error(`Error verifying OTP: ${error.message}`, error.stack);
      throw error;
    }
  }

  //  * Send contract notification to user
  private async sendContractNotification(
    contract: Contract,
    user: any,
  ): Promise<void> {
    const subject = `New Contract Assignment - ${contract.contractNumber}`;

    await this.notificationService.sendContractNotification(
      user.email,
      user.phoneNumber,
      subject,
      {
        contractNumber: contract.contractNumber,
        description: contract.description,
        contractValue: contract.contractValue,
        currency: contract.currency,
        startDate: contract.startDate,
        endDate: contract.endDate,
        recipientName: `${user.firstName} ${user.lastName}`,
      },
    );

    this.logger.log(
      `Contract notification sent to user ${user._id} for contract ${contract.contractNumber}`,
    );
  }

  //  * Send contract acceptance confirmation
  private async sendContractAcceptanceConfirmation(
    contract: Contract,
    user: any,
  ): Promise<void> {
    const subject = `Contract Accepted - ${contract.contractNumber}`;
    const htmlMessage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract Acceptance Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #003366;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background-color: #f9f9f9;
    }
    .contract-details {
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background-color: #003366;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Contract Acceptance Confirmation</h1>
  </div>
  <div class="content">
    <p>Dear ${user.firstName} ${user.lastName},</p>
    <p>Thank you for accepting your contract with Strathmore Research and Consultancy Centre Ltd (SRCC).</p>
    <div class="contract-details">
      <h2>Contract Details:</h2>
      <ul>
        <li><strong>Contract Number:</strong> ${contract.contractNumber}</li>
        <li><strong>Description:</strong> ${contract.description}</li>
        <li><strong>Contract Value:</strong> ${contract.contractValue} ${contract.currency}</li>
        <li><strong>Start Date:</strong> ${contract.startDate.toLocaleDateString()}</li>
        <li><strong>End Date:</strong> ${contract.endDate.toLocaleDateString()}</li>
      </ul>
    </div>
    <p>Your contract is now active. Please log in to the SRCC portal for further details and to track your project progress.</p>
    <a href="https://portal.srcc.com" class="button">Log in to SRCC Portal</a>
  </div>
  <div class="footer">
    <p>Best regards,<br>SRCC Management Team</p>
  </div>
</body>
</html>
  `;

    await this.notificationService.sendEmail(user.email, subject, htmlMessage);

    const smsMessage = `SRCC: Your contract (${contract.contractNumber}) has been successfully accepted and is now active.`;
    await this.notificationService.sendSMS(user.phoneNumber, smsMessage);

    this.logger.log(
      `Contract acceptance confirmation sent to user ${user._id} for contract ${contract.contractNumber}`,
    );
  }
}
