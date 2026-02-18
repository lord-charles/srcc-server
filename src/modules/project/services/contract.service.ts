import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { Project } from '../schemas/project.schema';
import {
  ContractApprovalDto,
  ContractRejectionDto,
} from '../dto/contract-approval.dto';
import { Claim, ClaimDocument } from 'src/modules/claims/schemas/claim.schema';
import {
  ContractTemplate,
  ContractTemplateDocument,
} from '../schemas/contract-template.schema';

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
    coach_admin: 'coach_admin',
    coach_manager: 'coach_manager',
    coach_finance: 'coach_finance',
    srcc_checker: 'srcc_checker',
    srcc_finance: 'srcc_finance',
  } as const;

  private readonly approvalDeadlines = {
    finance: 48,
    md: 72,
    coach_admin: 24,
    coach_manager: 24,
    coach_finance: 48,
    srcc_checker: 48,
    srcc_finance: 72,
  } as const;

  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
    @InjectModel(ContractTemplate.name)
    private templateModel: Model<ContractTemplateDocument>,
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

      // Optionally embed template snapshot if templateId provided
      let templateSnapshot: any = undefined;
      if (createContractDto.templateId) {
        const tpl = await this.templateModel
          .findById(createContractDto.templateId)
          .lean();
        if (!tpl) {
          throw new NotFoundException(
            `Template with ID ${createContractDto.templateId} not found`,
          );
        }
        templateSnapshot = {
          name: tpl.name,
          version: tpl.version,
          contentType: tpl.contentType,
          // Use edited content if provided, otherwise use original template content
          content: createContractDto.editedTemplateContent || tpl.content,
          variables: tpl.variables || [],
        };
      }

      const initialStatus =  'pending_finance_approval';
      const initialLevel = 'finance';
      const deadlineHours = this.approvalDeadlines[initialLevel];

      const newContract = new this.contractModel({
        ...createContractDto,
        contractNumber,
        createdBy: new Types.ObjectId(currentUserId),
        updatedBy: new Types.ObjectId(currentUserId),
        status: initialStatus,
        currentLevelDeadline: this.calculateDeadline(deadlineHours),
        ...(createContractDto.templateId && {
          templateId: new Types.ObjectId(createContractDto.templateId),
        }),
        ...(templateSnapshot && { templateSnapshot }),
      });

      const savedContract = await newContract.save();
      await this.projectModel.findByIdAndUpdate(createContractDto.projectId, {
        $push: { teamMemberContracts: savedContract._id },
      });

      // Fetch approvers and notify
      // const approvers = await this.getApprovers(initialLevel, savedContract);
      // await this.notifyApprovers(savedContract, approvers, initialLevel);

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
        .populate('milestoneId', 'title description budget dueDate')
        .populate('amendments.approvedBy', 'firstName lastName email')
        .populate(
          'approvalFlow.financeApprovals.approverId',
          'firstName lastName email',
        )
        .populate(
          'approvalFlow.mdApprovals.approverId',
          'firstName lastName email',
        )
        .populate('finalApproval.approvedBy', 'firstName lastName email')
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
    console.log(userId);
    try {
      return await this.contractModel
        .find({ contractedUserId: new Types.ObjectId(userId) })
        .populate('projectId', 'name milestones')
        .populate('contractedUserId', 'firstName lastName email phoneNumber')
        .populate('milestoneId', 'title description budget dueDate')
        .populate('amendments.approvedBy', 'firstName lastName email')
        .populate(
          'approvalFlow.financeApprovals.approverId',
          'firstName lastName email',
        )
        .populate(
          'approvalFlow.mdApprovals.approverId',
          'firstName lastName email',
        )
        .populate('finalApproval.approvedBy', 'firstName lastName email')
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
        .populate('milestoneId', 'title description budget dueDate')
        .populate('amendments.approvedBy', 'firstName lastName email')
        .populate(
          'approvalFlow.financeApprovals.approverId',
          'firstName lastName email',
        )
        .populate(
          'approvalFlow.mdApprovals.approverId',
          'firstName lastName email',
        )
        .populate('finalApproval.approvedBy', 'firstName lastName email')
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
        .populate('milestoneId', 'title description budget dueDate')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .populate('amendments.approvedBy', 'firstName lastName email')
        .populate(
          'approvalFlow.financeApprovals.approverId',
          'firstName lastName email',
        )
        .populate(
          'approvalFlow.mdApprovals.approverId',
          'firstName lastName email',
        )
        .populate('finalApproval.approvedBy', 'firstName lastName email')
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
        .populate('amendments.approvedBy', 'firstName lastName email')
        .populate(
          'approvalFlow.financeApprovals.approverId',
          'firstName lastName email',
        )
        .populate(
          'approvalFlow.mdApprovals.approverId',
          'firstName lastName email',
        )
        .populate('finalApproval.approvedBy', 'firstName lastName email')
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
  async remove(id: string, userId: string): Promise<void> {
    try {
      // Check if user is admin
      const user = await this.userModel.findById(userId).select('roles').lean();
      if (!user || !user.roles?.includes('admin')) {
        throw new BadRequestException(
          'Only administrators can delete contracts',
        );
      }

      // Check if contract has any paid claims
      const paidClaims = await this.claimModel
        .findOne({
          contractId: new Types.ObjectId(id),
          status: 'paid',
        })
        .lean();

      if (paidClaims) {
        throw new BadRequestException(
          'Cannot delete contract with paid claims. Please contact system administrator.',
        );
      }

      const result = await this.contractModel.deleteOne({ _id: id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException(`Contract with ID ${id} not found`);
      }
      this.logger.log(`Deleted contract with ID: ${id} by admin ${userId}`);
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
    const message = `Dear ${user.firstName} ${user.lastName},

Your contract has been accepted successfully.

Contract Details
- Contract Number: ${contract.contractNumber}
- Description: ${contract.description}
- Contract Value: ${contract.contractValue} ${contract.currency}
- Start Date: ${contract.startDate.toLocaleDateString()}
- End Date: ${contract.endDate.toLocaleDateString()}

You can view the full contract and track progress in the SRCC Portal.`;

    await this.notificationService.sendEmail(user.email, subject, message);

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
    const deadlineHours = this.approvalDeadlines[nextLevel];

    const approvers = await this.getApprovers(nextLevel, contract);

    const updatedContract = await this.contractModel
      .findByIdAndUpdate(
        id,
        {
          status: nextStatus,
          updatedBy: userId,
          currentLevelDeadline: this.calculateDeadline(deadlineHours),
          $push: {
            amendments: {
              date: new Date(),
              description: `Contract submitted for ${this.formatRole(nextLevel)} review`,
              changedFields: ['status'],
              approvedBy: userId,
            },
          },
        },
        { new: true },
      )
      .populate('projectId contractedUserId');

    await this.notifyApprovers(updatedContract, approvers, nextLevel);

    return updatedContract;
  }

  private calculateDeadline(hours: number): Date {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  }

  async approve(
    id: string,
    userId: string,
    dto: ContractApprovalDto,
  ): Promise<Contract> {
    const contract = await this.findOne(id);
    const approver = await this.userModel.findById(userId).lean();
    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    let requiredRole: string | null = null;
    let nextStatus: string;
    let nextLevel: string | null;
    let nextDeadlineHours: number | null = null;
    let approvalField: string;

    // if (contract.type === 'coach') {
    //   switch (contract.status) {
    //     case 'pending_coach_admin_review':
    //       requiredRole = 'coach_admin';
    //       nextStatus = 'pending_coach_manager_approval';
    //       nextLevel = 'coach_manager';
    //       nextDeadlineHours = this.approvalDeadlines.coach_manager;
    //       approvalField = 'coachAdminApprovals';
    //       break;
    //     case 'pending_coach_manager_approval':
    //       requiredRole = 'coach_manager';
    //       nextStatus = 'pending_coach_finance_approval';
    //       nextLevel = 'coach_finance';
    //       nextDeadlineHours = this.approvalDeadlines.coach_finance;
    //       approvalField = 'coachManagerApprovals';
    //       break;
    //     case 'pending_coach_finance_approval':
    //       requiredRole = 'coach_finance';
    //       nextStatus = 'pending_srcc_checker_approval';
    //       nextLevel = 'srcc_checker';
    //       nextDeadlineHours = this.approvalDeadlines.srcc_checker;
    //       approvalField = 'coachFinanceApprovals';
    //       break;
    //     case 'pending_srcc_checker_approval':
    //       requiredRole = 'srcc_checker';
    //       nextStatus = 'pending_srcc_finance_approval';
    //       nextLevel = 'srcc_finance';
    //       nextDeadlineHours = this.approvalDeadlines.srcc_finance;
    //       approvalField = 'srccCheckerApprovals';
    //       break;
    //     case 'pending_srcc_finance_approval':
    //       requiredRole = 'srcc_finance';
    //       nextStatus = 'pending_acceptance';
    //       nextLevel = null;
    //       approvalField = 'srccFinanceApprovals';
    //       break;
    //     default:
    //       throw new BadRequestException(
    //         'Contract is not in an appropriate status for coach approval',
    //       );
    //   }
    // } else {
      switch (contract.status) {
        case 'pending_finance_approval':
          requiredRole = 'srcc_finance';
          nextStatus = 'pending_md_approval';
          nextLevel = 'md';
          nextDeadlineHours = this.approvalDeadlines.md;
          approvalField = 'financeApprovals';
          break;
        case 'pending_md_approval':
          requiredRole = 'md';
          nextStatus = 'pending_acceptance';
          nextLevel = null;
          approvalField = 'mdApprovals';
          break;
        default:
          throw new BadRequestException(
            'Contract is not in an appropriate status for regular approval',
          );
      // }
    }


      const requiredGlobalRole = this.roleMap[requiredRole];
      const userRoles = (approver as any).roles || [];

      if (!userRoles.includes(requiredGlobalRole)) {
        throw new ForbiddenException(
          `You are not authorized to approve at this level. Required role: ${requiredGlobalRole}`,
        );
      }
    

    const update: any = {
      status: nextStatus,
      updatedBy: userId,
      currentLevelDeadline: nextDeadlineHours
        ? this.calculateDeadline(nextDeadlineHours)
        : null,
      $push: {
        [`approvalFlow.${approvalField}`]: {
          approverId: userId,
          approvedAt: new Date(),
          comments: dto.comments,
        },
        amendments: {
          date: new Date(),
          description: `Contract approved by ${this.formatRole(requiredRole)}`,
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

    const updatedContract = await this.contractModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('projectId contractedUserId')
      .populate('amendments.approvedBy', 'firstName lastName email')
      .populate(
        'approvalFlow.financeApprovals.approverId',
        'firstName lastName email',
      )
      .populate(
        'approvalFlow.mdApprovals.approverId',
        'firstName lastName email',
      )
      .populate(
        'approvalFlow.coachAdminApprovals.approverId',
        'firstName lastName email',
      )
      .populate(
        'approvalFlow.coachManagerApprovals.approverId',
        'firstName lastName email',
      )
      .populate(
        'approvalFlow.coachFinanceApprovals.approverId',
        'firstName lastName email',
      )
      .populate(
        'approvalFlow.srccCheckerApprovals.approverId',
        'firstName lastName email',
      )
      .populate(
        'approvalFlow.srccFinanceApprovals.approverId',
        'firstName lastName email',
      )
      .populate('finalApproval.approvedBy', 'firstName lastName email');

    // Notify relevant parties based on approval stage
    if (nextLevel) {
      const nextApprovers = await this.getApprovers(nextLevel, updatedContract);
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
    const contractedUser = await this.userModel.findById(
      contract.contractedUserId,
    );

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
    return (approver: User) => `Dear ${approver.firstName} ${approver.lastName},

A contract requires your review at the ${this.formatRole(level)} level.

Details
- Contract: ${contract.contractNumber}
- Project: ${project?.name}
- Consultant: ${contractedUser?.firstName} ${contractedUser?.lastName}
- Value: ${contract.currency} ${contract.contractValue.toLocaleString()}
- Duration: ${new Date(contract.startDate).toLocaleDateString()} to ${new Date(contract.endDate).toLocaleDateString()}

Please log in to the SRCC Portal to review and take action.`;
  }

  private formatRole(role: string): string {
    return role === 'md'
      ? 'Managing Director'
      : role
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
  }

  private async getApprovers(
    level: string,
    contract?: Contract,
  ): Promise<User[]> {
    const requiredRole = this.roleMap[level];

    if (!requiredRole) {
      throw new BadRequestException(`Invalid approval level: ${level}`);
    }

    // Special cases: coach_admin and coach_manager are assigned in the project
    if (level === 'coach_admin' || level === 'coach_manager') {
      if (!contract) {
        throw new BadRequestException(
          `Contract context required for level: ${level}`,
        );
      }
      const projectId = (contract.projectId as any)._id || contract.projectId;
      const project = await this.projectModel.findById(projectId).lean();
      if (!project) throw new NotFoundException('Project not found');

      let userIds: any[] = [];
      if (level === 'coach_admin') {
        const assistants = (project.coachAssistants || []).map(
          (ca) => ca.userId,
        );
        const managers = (project.coachManagers || []).map((cm) => cm.userId);
        userIds = [...assistants, ...managers];
      } else {
        userIds = (project.coachManagers || []).map((cm) => cm.userId);
      }

      if (userIds.length === 0) {
        throw new BadRequestException(
          `No ${level === 'coach_admin' ? 'Coach Assistants or Managers' : 'Coach Managers'} assigned to this project.`,
        );
      }

      return this.userModel
        .find({ _id: { $in: userIds }, status: 'active' })
        .exec();
    }

    // Regular global roles
    const query: any = {
      roles: { $in: [requiredRole] },
      status: 'active',
    };

    // For coach_finance, we also filter by department
    if (level === 'coach_finance') {
      if (!contract)
        throw new BadRequestException(
          'Contract context required for coach_finance',
        );
      const projectId = (contract.projectId as any)._id || contract.projectId;
      const project = await this.projectModel.findById(projectId).lean();
      if (!project) throw new NotFoundException('Project not found');
      if (project.department) {
        query.department = project.department;
      }
    }

    const approvers = await this.userModel.find(query).lean();

    if (!approvers.length) {
      throw new BadRequestException(
        `No active approvers found for level: ${level}${level === 'coach_finance' ? ' in project department' : ''}. Please contact system administrator.`,
      );
    }

    return approvers as any[];
  }

  private async notifyContractActivation(contract: Contract): Promise<void> {
    const user = await this.userModel.findById(contract.contractedUserId);
    const project = await this.projectModel.findById(contract.projectId);

    if (!user || !project) {
      throw new NotFoundException('User or Project not found');
    }

    const subject = `Action Required: Contract Acceptance - ${contract.contractNumber}`;
    const message = `Dear ${user.firstName} ${user.lastName},

Your contract for project "${project.name}" has been approved and is ready for your acceptance.

Contract Details
- Contract Number: ${contract.contractNumber}
- Project: ${project.name}
- Value: ${contract.currency} ${contract.contractValue.toLocaleString()}
- Duration: ${new Date(contract.startDate).toLocaleDateString()} to ${new Date(contract.endDate).toLocaleDateString()}

Next Steps
1. Review the contract details
2. Generate an OTP for acceptance
3. Enter the OTP to accept the contract`;

    if (user.email) {
      await this.notificationService.sendEmail(user.email, subject, message);
    }

    if (user.phoneNumber) {
      const smsMessage = `SRCC: Your contract (${contract.contractNumber}) has been approved and requires your acceptance. Please check your email for instructions.`;
      await this.notificationService.sendSMS(user.phoneNumber, smsMessage);
    }
  }

  async reject(
    id: string,
    userId: string,
    dto: ContractRejectionDto,
  ): Promise<Contract> {
    const contract = await this.findOne(id);
    const approver = await this.userModel.findById(userId).lean();
    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    if (!contract.status.startsWith('pending_')) {
      throw new BadRequestException('Contract is not in an approvable status');
    }

    let requiredRole: string | null = null;

    // Determine required role from current status
    if (contract.type === 'coach') {
      switch (contract.status) {
        case 'pending_coach_admin_review':
          requiredRole = 'coach_admin';
          break;
        case 'pending_coach_manager_approval':
          requiredRole = 'coach_manager';
          break;
        case 'pending_coach_finance_approval':
          requiredRole = 'coach_finance';
          break;
        case 'pending_srcc_checker_approval':
          requiredRole = 'srcc_checker';
          break;
        case 'pending_srcc_finance_approval':
          requiredRole = 'srcc_finance';
          break;
      }
    } else {
      switch (contract.status) {
        case 'pending_finance_approval':
          requiredRole = 'finance';
          break;
        case 'pending_md_approval':
          requiredRole = 'md';
          break;
      }
    }

    if (!requiredRole) {
      throw new BadRequestException('Invalid contract status for rejection');
    }

    // Role-based guard (similar to approve)
    if (requiredRole === 'coach_admin' || requiredRole === 'coach_manager') {
      const projectId = (contract.projectId as any)._id || contract.projectId;
      const project = await this.projectModel.findById(projectId).lean();
      if (!project) throw new NotFoundException('Project not found');

      let allowedUserIds: string[] = [];
      if (requiredRole === 'coach_admin') {
        // Hierarchical rejection: Allow both assistants AND managers to reject admin review
        const assistants = (project.coachAssistants || []).map((ca) =>
          ca.userId.toString(),
        );
        const managers = (project.coachManagers || []).map((cm) =>
          cm.userId.toString(),
        );
        allowedUserIds = [...assistants, ...managers];
      } else {
        allowedUserIds = (project.coachManagers || []).map((cm) =>
          cm.userId.toString(),
        );
      }

      if (!allowedUserIds.includes(userId)) {
        throw new ForbiddenException(
          `You are not an authorized ${this.formatRole(requiredRole)} for this project.`,
        );
      }
    } else {
      const requiredGlobalRole = this.roleMap[requiredRole];
      const userRoles = (approver as any).roles || [];

      if (!userRoles.includes(requiredGlobalRole)) {
        throw new ForbiddenException(
          `You are not authorized to reject at this level. Required role: ${requiredGlobalRole}`,
        );
      }

      // Department check for coach_finance
      if (requiredRole === 'coach_finance') {
        const project = await this.projectModel
          .findById(contract.projectId)
          .lean();
        if (
          project?.department &&
          (approver as any).department !== project.department
        ) {
          throw new ForbiddenException(
            `You are not authorized for ${project.department} finance rejection.`,
          );
        }
      }
    }

    const rejectionLevel = dto.level || requiredRole;

    const updatedContract = await this.contractModel
      .findByIdAndUpdate(
        id,
        {
          status: 'rejected',
          updatedBy: userId,
          currentLevelDeadline: null,
          rejectionDetails: {
            rejectedBy: userId,
            rejectedAt: new Date(),
            reason: dto.reason,
            level: rejectionLevel,
          },
          $push: {
            amendments: {
              date: new Date(),
              description: `Contract rejected by ${this.formatRole(rejectionLevel)}`,
              changedFields: ['status'],
              approvedBy: userId,
            },
          },
        },
        { new: true },
      )
      .populate('projectId contractedUserId')
      .populate('rejectionDetails.rejectedBy', 'firstName lastName email');

    return updatedContract;
  }
}
