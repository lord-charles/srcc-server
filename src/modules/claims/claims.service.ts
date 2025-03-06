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

type ApprovalLevel = 'checker' | 'manager' | 'finance';

const CLAIM_STATUSES = [
  'draft',
  'pending_checker_approval',
  'pending_manager_approval',
  'pending_finance_approval',
  'approved',
  'rejected',
  'paid',
  'cancelled',
  'revision_requested',
] as const;

type ClaimStatus = typeof CLAIM_STATUSES[number];

type MilestoneClaim = {
  milestoneId: string;
  percentageClaimed: number;
};

type MilestoneDetails = {
  milestoneId: string;
  title: string;
  percentageClaimed: number;
  maxClaimableAmount: number;
  previouslyClaimed: number;
  currentClaim: number;
  remainingClaimable: number;
};

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

type ApprovalFlowStep = {
  nextStatus: ClaimStatus;
  nextLevel: ApprovalLevel | null;
};

type ApprovalFlow = {
  [K in Extract<ClaimStatus, `pending_${ApprovalLevel}_approval`>]: ApprovalFlowStep;
};

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);
  private readonly roleMap = {
    checker: 'claim_checker',
    manager: 'claim_manager',
    finance: 'finance_approver',
  } as const;

  private readonly approvalFlow: ApprovalFlow = {
    pending_checker_approval: { nextStatus: 'pending_manager_approval', nextLevel: 'manager' },
    pending_manager_approval: { nextStatus: 'pending_finance_approval', nextLevel: 'finance' },
    pending_finance_approval: { nextStatus: 'approved', nextLevel: null },
  };

  private getApprovalLevel(status: ClaimStatus): ApprovalLevel {
    const level = status.split('_')[1];
    if (level === 'checker' || level === 'manager' || level === 'finance') {
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
      this.userModel.findById(userId)
    ]);

    if (!project || !claimant || !updatedBy) {
      throw new NotFoundException('Required references not found');
    }

    switch (claim.status as ClaimStatus) {
      case 'pending_checker_approval':
      case 'pending_manager_approval':
      case 'pending_finance_approval': {
        const level = this.getApprovalLevel(claim.status as ClaimStatus);

        const approvers = await this.getApprovers(level);
        await this.claimsNotificationService.notifyClaimSubmitted(claim, project, claimant, approvers);
        break;
      }
      case 'approved':
        await this.claimsNotificationService.notifyClaimApproved(claim, project, claimant, updatedBy);
        break;
      case 'rejected': {
        // Get rejection comments from the appropriate approval level
        const level = claim.status === 'rejected' ? this.getApprovalLevel(claim.status as ClaimStatus) : null;
        let comments = 'No reason provided';
        if (level) {
          const approval = claim.approval?.[`${level}Approval`];
          if (approval?.comments) {
            comments = approval.comments;
          }
        }
        await this.claimsNotificationService.notifyClaimRejected(claim, project, claimant, updatedBy, comments);
        break;
      }
      case 'revision_requested':
        await this.claimsNotificationService.notifyClaimUpdated(claim, project, claimant, updatedBy);
        break;
      case 'paid':
        await this.claimsNotificationService.notifyClaimPaid(claim, project, claimant, updatedBy);
        break;
      case 'cancelled':
        await this.claimsNotificationService.notifyClaimCancelled(claim, project, claimant, updatedBy);
        break;
      case 'draft':
        await this.claimsNotificationService.notifyClaimCreated(claim, project, claimant, await this.getApprovers('checker'));
        break;
    }
  }

  private getNextApprovalLevel(currentStatus: ClaimStatus): ApprovalFlowStep | null {
    return this.approvalFlow[currentStatus as keyof typeof this.approvalFlow] || null;
  }

  constructor(
    @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly claimsNotificationService: ClaimsNotificationService,
  ) {}

  async create(createClaimDto: CreateClaimDto, userId: Types.ObjectId): Promise<ClaimDocument> {
    const [contract, project] = await Promise.all([
      this.contractModel.findById(createClaimDto.contractId),
      this.projectModel.findById(createClaimDto.projectId)
    ]);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (!project) {
      throw new NotFoundException('Project not found');
    }



    // Create the claim
    const claim = new this.claimModel({
      ...createClaimDto,
      contractId: new Types.ObjectId(createClaimDto.contractId),
      projectId: new Types.ObjectId(createClaimDto.projectId),
      status: 'pending_checker_approval',
      createdBy: userId,
      updatedBy: userId,
      claimantId: userId,
      version: 1,
    });

    // Map milestone details
    if (createClaimDto.milestones?.length) {
      claim.milestones = createClaimDto.milestones.map(m => {
        console.log(m.milestoneId);
        const projectMilestone = (project.milestones as ProjectMilestone[])?.find(
          pm => pm._id.toString() === m.milestoneId
        );
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
          remainingClaimable: maxClaimableAmount - (previouslyClaimed + currentClaim),
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
    try {
      return await this.claimModel
        .find(filters)
        .populate('projectId', 'name description')
        .populate('contractId', 'contractNumber contractValue')
        .populate('claimantId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
       this.logger.error(
          `Error finding claims: ${error.message}`,
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

  async update(id: string, updateClaimDto: UpdateClaimDto, userId: Types.ObjectId) {
    const claim = await this.claimModel.findOne({ _id: id, claimantId: userId });
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
      { new: true }
    );
  }


  private async getApprovers(level: string): Promise<UserDocument[]> {
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


  async submit(claimId: string, userId: Types.ObjectId): Promise<ClaimDocument> {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== CLAIM_STATUSES[0]) { // 'draft'
      throw new BadRequestException('Only draft claims can be submitted');
    }

    // Update claim status to pending checker approval
    claim.status = CLAIM_STATUSES[1]; // 'pending_checker_approval'
    const savedClaim = await claim.save();

    await this.notifyStakeholders(savedClaim, userId);
    return savedClaim;
  }

  async approve(id: string, comments: string, userId: Types.ObjectId): Promise<ClaimDocument> {
    const claim = await this.claimModel.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    const currentLevel = this.getApprovalLevel(claim.status as ClaimStatus);
    const approver = await this.userModel.findById(userId);
    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    // Check if user has the required role
    if (!approver.roles?.includes(this.roleMap[currentLevel])) {
      throw new BadRequestException(`User does not have ${currentLevel} approval rights`);
    }

    // Get next approval level
    const next = this.getNextApprovalLevel(claim.status as ClaimStatus);
    if (!next) {
      throw new BadRequestException('Invalid approval flow');
    }

    // Update claim status and approval details
    const updatedClaim = await this.claimModel.findByIdAndUpdate(
      id,
      {
        status: next.nextStatus,
        [`approval.${currentLevel}Approval`]: {
          approvedBy: userId,
          approvedAt: new Date(),
          comments,
        },
        currentLevelDeadline: next.nextLevel
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : undefined,
        $push: {
          auditTrail: {
            action: 'APPROVED',
            performedBy: userId,
            performedAt: new Date(),
            details: {
              level: currentLevel,
              comments,
            },
          },
        },
      },
      { new: true }
    );

    if (!updatedClaim) {
      throw new NotFoundException('Claim not found');
    }

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    return updatedClaim;
  }

  async reject(id: string, reason: string, userId: Types.ObjectId): Promise<ClaimDocument> {
    const claim = await this.findOne(id, userId);

    if (claim.status !== 'pending_checker_approval' && 
        claim.status !== 'pending_manager_approval' && 
        claim.status !== 'pending_finance_approval') {
      throw new BadRequestException('Only pending claims can be rejected');
    }

    // Verify user has appropriate role for current approval level
    const currentLevel = this.getApprovalLevel(claim.status);
    const requiredRole = this.roleMap[currentLevel];
    const user = await this.userModel.findById(userId);
    
    if (!user?.roles.includes(requiredRole)) {
      throw new BadRequestException(`Only users with ${currentLevel} role can reject at this stage`);
    }

    const updateData = {
      status: 'rejected',
      rejection: {
        rejectedBy: userId,
        rejectedAt: new Date(),
        reason,
        level: currentLevel,
      },
      updatedBy: userId,
      $push: {
        auditTrail: {
          action: 'REJECTED',
          performedBy: userId,
          performedAt: new Date(),
          details: { 
            reason,
            level: currentLevel,
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

    if (claim.status !== 'pending_checker_approval' && 
        claim.status !== 'pending_manager_approval' && 
        claim.status !== 'pending_finance_approval') {
      throw new BadRequestException('Only pending claims can be sent for revision');
    }

    // Verify user has appropriate role for current approval level
    const currentLevel = this.getApprovalLevel(claim.status);
    const requiredRole = this.roleMap[currentLevel];
    const user = await this.userModel.findById(userId);
    
    if (!user?.roles.includes(requiredRole)) {
      throw new BadRequestException(`Only users with ${currentLevel} role can request revision at this stage`);
    }

    const updateData = {
      status: 'revision_requested',
      revisionRequest: {
        requestedBy: userId,
        requestedAt: new Date(),
        reason,
        returnToStatus,
        returnToLevel: currentLevel,
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
            returnToLevel: currentLevel,
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
    userId: Types.ObjectId
  ): Promise<ClaimDocument> {
    const claim = await this.findOne(id, userId);

    if (claim.status !== 'approved') {
      throw new BadRequestException('Only approved claims can be marked as paid');
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
      { new: true }
    );

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    return updatedClaim;
  }

  async cancel(id: string, userId: Types.ObjectId): Promise<ClaimDocument> {
    const claim = await this.findOne(id, userId);

    if (!['draft', 'pending_checker_approval', 'pending_manager_approval', 'pending_finance_approval'].includes(claim.status)) {
      throw new BadRequestException('Only draft or pending claims can be cancelled');
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
      { new: true }
    );

    // Notify stakeholders
    await this.notifyStakeholders(updatedClaim, userId);

    return updatedClaim;
  }
}
