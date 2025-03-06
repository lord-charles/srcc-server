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
import { ContractApprovalDto, ContractRejectionDto } from '../dto/contract-approval.dto';

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

  private readonly roleMap = {
    finance: 'finance_approver',
    md: 'managing_director',
  } as const;

  private readonly approvalDeadlines = {
    finance: 48, 
    md: 72, 
  } as const;

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
        status: 'pending_finance_approval',
      });

      const savedContract = await newContract.save();
      await this.projectModel.findByIdAndUpdate(createContractDto.projectId, {
        $push: { teamMemberContracts: savedContract._id },
      });

      // Send notification if user has contact details
      // if (user.email && user.phoneNumber) {
      //   await this.sendContractNotification(savedContract, user).catch(
      //     (error) => {
      //       this.logger.error(
      //         `Failed to send contract notification: ${error.message}`,
      //         error.stack,
      //       );
      //     },
      //   );
      // } else {
      //   this.logger.warn(
      //     `Could not send notification to user ${user._id}: Missing email or phone number`,
      //   );
      // }

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

  //  * Find my contracts
  async findMyContracts(userId: string): Promise<Contract[]> {
    try {
      console.log('userId', userId);
      return await this.contractModel
        .find({ contractedUserId: new Types.ObjectId(userId) })
        .populate('projectId', 'name')
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

  async submitForApproval(
    id: string,
    userId: Types.ObjectId,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    if (contract.status !== 'draft') {
      throw new BadRequestException(
        'Contract must be in draft status to initiate approval workflow',
      );
    }

    const nextStatus = 'pending_finance_approval';
    const nextLevel = 'finance';
    const approvers = await this.getApprovers(nextLevel);

    const updatedContract = await this.contractModel.findByIdAndUpdate(
      id,
      {
        status: nextStatus,
        updatedBy: userId,
        currentLevelDeadline: this.calculateDeadline(this.approvalDeadlines.finance),
        $push: {
          amendments: {
            date: new Date(),
            description: 'Contract submitted for financial review and approval',
            changedFields: ['status'],
            approvedBy: userId,
          },
        },
      },
      { new: true },
    ).populate('projectId contractedUserId');

    await this.notifyApprovers(updatedContract, approvers, nextLevel);

    return updatedContract;
  }

  private calculateDeadline(hours: number): Date {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  }

  async approve(
    id:   string,
    userId: string,
    dto: ContractApprovalDto,
  ): Promise<Contract> {
    const contract = await this.findOne(id);
    let nextStatus: string;
    let nextLevel: string;
    let nextDeadline: Date | null;

    switch (contract.status) {
      case 'pending_finance_approval':
        nextStatus = 'pending_md_approval';
        nextLevel = 'md';
        nextDeadline = this.calculateDeadline(this.approvalDeadlines.md);
        break;
      case 'pending_md_approval':
        nextStatus = 'pending_acceptance';
        nextLevel = null;
        nextDeadline = null;
        break;
      default:
        throw new BadRequestException(
          'Contract is not in an appropriate status for approval',
        );
    }

    const currentLevel = contract.status.split('_')[1];
    const approvalField = `${currentLevel}Approvals`;

    const update: any = {
      status: nextStatus,
      updatedBy: userId,
      currentLevelDeadline: nextDeadline,
      $push: {
        [`approvalFlow.${approvalField}`]: {
          approverId: userId,
          approvedAt: new Date(),
          comments: dto.comments,
        },
        amendments: {
          date: new Date(),
          description: `Contract approved by ${this.formatRole(currentLevel)}`,
          changedFields: ['status'],
          approvedBy: userId,
        },
      },
    };

    if (nextStatus === 'pending_acceptance') {
      update.finalApproval = {
        approvedBy: userId,
        approvedAt: new Date(),
      };
    }

    const updatedContract = await this.contractModel.findByIdAndUpdate(
      id,
      update,
      { new: true },
    ).populate('projectId contractedUserId');

    // Notify relevant parties based on approval stage
    if (nextLevel) {
      const nextApprovers = await this.getApprovers(nextLevel);
      await this.notifyApprovers(updatedContract, nextApprovers, nextLevel);
    } else {
      await this.notifyContractActivation(updatedContract);
    }

    return updatedContract;
  }

  private async notifyApprovers(
    contract: Contract,
    approvers: User[],
    level: string,
  ): Promise<void> {
    const project = await this.projectModel.findById(contract.projectId);
    const contractedUser = await this.userModel.findById(contract.contractedUserId);

    const emailTemplate = this.generateApprovalEmailTemplate(
      contract,
      project,
      contractedUser,
      level,
    );

    const approverPromises = approvers.map(async (approver) => {
      await this.notificationService.sendEmail(
        approver.email,
        `Action Required: Contract Review - ${contract.contractNumber}`,
        emailTemplate(approver),
      );
    });

    await Promise.all(approverPromises);
  }

  private generateApprovalEmailTemplate(
    contract: Contract,
    project: Project,
    contractedUser: User,
    level: string,
  ): (approver: User) => string {
    return (approver: User) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Contract Review Required</h2>
          
          <div style="background-color: #e74c3c; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 0;"><strong>⚠️ Your approval is required as ${this.formatRole(level)}</strong></p>
          </div>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Contract Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Contract Number:</strong></td>
                <td style="padding: 8px 0;">${contract.contractNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Project:</strong></td>
                <td style="padding: 8px 0;">${project.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Contractor:</strong></td>
                <td style="padding: 8px 0;">${contractedUser.firstName} ${contractedUser.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Value:</strong></td>
                <td style="padding: 8px 0;">${contract.currency} ${contract.contractValue.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Duration:</strong></td>
                <td style="padding: 8px 0;">${new Date(contract.startDate).toLocaleDateString()} to ${new Date(contract.endDate).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Required Actions</h3>
            <p>Please review the contract details and take appropriate action based on:</p>
            <ul style="color: #34495e;">
              <li>Compliance with organizational policies</li>
              <li>Budget allocation and financial viability</li>
              <li>Contract terms and conditions</li>
              <li>Project alignment and resource requirements</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://srcc.strathmore.edu/contracts/${contract._id}/review" 
               style="display: inline-block; background-color: #2ecc71; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Review Contract
            </a>
          </div>

          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666;">
            <p style="margin: 0;">This notification was sent to you because you are designated as a ${this.formatRole(level)} in the SRCC system.</p>
          </div>
        </div>
      </div>
    `;
  }

  private formatRole(role: string): string {
    return role === 'md' 
      ? 'Managing Director'
      : role.split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
  }

  private async getApprovers(level: string): Promise<User[]> {
    const requiredRole = this.roleMap[level];

    if (!requiredRole) {
      throw new BadRequestException(`Invalid approval level: ${level}`);
    }

    const approvers = await this.userModel
      .find({
        roles: { $in: [requiredRole] },
        status: 'active',
      })
      .lean();

    if (!approvers.length) {
      throw new Error(
        `No active approvers found for level: ${level}. Please contact system administrator.`,
      );
    }

    return approvers;
  }


  private async notifyContractActivation(contract: Contract): Promise<void> {
    const user = await this.userModel.findById(contract.contractedUserId);
    const project = await this.projectModel.findById(contract.projectId);

    if (!user || !project) {
      throw new NotFoundException('User or Project not found');
    }

    const subject = `Action Required: Contract Acceptance - ${contract.contractNumber}`;
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50;">Contract Ready for Acceptance</h2>
          
          <div style="background-color: #e74c3c; color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Action Required: Please review and accept your contract</strong></p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p>Dear ${user.firstName} ${user.lastName},</p>
            <p>Your contract for project "${project.name}" has been approved and is ready for your acceptance.</p>
            
            <div style="margin: 20px 0;">
              <strong>Contract Details:</strong>
              <ul>
                <li>Contract Number: ${contract.contractNumber}</li>
                <li>Project: ${project.name}</li>
                <li>Value: ${contract.currency} ${contract.contractValue.toLocaleString()}</li>
                <li>Duration: ${new Date(contract.startDate).toLocaleDateString()} to ${new Date(contract.endDate).toLocaleDateString()}</li>
              </ul>
            </div>

            <div style="margin: 20px 0;">
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Review the contract details carefully</li>
                <li>Generate an OTP for contract acceptance</li>
                <li>Enter the OTP to formally accept the contract</li>
              </ol>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="https://srcc.strathmore.edu/contracts/${contract._id}/accept" 
                 style="display: inline-block; background-color: #2ecc71; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Review and Accept Contract
              </a>
            </div>
          </div>
          
          <div style="font-size: 12px; color: #666; margin-top: 20px;">
            <p>If you have any questions, please contact the SRCC support team.</p>
          </div>
        </div>
      </div>
    `;

    if (user.email) {
      await this.notificationService.sendEmail(user.email, subject, message);
    }

    if (user.phoneNumber) {
      const smsMessage = `SRCC: Your contract (${contract.contractNumber}) has been approved and requires your acceptance. Please check your email for instructions.`;
      await this.notificationService.sendSMS(user.phoneNumber, smsMessage);
    }
  }

  private async sendContractNotification(
    contract: Contract,
    user: User,
  ): Promise<void> {
    const project = await this.projectModel.findById(contract.projectId);
    
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const subject = `New Contract Assignment - ${contract.contractNumber}`;
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50;">New Contract Assignment</h2>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p>Dear ${user.firstName} ${user.lastName},</p>
            <p>A new contract has been created for you in the project "${project.name}".</p>
            
            <div style="margin: 20px 0;">
              <strong>Contract Details:</strong>
              <ul>
                <li>Contract Number: ${contract.contractNumber}</li>
                <li>Description: ${contract.description}</li>
                <li>Value: ${contract.currency} ${contract.contractValue.toLocaleString()}</li>
                <li>Duration: ${new Date(contract.startDate).toLocaleDateString()} to ${new Date(contract.endDate).toLocaleDateString()}</li>
              </ul>
            </div>

            <p>The contract is currently under review. You will be notified once it is ready for your acceptance.</p>
          </div>
          
          <div style="font-size: 12px; color: #666; margin-top: 20px;">
            <p>This is an automated message from the SRCC Contract Management System.</p>
          </div>
        </div>
      </div>
    `;

    if (user.email) {
      await this.notificationService.sendEmail(user.email, subject, message);
    }

    if (user.phoneNumber) {
      const smsMessage = `SRCC: A new contract (${contract.contractNumber}) has been created for you. Please check your email for details.`;
      await this.notificationService.sendSMS(user.phoneNumber, smsMessage);
    }
  }

  async reject(
    id: string,
    userId: string,
    dto: ContractRejectionDto,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    if (!contract.status.startsWith('pending_')) {
      throw new BadRequestException('Contract is not in an approvable status');
    }

    const updatedContract = await this.contractModel.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        updatedBy: userId,
        currentLevelDeadline: null,
        rejectionDetails: {
          rejectedBy: userId,
          rejectedAt: new Date(),
          reason: dto.reason,
          level: dto.level,
        },
        $push: {
          amendments: {
            date: new Date(),
            description: `Contract rejected by ${this.formatRole(dto.level)}`,
            changedFields: ['status'],
            approvedBy: userId,
          },
        },
      },
      { new: true },
    ).populate('projectId contractedUserId');

    // Notify stakeholders of rejection
    // const user = await this.userModel.findById(contract.contractedUserId);


    return updatedContract;
  }
}


