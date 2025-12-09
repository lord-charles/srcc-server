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

    switch (claim.status as ClaimStatus) {
      case 'pending_checker_approval':
      case 'pending_reviewer_approval':
      case 'pending_approver_approval':
      case 'pending_srcc_checker_approval':
      case 'pending_srcc_finance_approval':
      case 'pending_director_approval':
      case 'pending_academic_director_approval':
      case 'pending_finance_approval': {
        const currentRole = claim.status
          .replace('pending_', '')
          .replace('_approval', '') as ApprovalRole;

        // Find the current step in the approval flow to get the correct department
        const currentStep = approvalFlow.steps.find(
          (step) => `pending_${step.role}_approval` === claim.status,
        );

        const departmentForApprovers =
          currentStep?.department || project.department;
        const approvers = await this.getApprovers(
          currentRole,
          departmentForApprovers,
        );
        await this.claimsNotificationService.notifyClaimSubmitted(
          claim,
          project,
          claimant,
          approvers,
        );
        break;
      }
      case 'approved':
        await this.claimsNotificationService.notifyClaimApproved(
          claim,
          project,
          claimant,
          updatedBy,
        );
        break;
      case 'rejected': {
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
        await this.claimsNotificationService.notifyClaimUpdated(
          claim,
          project,
          claimant,
          updatedBy,
        );
        break;
      case 'paid':
        await this.claimsNotificationService.notifyClaimPaid(
          claim,
          project,
          claimant,
          updatedBy,
        );
        break;
      case 'cancelled':
        await this.claimsNotificationService.notifyClaimCancelled(
          claim,
          project,
          claimant,
          updatedBy,
        );
        break;
      case 'draft': {
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
    const [contract, project] = await Promise.all([
      this.contractModel.findById(createClaimDto.contractId),
      this.projectModel.findById(createClaimDto.projectId),
    ]);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (!project) {
      throw new NotFoundException('Project not found');
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
      createdBy: userId,
      updatedBy: userId,
      claimantId: userId,
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
  async findAllClaims(filters: any = {}): Promise<any[]> {
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
      const rawClaims = await this.claimModel
        .find(filters)
        .populate('projectId', 'name description department')
        .populate('contractId', 'contractNumber contractValue')
        .populate('claimantId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const claims = rawClaims as unknown as PopulatedClaim[];

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
    },
    userId: Types.ObjectId,
  ): Promise<ClaimDocument> {
    const claim = await this.findOne(id, userId);

    if (claim.status !== 'approved') {
      throw new BadRequestException(
        'Only approved claims can be marked as paid',
      );
    }

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

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    return updatedClaim;
  }

  async cancel(id: string, userId: Types.ObjectId): Promise<ClaimDocument> {
    const claim = await this.findOne(id, userId);

    if (
      ![
        'draft',
        'pending_checker_approval',
        'pending_manager_approval',
        'pending_finance_approval',
      ].includes(claim.status)
    ) {
      throw new BadRequestException(
        'Only draft or pending claims can be cancelled',
      );
    }

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
          },
        },
      },
      { new: true },
    );

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    return updatedClaim;
  }
}
