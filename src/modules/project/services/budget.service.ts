import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Budget, BudgetDocument } from '../schemas/budget.schema';
import { CreateBudgetDto, UpdateBudgetDto, BudgetApprovalDto, BudgetRejectionDto, BudgetRevisionDto } from '../dto/budget.dto';
import { Project } from '../schemas/project.schema';
import { NotificationService } from '../../notifications/services/notification.service';
import { User } from '../../auth/schemas/user.schema';

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly notificationService: NotificationService,
  ) {}

  private async notifyStakeholders(
    budget: Budget,
    action: string,
    nextApprover?: User,
    comments?: string
  ): Promise<void> {
    const project = await this.projectModel.findById(budget.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [creator, projectManager] = await Promise.all([
      this.userModel.findById(budget.createdBy),
      this.userModel.findById(project.projectManagerId)
    ]);

    // Calculate total budget amount from both internal and external categories
    const internalTotal = budget.internalCategories?.reduce((sum, cat) => 
      sum + (cat.items?.reduce((itemSum, item) => itemSum + (item.estimatedAmount || 0), 0) || 0), 0) || 0;
    
    const externalTotal = budget.externalCategories?.reduce((sum, cat) => 
      sum + (cat.items?.reduce((itemSum, item) => itemSum + (item.estimatedAmount || 0), 0) || 0), 0) || 0;

    const budgetAmount = internalTotal + externalTotal;

    let emailSubject = `Budget ${action} - ${project.name}`;
    let baseMessage = `
      Budget Details:
      Project: ${project.name}
      Total Amount: ${budget.currency} ${budgetAmount.toLocaleString()}
      Internal Budget: ${budget.currency} ${internalTotal.toLocaleString()}
      External Budget: ${budget.currency} ${externalTotal.toLocaleString()}
      Status: ${budget.status}
      ${comments ? `\nComments: ${comments}` : ''}
      
      You can view the budget details in SRCC portal.
    `;

    // Always notify creator and project manager
    if (creator) {
      await this.notificationService.sendEmail(
        creator.email,
        emailSubject,
        `Dear ${creator.firstName},\n\n${baseMessage}`
      );
    }

    if (projectManager && projectManager._id.toString() !== creator._id.toString()) {
      await this.notificationService.sendEmail(
        projectManager.email,
        emailSubject,
        `Dear ${projectManager.firstName},\n\n${baseMessage}`
      );
    }

    // Notify next approver if provided
    if (nextApprover) {
      await this.notificationService.sendEmail(
        nextApprover.email,
        `Budget Approval Required - ${project.name}`,
        `Dear ${nextApprover.firstName},\n\n` +
        `A budget requires your approval.\n\n${baseMessage}\n\n` +
        `Please review and take appropriate action.`
      );
    }
  }

  private async getNextApprover(level: string): Promise<User> {
    // In a production environment, this would use a more sophisticated
    // method to determine the next approver based on roles, departments,
    // and approval limits. For now, we'll get the first user with the appropriate role.
    const roleMap = {
      checker: 'budget_checker',
      manager: 'budget_manager',
      finance: 'finance_approver'
    };

    const approver = await this.userModel.findOne({
      roles: { $in: [roleMap[level]] },
      isActive: true
    });

    return approver;
  }

  async create(userId: Types.ObjectId, dto: CreateBudgetDto): Promise<Budget> {
    const project = await this.projectModel.findById(dto.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const budget = new this.budgetModel({
      ...dto,
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
      auditTrail: [{
        action: 'CREATED',
        performedBy: userId,
        performedAt: new Date(),
        details: { status: 'draft' }
      }]
    });

    const savedBudget = await budget.save();
    await this.projectModel.findByIdAndUpdate(dto.projectId, { budgetId: savedBudget._id });
    
    return savedBudget;
  }

  async findOne(id: Types.ObjectId): Promise<Budget> {
    const budget = await this.budgetModel.findById(id);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }

  async update(id: Types.ObjectId, userId: Types.ObjectId, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.findOne(id);
    
    if (budget.status !== 'draft' && budget.status !== 'revision_requested') {
      throw new BadRequestException('Budget can only be updated when in draft or revision requested status');
    }

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        updatedBy: userId,
        $push: {
          auditTrail: {
            action: 'UPDATED',
            performedBy: userId,
            performedAt: new Date(),
            details: { items: dto.items }
          }
        }
      },
      { new: true }
    );

    return updatedBudget;
  }

  async submitForApproval(id: Types.ObjectId, userId: Types.ObjectId): Promise<Budget> {
    const budget = await this.findOne(id);
    
    if (budget.status !== 'draft' && budget.status !== 'revision_requested') {
      throw new BadRequestException('Only drafts can be submitted for approval');
    }

    let nextStatus: string;
    let nextLevel: string;

    // If returning from revision, go to the saved return status
    if (budget.status === 'revision_requested' && budget.revisionRequest?.returnToStatus) {
      nextStatus = budget.revisionRequest.returnToStatus;
      nextLevel = budget.revisionRequest.returnToLevel;
    } else {
      nextStatus = 'pending_checker_approval';
      nextLevel = 'checker';
    }

    const nextApprover = await this.getNextApprover(nextLevel);

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(
      id,
      {
        status: nextStatus,
        updatedBy: userId,
        currentLevelDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours deadline
        $push: {
          auditTrail: {
            action: 'SUBMITTED_FOR_APPROVAL',
            performedBy: userId,
            performedAt: new Date(),
            details: { from: budget.status, to: nextStatus }
          }
        }
      },
      { new: true }
    );

    // Notify stakeholders
    await this.notifyStakeholders(
      updatedBudget,
      'Submitted for Approval',
      nextApprover
    );

    return updatedBudget;
  }

  async approve(id: Types.ObjectId, userId: Types.ObjectId, dto: BudgetApprovalDto): Promise<Budget> {
    const budget = await this.findOne(id);
    let nextStatus: string;
    let nextLevel: string;
    let nextDeadline: Date;

    switch (budget.status) {
      case 'pending_checker_approval':
        nextStatus = 'pending_manager_approval';
        nextLevel = 'manager';
        nextDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
        break;
      case 'pending_manager_approval':
        nextStatus = 'pending_finance_approval';
        nextLevel = 'finance';
        nextDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
        break;
      case 'pending_finance_approval':
        nextStatus = 'approved';
        nextLevel = null;
        nextDeadline = null;
        break;
      default:
        throw new BadRequestException('Budget is not in an approvable status');
    }

    const approvalLevel = budget.status.split('_')[1];
    const approvalField = `${approvalLevel}Approvals`;

    let nextApprover = null;
    if (nextLevel) {
      nextApprover = await this.getNextApprover(nextLevel);
    }

    const update: any = {
      status: nextStatus,
      updatedBy: userId,
      currentLevelDeadline: nextDeadline,
      $push: {
        [`approvalFlow.${approvalField}`]: {
          approverId: userId,
          approvedAt: new Date(),
          comments: dto.comments
        },
        auditTrail: {
          action: 'APPROVED',
          performedBy: userId,
          performedAt: new Date(),
          details: { level: approvalLevel, from: budget.status, to: nextStatus }
        }
      }
    };

    if (nextStatus === 'approved') {
      update.approvedBy = userId;
      update.approvedAt = new Date();
    }

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(id, update, { new: true });

    // Notify stakeholders
    await this.notifyStakeholders(
      updatedBudget,
      nextStatus === 'approved' ? 'Approved' : 'Approved at ' + approvalLevel + ' level',
      nextApprover,
      dto.comments
    );

    return updatedBudget;
  }

  async reject(id: Types.ObjectId, userId: Types.ObjectId, dto: BudgetRejectionDto): Promise<Budget> {
    const budget = await this.findOne(id);
    
    if (!budget.status.startsWith('pending_')) {
      throw new BadRequestException('Budget is not in an approvable status');
    }

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        updatedBy: userId,
        currentLevelDeadline: null,
        rejectionDetails: {
          rejectedBy: userId,
          rejectedAt: new Date(),
          reason: dto.reason,
          level: dto.level
        },
        $push: {
          auditTrail: {
            action: 'REJECTED',
            performedBy: userId,
            performedAt: new Date(),
            details: { reason: dto.reason, level: dto.level }
          }
        }
      },
      { new: true }
    );

    // Notify stakeholders
    await this.notifyStakeholders(
      updatedBudget,
      'Rejected',
      null,
      dto.reason
    );

    return updatedBudget;
  }

  async requestRevision(id: Types.ObjectId, userId: Types.ObjectId, dto: BudgetRevisionDto): Promise<Budget> {
    const budget = await this.findOne(id);
    
    if (!budget.status.startsWith('pending_')) {
      throw new BadRequestException('Budget is not in an approvable status');
    }

    // When revision is requested, it goes back to the previous stage
    // If it's at checker level, it goes back to draft
    let previousStatus: string;
    let previousLevel: string;
    
    switch (budget.status) {
      case 'pending_checker_approval':
        previousStatus = 'draft';
        previousLevel = 'creator';
        break;
      case 'pending_manager_approval':
        previousStatus = 'pending_checker_approval';
        previousLevel = 'checker';
        break;
      case 'pending_finance_approval':
        previousStatus = 'pending_manager_approval';
        previousLevel = 'manager';
        break;
      default:
        throw new BadRequestException('Invalid budget status');
    }

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(
      id,
      {
        status: 'revision_requested',
        updatedBy: userId,
        currentLevelDeadline: null,
        revisionRequest: {
          requestedBy: userId,
          requestedAt: new Date(),
          comments: dto.comments,
          changes: dto.changes,
          returnToStatus: previousStatus,
          returnToLevel: previousLevel
        },
        $push: {
          auditTrail: {
            action: 'REVISION_REQUESTED',
            performedBy: userId,
            performedAt: new Date(),
            details: { 
              comments: dto.comments, 
              changes: dto.changes,
              returnToStatus: previousStatus,
              returnToLevel: previousLevel
            }
          }
        }
      },
      { new: true }
    );

    // Notify stakeholders about revision request
    await this.notifyStakeholders(
      updatedBudget,
      'Revision Requested',
      null,
      dto.comments
    );

    return updatedBudget;
  }

  async findByProject(projectId: Types.ObjectId): Promise<Budget> {
    const budget = await this.budgetModel.findOne({ projectId });
    if (!budget) {
      throw new NotFoundException('Budget not found for this project');
    }
    return budget;
  }
}
