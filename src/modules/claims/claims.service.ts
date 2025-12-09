import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types, Document, Mongoose } from 'mongoose';
import { Claim, ClaimDocument } from './schemas/claim.schema';
import { Contract, ContractDocument } from '../project/schemas/contract.schema';
import { Project, ProjectDocument } from '../project/schemas/project.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { NotificationService } from '../notifications/services/notification.service';
import { ClaimsNotificationService } from './claims-notification.service';
import { ApprovalFlowService } from './approval-flow.service';

const CLAIM_STATUSES = [
  'draft',
  'pending_checker_approval',
  'pending_reviewer_approval',
  'pending_approver_approval',
  'pending_srcc_checker_approval',
  'pending_srcc_finance_approval',
  'pending_director_approval',
  'pending_academic_director_approval',
  'pending_finance_approval',
  'approved',
  'rejected',
  'paid',
  'cancelled',
  'revision_requested',
] as const;

type ClaimStatus = (typeof CLAIM_STATUSES)[number];

interface ProjectMilestone {
  _id: Types.ObjectId;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  completionDate?: Date;
  budget: number;
  actualCost?: number;
}

type ApprovalRole = keyof typeof ClaimsService.roleMap;

type ApprovalFlowStep = {
  nextStatus: ClaimStatus;
  role: ApprovalRole;
  department: string;
};

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);
  public static readonly roleMap = {
    claim_checker: 'claim_checker',
    claim_reviewer: 'claim_reviewer',
    claim_approver: 'claim_approver',
    head_of_programs: 'head_of_programs',
    director: 'director',
    academic_director: 'academic_director',
    finance_approver: 'finance_approver',
    finance: 'finance_approver',
    srcc_checker: 'srcc_checker',
    srcc_finance: 'srcc_finance',
    reviewer: 'reviewer',
    approver: 'approver',
  } as const;

  private getApprovalLevel(status: ClaimStatus): string | null {
    const level = status.split('_')[1];
    if (level && Object.keys(ClaimsService.roleMap).includes(level)) {
      return level;
    }
    // throw new BadRequestException(`Invalid approval level in status: ${status}`);
    return null;
  }

  private async notifyStakeholders(
    claim: ClaimDocument,
    userId: Types.ObjectId,
  ): Promise<void> {
    this.logger.log(
      `notifyStakeholders called for claim ${claim._id} with status: ${claim.status}`,
    );

    const [project, claimant, updatedBy] = await Promise.all([
      this.projectModel.findById(claim.projectId),
      this.userModel.findById(claim.claimantId),
      this.userModel.findById(userId),
    ]);

    if (!project || !claimant || !updatedBy) {
      throw new NotFoundException('Required references not found');
    }

    // Get the approval flow to determine the department for the current step
    const approvalFlow = await this.approvalFlowService.getApprovalFlow(
      project.department,
    );

    // Check if status is a pending approval status
    if (
      claim.status.startsWith('pending_') &&
      claim.status.endsWith('_approval')
    ) {
      this.logger.log(`Processing pending approval status: ${claim.status}`);

      const currentRole = claim.status
        .replace('pending_', '')
        .replace('_approval', '') as ApprovalRole;

      this.logger.log(`Extracted role: ${currentRole}`);

      // Find the current step in the approval flow to get the correct department
      const currentStep = approvalFlow.steps.find(
        (step) => `pending_${step.role}_approval` === claim.status,
      );

      this.logger.log(
        `Current step found: ${currentStep ? JSON.stringify(currentStep) : 'Not found'}`,
      );

      const departmentForApprovers =
        currentStep?.department || project.department;

      this.logger.log(`Department for approvers: ${departmentForApprovers}`);

      const approvers = await this.getApprovers(
        currentRole,
        departmentForApprovers,
      );

      this.logger.log(`Sending notification to ${approvers.length} approvers`);

      await this.claimsNotificationService.notifyClaimSubmitted(
        claim,
        project,
        claimant,
        approvers,
      );
      return;
    }

    switch (claim.status as ClaimStatus) {
      case 'approved':
        this.logger.log('Notifying claim approved');
        await this.claimsNotificationService.notifyClaimApproved(
          claim,
          project,
          claimant,
          updatedBy,
        );
        break;
      case 'rejected': {
        this.logger.log('Notifying claim rejected');
        // Get rejection comments from the rejection details
        const level = claim.rejection?.level;
        let comments = 'No reason provided';
        if (level) {
          const approval = claim.approval?.[`${level}Approval`];
          if (approval?.comments) {
            comments = approval.comments;
          }
        }
        await this.claimsNotificationService.notifyClaimRejected(
          claim,
          project,
          claimant,
          updatedBy,
          comments,
        );
        break;
      }
      case 'revision_requested':
        this.logger.log('Notifying claim revision requested');
        await this.claimsNotificationService.notifyClaimUpdated(
          claim,
          project,
          claimant,
          updatedBy,
        );
        break;
      case 'paid':
        this.logger.log('Notifying claim paid');
        await this.claimsNotificationService.notifyClaimPaid(
          claim,
          project,
          claimant,
          updatedBy,
        );
        break;
      case 'cancelled':
        this.logger.log('Notifying claim cancelled');
        await this.claimsNotificationService.notifyClaimCancelled(
          claim,
          project,
          claimant,
          updatedBy,
        );
        break;
      case 'draft': {
        this.logger.log('Notifying claim created (draft)');
        // For draft, get the first step's department
        const firstStep = approvalFlow.steps[0];
        const departmentForApprovers =
          firstStep?.department || project.department;
        await this.claimsNotificationService.notifyClaimCreated(
          claim,
          project,
          claimant,
          await this.getApprovers('claim_checker', departmentForApprovers),
        );
        break;
      }
      default:
        this.logger.warn(`No notification handler for status: ${claim.status}`);
    }
  }

  private async getNextApprovalStep(claim: ClaimDocument): Promise<{
    nextStatus: string;
    role: string;
    department: string;
  } | null> {
    const project = await this.projectModel.findById(claim.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return this.approvalFlowService.getNextApprovalStep(
      project.department,
      claim.status,
    );
  }

  constructor(
    @InjectModel('Claim') private claimModel: Model<ClaimDocument>,
    @InjectModel('Contract') private contractModel: Model<ContractDocument>,
    @InjectModel('Project') private projectModel: Model<ProjectDocument>,
    @InjectModel('User') private userModel: Model<UserDocument>,
    private readonly claimsNotificationService: ClaimsNotificationService,
    private readonly approvalFlowService: ApprovalFlowService,
  ) {}

  async create(
    createClaimDto: CreateClaimDto,
    userId: Types.ObjectId,
  ): Promise<ClaimDocument> {
    const [contract, project, currentUser] = await Promise.all([
      this.contractModel.findById(createClaimDto.contractId),
      this.projectModel.findById(createClaimDto.projectId),
      this.userModel.findById(userId),
    ]);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    // Determine the claimant ID
    let claimantId = userId;
    let isCreatingOnBehalf = false;

    if (createClaimDto.claimantId) {
      // User is trying to create claim on behalf of someone else
      // Check if they are authorized to do so
      const isAdmin = currentUser.roles?.includes('admin');
      const isProjectCreator =
        project.createdBy?.toString() === userId.toString();
      const isProjectManager =
        project.projectManagerId?.toString() === userId.toString();
      const isAssistantPM = project.assistantProjectManagers?.some(
        (apm) => apm.userId.toString() === userId.toString(),
      );

      if (
        !isAdmin &&
        !isProjectCreator &&
        !isProjectManager &&
        !isAssistantPM
      ) {
        throw new BadRequestException(
          'You are not authorized to create claims on behalf of others. Only admins, project creators, project managers, or assistant project managers can do this.',
        );
      }

      // Verify the claimant exists
      const claimant = await this.userModel.findById(createClaimDto.claimantId);
      if (!claimant) {
        throw new NotFoundException(
          `Claimant with ID ${createClaimDto.claimantId} not found`,
        );
      }

      claimantId = new Types.ObjectId(createClaimDto.claimantId);
      isCreatingOnBehalf = true;

      this.logger.log(
        `User ${currentUser.email} is creating claim on behalf of claimant ${claimant.email}`,
      );
    }

    // Get the approval flow for the project's department
    const approvalFlow = await this.approvalFlowService.getApprovalFlow(
      project.department,
    );
    if (!approvalFlow || !approvalFlow.steps.length) {
      throw new BadRequestException(
        `No approval flow configured for department: ${project.department}`,
      );
    }

    // Get the initial status from the first step in the approval flow
    const initialStatus = `pending_${approvalFlow.steps[0].role}_approval`;

    // Create the claim
    const claim = new this.claimModel({
      ...createClaimDto,
      contractId: new Types.ObjectId(createClaimDto.contractId),
      projectId: new Types.ObjectId(createClaimDto.projectId),
      status: initialStatus,
      createdBy: userId, // The person who created the claim
      updatedBy: userId,
      claimantId: claimantId, // The person who will receive payment
      version: 1,
    });

    // Map milestone details
    if (createClaimDto.milestones?.length) {
      claim.milestones = createClaimDto.milestones.map((m) => {
        console.log(m.milestoneId);
        const projectMilestone = (
          project.milestones as ProjectMilestone[]
        )?.find((pm) => pm._id.toString() === m.milestoneId);
        console.log(project.milestones);
        if (!projectMilestone) {
          throw new BadRequestException(`Milestone ${m.milestoneId} not found`);
        }

        const maxClaimableAmount = projectMilestone.budget;
        const previouslyClaimed = 0;
        const currentClaim = (maxClaimableAmount * m.percentageClaimed) / 100;

        return {
          milestoneId: m.milestoneId,
          title: projectMilestone.title,
          percentageClaimed: m.percentageClaimed,
          maxClaimableAmount,
          previouslyClaimed,
          currentClaim,
          remainingClaimable:
            maxClaimableAmount - (previouslyClaimed + currentClaim),
        };
      });
    }

    const savedClaim = await claim.save();

    // Log if claim was created on behalf
    if (isCreatingOnBehalf) {
      this.logger.log(
        `Claim ${savedClaim._id} created by ${currentUser.email} on behalf of claimant ID ${claimantId}`,
      );
    }

    // Notify stakeholders
    await this.notifyStakeholders(savedClaim, userId);

    return savedClaim;
  }

  async findAll(userId: Types.ObjectId) {
    return this.claimModel
      .find({ claimantId: userId })
      .populate('projectId', 'name')
      .populate('contractId', 'contractNumber')
      .exec();
  }
  async findAllClaims(
    filters: any = {},
    userId: Types.ObjectId,
  ): Promise<any[]> {
    interface PopulatedProject {
      _id: Types.ObjectId;
      name: string;
      description: string;
      department: string;
    }

    interface PopulatedClaim extends Omit<ClaimDocument, 'projectId'> {
      projectId: PopulatedProject;
    }
    try {
      // Get the user to check their role and department
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(
        `Finding claims for user ${user.email} with roles: ${user.roles?.join(', ')} and department: ${user.department}`,
      );

      // Check if user is admin
      const isAdmin = user.roles?.includes('admin');

      this.logger.log(`User is admin: ${isAdmin}`);

      // Build the query
      let query = this.claimModel.find(filters);

      // If not admin, filter by department
      if (!isAdmin && user.department) {
        this.logger.log(`Filtering claims by department: ${user.department}`);
        // We need to populate first, then filter
        // So we'll get all claims and filter after population
      }

      const rawClaims = await query
        .populate('projectId', 'name description department')
        .populate('contractId', 'contractNumber contractValue')
        .populate('claimantId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      let claims = rawClaims as unknown as PopulatedClaim[];

      // Filter by department if not admin
      if (!isAdmin && user.department) {
        claims = claims.filter(
          (claim) => claim.projectId?.department === user.department,
        );
        this.logger.log(
          `Filtered to ${claims.length} claims in department ${user.department}`,
        );
      } else {
        this.logger.log(`Returning all ${claims.length} claims (admin user)`);
      }

      // Add approval flow to each claim
      const enhancedClaims = await Promise.all(
        claims.map(async (claim: PopulatedClaim) => {
          if (!claim.projectId?.department) {
            return claim;
          }

          // Get the approval flow for the project's department
          const approvalFlow = await this.approvalFlowService.getApprovalFlow(
            claim.projectId.department,
          );
          if (!approvalFlow) {
            return claim;
          }

          return {
            ...claim,
            approvalFlow,
          };
        }),
      );

      return enhancedClaims;
    } catch (error) {
      this.logger.error(`Error finding claims: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findClaimsByContract(
    contractId: string,
    claimantId: string,
  ): Promise<any[]> {
    try {
      return await this.claimModel
        .find({
          contractId: new Types.ObjectId(contractId),
          claimantId: new Types.ObjectId(claimantId),
        })
        .populate('projectId', 'name description')
        .populate('contractId', 'contractNumber contractValue')
        .populate('claimantId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .populate('milestones.milestoneId', 'title description')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding claims for contract ${contractId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findClaimsByProject(projectId: string, userId: string): Promise<any[]> {
    try {
      // Get user to check authorization
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get project to check authorization
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Check if user is authorized to view project claims
      const isAdmin = user.roles?.includes('admin');
      const isProjectCreator = project.createdBy?.toString() === userId;
      const isProjectManager = project.projectManagerId?.toString() === userId;
      const isAssistantPM = project.assistantProjectManagers?.some(
        (apm) => apm.userId.toString() === userId,
      );

      if (
        !isAdmin &&
        !isProjectCreator &&
        !isProjectManager &&
        !isAssistantPM
      ) {
        throw new BadRequestException(
          'You are not authorized to view claims for this project',
        );
      }

      return await this.claimModel
        .find({
          projectId: new Types.ObjectId(projectId),
        })
        .populate('projectId', 'name description')
        .populate('contractId', 'contractNumber contractValue')
        .populate('claimantId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding claims for project ${projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findOne(id: string, userId: Types.ObjectId) {
    const claim = await this.claimModel
      .findOne({ _id: id, claimantId: userId })
      .populate('projectId', 'name description milestones')
      .populate('contractId', 'contractNumber contractValue')
      .populate('claimantId', 'name email')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .exec();

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    return claim;
  }

  async update(
    id: string,
    updateClaimDto: UpdateClaimDto,
    userId: Types.ObjectId,
  ) {
    const claim = await this.claimModel.findOne({
      _id: id,
      claimantId: userId,
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== 'draft') {
      throw new BadRequestException('Only draft claims can be updated');
    }

    return this.claimModel.findByIdAndUpdate(
      id,
      {
        ...updateClaimDto,
        updatedBy: userId,
      },
      { new: true },
    );
  }

  private async getApprovers(
    level: string,
    department?: string,
  ): Promise<UserDocument[]> {
    const requiredRole = ClaimsService.roleMap[level as ApprovalRole];

    if (!requiredRole) {
      this.logger.error(`Invalid approval level: ${level}`);
      throw new BadRequestException(`Invalid approval level: ${level}`);
    }

    const query: any = {
      roles: { $in: [requiredRole] },
      status: 'active',
    };

    // Add department filter if provided
    // SRCC roles (srcc_checker, srcc_finance) should only get SRCC department users
    // Other roles should get users from the specific department
    if (department) {
      query.department = department;
    }

    this.logger.log(
      `Searching for approvers with query: ${JSON.stringify(query)}`,
    );
    this.logger.log(
      `Level: ${level}, Required Role: ${requiredRole}, Department: ${department || 'Not specified'}`,
    );

    const approvers = await this.userModel.find(query).lean();

    this.logger.log(
      `Found ${approvers.length} approver(s) for level: ${level}${department ? ` in department: ${department}` : ''}`,
    );

    if (approvers.length > 0) {
      this.logger.log(
        `Approvers found: ${approvers.map((a: any) => `${a.firstName} ${a.lastName} (${a.email}, dept: ${a.department || 'N/A'})`).join(', ')}`,
      );
    }

    if (!approvers.length) {
      this.logger.error(
        `No active approvers found for level: ${level}${department ? ` in department: ${department}` : ''}`,
      );
      throw new BadRequestException(
        `No active approvers found for level: ${level}${department ? ` in department: ${department}` : ''}. Please contact system administrator.`,
      );
    }

    return approvers;
  }

  async submit(
    claimId: string,
    userId: Types.ObjectId,
  ): Promise<ClaimDocument> {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== CLAIM_STATUSES[0]) {
      // 'draft'
      throw new BadRequestException('Only draft claims can be submitted');
    }

    // Update claim status to pending checker approval
    claim.status = CLAIM_STATUSES[1]; // 'pending_checker_approval'
    const savedClaim = await claim.save();

    await this.notifyStakeholders(savedClaim, userId);
    return savedClaim;
  }

  async approve(
    id: string,
    comments: string,
    userId: Types.ObjectId,
  ): Promise<ClaimDocument> {
    const claim = await this.claimModel.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    const approver = await this.userModel.findById(userId);
    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    const project = await this.projectModel.findById(claim.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get next step in approval flow
    const next = await this.getNextApprovalStep(claim);
    console.log(next);

    if (!next) {
      throw new BadRequestException('Invalid approval flow state');
    }

    // Extract current role from status (e.g., 'pending_claim_checker_approval' -> 'claim_checker')
    const currentRole = claim.status
      .replace('pending_', '')
      .replace('_approval', '');

    // Check if user has the required role
    if (
      !approver.roles?.includes(
        ClaimsService.roleMap[currentRole as ApprovalRole],
      )
    ) {
      throw new BadRequestException(
        `User does not have ${currentRole} approval rights`,
      );
    }

    // Update claim status and approval details
    const updatedClaim = await this.claimModel.findByIdAndUpdate(
      id,
      {
        status: next.nextStatus,
        [`approval.${currentRole}Approval`]: {
          approvedBy: userId,
          approvedAt: new Date(),
          comments,
          department: next.department,
        },
        currentLevelDeadline:
          next.nextStatus !== 'approved'
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : undefined,
        $push: {
          auditTrail: {
            action: 'APPROVED',
            performedBy: userId,
            performedAt: new Date(),
            details: {
              role: currentRole,
              department: next.department,
              comments,
              nextStatus: next.nextStatus,
            },
          },
        },
      },
      { new: true },
    );

    if (!updatedClaim) {
      throw new NotFoundException('Claim not found');
    }

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    return updatedClaim;
  }

  async reject(
    id: string,
    reason: string,
    userId: Types.ObjectId,
  ): Promise<ClaimDocument> {
    const claim = await this.findOne(id, userId);

    if (!claim.status.startsWith('pending_') || claim.status === 'approved') {
      throw new BadRequestException('Only pending claims can be rejected');
    }

    // Extract current role from status
    const currentRole = claim.status
      .replace('pending_', '')
      .replace('_approval', '') as ApprovalRole;
    const user = await this.userModel.findById(userId);

    if (!user?.roles.includes(ClaimsService.roleMap[currentRole])) {
      throw new BadRequestException(
        `Only users with ${currentRole} role can reject at this stage`,
      );
    }

    const updateData = {
      status: 'rejected',
      rejection: {
        rejectedBy: userId,
        rejectedAt: new Date(),
        reason,
        level: currentRole,
      },
      updatedBy: userId,
      $push: {
        auditTrail: {
          action: 'REJECTED',
          performedBy: userId,
          performedAt: new Date(),
          details: {
            reason,
            level: currentRole,
            status: 'rejected',
          },
        },
      },
    };

    const updatedClaim = await this.claimModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('projectId')
      .populate('claimantId')
      .exec();

    if (!updatedClaim) {
      throw new NotFoundException('Claim not found');
    }

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    return updatedClaim;
  }

  async requestRevision(
    id: string,
    userId: Types.ObjectId,
    reason: string,
    returnToStatus: string,
    comments?: string,
  ): Promise<ClaimDocument> {
    const claim = await this.findOne(id, userId);

    if (!claim.status.startsWith('pending_') || claim.status === 'approved') {
      throw new BadRequestException(
        'Only pending claims can be sent for revision',
      );
    }

    // Extract current role from status
    const currentRole = claim.status
      .replace('pending_', '')
      .replace('_approval', '') as ApprovalRole;
    const user = await this.userModel.findById(userId);

    if (!user?.roles.includes(ClaimsService.roleMap[currentRole])) {
      throw new BadRequestException(
        `Only users with ${currentRole} role can request revision at this stage`,
      );
    }

    const updateData = {
      status: 'revision_requested',
      revisionRequest: {
        requestedBy: userId,
        requestedAt: new Date(),
        reason,
        returnToStatus,
        returnToLevel: currentRole,
        comments,
      },
      updatedBy: userId,
      version: claim.version + 1,
      $push: {
        auditTrail: {
          action: 'REVISION_REQUESTED',
          performedBy: userId,
          performedAt: new Date(),
          details: {
            reason,
            returnToStatus,
            returnToLevel: currentRole,
            comments,
            previousVersion: claim.version,
          },
        },
      },
    };

    const updatedClaim = await this.claimModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('projectId')
      .populate('claimantId')
      .exec();

    if (!updatedClaim) {
      throw new NotFoundException('Claim not found');
    }

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    return updatedClaim;
  }

  async markAsPaid(
    id: string,
    paymentDetails: {
      paymentMethod: string;
      transactionId: string;
      reference: string;
      paymentAdviceUrl: string;
    },
    userId: Types.ObjectId,
  ): Promise<ClaimDocument> {
    // Validate required fields
    if (!paymentDetails.paymentAdviceUrl) {
      throw new BadRequestException(
        'Payment advice URL is required to mark claim as paid',
      );
    }

    if (!paymentDetails.paymentMethod || !paymentDetails.transactionId) {
      throw new BadRequestException(
        'Payment method and transaction ID are required',
      );
    }

    const claim = await this.claimModel.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== 'approved') {
      throw new BadRequestException(
        'Only approved claims can be marked as paid',
      );
    }

    this.logger.log(
      `Marking claim ${id} as paid by user ${userId}. Transaction: ${paymentDetails.transactionId}`,
    );

    const updatedClaim = await this.claimModel.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        payment: {
          paidBy: userId,
          paidAt: new Date(),
          ...paymentDetails,
        },
        updatedBy: userId,
        $push: {
          auditTrail: {
            action: 'MARKED_AS_PAID',
            performedBy: userId,
            performedAt: new Date(),
            details: { paymentDetails },
          },
        },
      },
      { new: true },
    );

    if (!updatedClaim) {
      throw new NotFoundException('Claim not found');
    }

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    this.logger.log(`Claim ${id} successfully marked as paid`);

    return updatedClaim;
  }

  async deleteClaim(id: string, userId: Types.ObjectId): Promise<void> {
    const claim = await this.claimModel.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // Check if claim is paid
    if (claim.status === 'paid') {
      throw new BadRequestException(
        'Paid claims cannot be deleted. Please contact the administrator if you need to make changes.',
      );
    }

    // Only allow deletion of draft or cancelled claims
    if (!['draft', 'cancelled'].includes(claim.status)) {
      throw new BadRequestException(
        'Only draft or cancelled claims can be deleted. Please cancel the claim first if needed.',
      );
    }

    this.logger.log(`Deleting claim ${id} by user ${userId}`);

    await this.claimModel.findByIdAndDelete(id);

    this.logger.log(`Claim ${id} successfully deleted`);
  }

  async cancel(id: string, userId: Types.ObjectId): Promise<ClaimDocument> {
    // Find claim without claimant restriction
    const claim = await this.claimModel.findById(id).populate('projectId');

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // Check authorization - only claimant, admin, project creator, PM, or assistant PM can cancel
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const project = await this.projectModel.findById(claim.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = user.roles?.includes('admin');
    const isClaimant = claim.claimantId.toString() === userId.toString();
    const isProjectCreator =
      project.createdBy?.toString() === userId.toString();
    const isProjectManager =
      project.projectManagerId?.toString() === userId.toString();
    const isAssistantPM = project.assistantProjectManagers?.some(
      (apm) => apm.userId.toString() === userId.toString(),
    );

    if (
      !isAdmin &&
      !isClaimant &&
      !isProjectCreator &&
      !isProjectManager &&
      !isAssistantPM
    ) {
      throw new BadRequestException(
        'You are not authorized to cancel this claim. Only the claimant, admins, project creators, project managers, or assistant project managers can cancel claims.',
      );
    }

    // Check if claim can be cancelled based on status
    // Allow cancellation for draft and any pending status, but not approved, paid, rejected, or cancelled
    const nonCancellableStatuses = [
      'approved',
      'paid',
      'rejected',
      'cancelled',
    ];

    this.logger.log(
      `Checking if claim ${id} with status "${claim.status}" can be cancelled`,
    );

    if (nonCancellableStatuses.includes(claim.status)) {
      this.logger.warn(`Cannot cancel claim ${id} - status is ${claim.status}`);
      throw new BadRequestException(
        `Claims with status "${claim.status}" cannot be cancelled. Only draft or pending claims can be cancelled.`,
      );
    }

    this.logger.log(
      `User ${user.email} is cancelling claim ${id} (status: ${claim.status})`,
    );

    const updatedClaim = await this.claimModel.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        updatedBy: userId,
        $push: {
          auditTrail: {
            action: 'CANCELLED',
            performedBy: userId,
            performedAt: new Date(),
            details: {
              previousStatus: claim.status,
              cancelledBy: `${user.firstName} ${user.lastName}`,
            },
          },
        },
      },
      { new: true },
    );

    if (!updatedClaim) {
      throw new NotFoundException('Claim not found');
    }

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    this.logger.log(`Claim ${id} successfully cancelled by user ${user.email}`);

    return updatedClaim;
  }
}
