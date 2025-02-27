import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetApprovalDto,
  BudgetRejectionDto,
  BudgetRevisionDto,
} from '../dto/budget.dto';
import { Project } from '../schemas/project.schema';
import { NotificationService } from '../../notifications/services/notification.service';
import { Budget, BudgetDocument } from '../schemas/budget.schema';
import { User, UserDocument } from 'src/modules/auth/schemas/user.schema';

@Injectable()
export class BudgetService {
  private readonly roleMap = {
    checker: 'budget_checker',
    manager: 'budget_manager',
    finance: 'finance_approver',
  } as const;

  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) { }

  private async notifyStakeholders(
    budget: Budget,
    action: string,
    nextApprover?: User,
    comments?: string,
  ): Promise<void> {
    const project = await this.projectModel.findById(budget.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [creator, projectManager] = await Promise.all([
      this.userModel.findById(budget.createdBy),
      this.userModel.findById(project.projectManagerId),
    ]);

    // Calculate total budget amount from both internal and external categories
    const internalTotal =
      budget.internalCategories?.reduce(
        (sum, cat) =>
          sum +
          (cat.items?.reduce(
            (itemSum, item) => itemSum + (item.estimatedAmount || 0),
            0,
          ) || 0),
        0,
      ) || 0;

    const externalTotal =
      budget.externalCategories?.reduce(
        (sum, cat) =>
          sum +
          (cat.items?.reduce(
            (itemSum, item) => itemSum + (item.estimatedAmount || 0),
            0,
          ) || 0),
        0,
      ) || 0;

    const totalBudget = internalTotal + externalTotal;
    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let emailSubject = `${project.name} - Budget ${action} Notification`;
    let baseMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Budget ${action}</h2>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Project Details</h3>
            <p><strong>Project Name:</strong> ${project.name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Status:</strong> ${budget.status.replace(/_/g, ' ').toUpperCase()}</p>
          </div>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Budget Summary</h3>
            <p><strong>Total Budget:</strong> ${budget.currency} ${totalBudget.toLocaleString()}</p>
            <p><strong>Internal Budget:</strong> ${budget.currency} ${internalTotal.toLocaleString()}</p>
            <p><strong>External Budget:</strong> ${budget.currency} ${externalTotal.toLocaleString()}</p>
            <p><strong>Version:</strong> ${budget.version}</p>
          </div>

          ${comments
        ? `
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Comments</h3>
            <p>${comments}</p>
          </div>
          `
        : ''
      }

          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            <p style="margin-bottom: 20px;">You can view the complete budget details in the <a href="https://srcc.strathmore.edu/budgets/${budget.id}" style="color: #3498db; text-decoration: none;">SRCC Portal</a>.</p>
            
            <p style="color: #7f8c8d; font-size: 12px; margin-top: 20px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;

    // Always notify creator and project manager
    if (creator) {
      await this.notificationService.sendEmail(
        creator.email,
        emailSubject,
        `Dear ${creator.firstName},\n\n${baseMessage}`,
      );
    }

    if (
      projectManager &&
      projectManager._id.toString() !== creator._id.toString()
    ) {
      await this.notificationService.sendEmail(
        projectManager.email,
        emailSubject,
        `Dear ${projectManager.firstName},\n\n${baseMessage}`,
      );
    }

    // Notify next approver if provided
    if (nextApprover) {
      const approverMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Action Required: Budget Approval</h2>
            
            <div style="background-color: #e74c3c; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0;"><strong>⚠️ Your approval is required for this budget.</strong></p>
            </div>

            ${baseMessage}

            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p><strong>Action Required:</strong></p>
              <p>Please review and take appropriate action on this budget request.</p>
              <a href="https://srcc.strathmore.edu/budgets/${budget.id}/approve" 
                 style="display: inline-block; background-color: #2ecc71; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 5px; margin-top: 10px;">
                Review Budget
              </a>
            </div>
          </div>
        </div>
      `;

      await this.notificationService.sendEmail(
        nextApprover.email,
        `Urgent: Budget Approval Required - ${project.name}`,
        `Dear ${nextApprover.firstName},\n\n${approverMessage}`,
      );
    }
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

  private async notifyApprovers(
    budget: Budget,
    approvers: User[],
    project: any,
    baseMessage: string,
    level: string,
  ): Promise<void> {
    const approverPromises = approvers.map(async (approver) => {
      const approverMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Action Required: Budget Approval</h2>
            
            <div style="background-color: #e74c3c; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0;"><strong>⚠️ Your approval is required for this budget.</strong></p>
            </div>

            ${baseMessage}

            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h3 style="color: #34495e; margin-top: 0;">Action Required</h3>
              <p>As a <strong>${this.formatRole(approver.roles.find((r) => r === this.roleMap[level]))}</strong>, your review and approval are required for this budget.</p>
              <p>Please review the budget details and take appropriate action based on:</p>
              <ul style="color: #34495e;">
                <li>Compliance with organizational policies</li>
                <li>Budget allocation accuracy</li>
                <li>Financial viability and justification</li>
                <li>Project objectives alignment</li>
              </ul>
              <a href="https://srcc.strathmore.edu/budgets/${budget.id}/approve" 
                 style="display: inline-block; background-color: #2ecc71; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 5px; margin-top: 10px;">
                Review Budget
              </a>
            </div>

            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="color: #7f8c8d; font-size: 12px; margin: 0;">
                This notification was sent to you because you are designated as a ${this.formatRole(approver.roles.find((r) => r === this.roleMap[level]))} in the SRCC system.
              </p>
            </div>
          </div>
        </div>
      `;

      await this.notificationService.sendEmail(
        approver.email,
        `Urgent: Budget Approval Required - ${project.name}`,
        `Dear ${approver.firstName},\n\n${approverMessage}`,
      );
    });

    await Promise.all(approverPromises);
  }

  private formatRole(role: string): string {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async submitForApproval(
    id: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<Budget> {
    const budget = await this.findOne(id);

    if (budget.status !== 'draft' && budget.status !== 'revision_requested') {
      throw new BadRequestException(
        'Only drafts can be submitted for approval',
      );
    }

    let nextStatus: string;
    let nextLevel: string;

    if (
      budget.status === 'revision_requested' &&
      budget.revisionRequest?.returnToStatus
    ) {
      nextStatus = budget.revisionRequest.returnToStatus;
      nextLevel = budget.revisionRequest.returnToLevel;
    } else {
      nextStatus = 'pending_checker_approval';
      nextLevel = 'checker';
    }

    const approvers = await this.getApprovers(nextLevel);
    console.log(approvers);

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(
      id,
      {
        status: nextStatus,
        updatedBy: userId,
        currentLevelDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours deadline
        $unset: { revisionRequest: 1 },
        $push: {
          auditTrail: {
            action: 'SUBMITTED_FOR_APPROVAL',
            performedBy: userId,
            performedAt: new Date(),
            details: {
              from: budget.status,
              to: nextStatus,
              previousVersion: budget.version,
              approvers: approvers.map((a) => ({
                id: a.employeeId,
                name: `${a.firstName} ${a.lastName}`,
                role: a.roles.find((r) => r === this.roleMap[nextLevel]),
              })),
            },
          },
        },
      },
      { new: true },
    );

    const project = await this.projectModel.findById(budget.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Generate base message for all notifications
    const baseMessage = await this.generateBaseEmailMessage(
      updatedBudget,
      project,
    );

    // Notify all stakeholders including all approvers
    await this.notifyStakeholders(updatedBudget, 'Submitted for Approval');
    await this.notifyApprovers(
      updatedBudget,
      approvers,
      project,
      baseMessage,
      nextLevel,
    );

    return updatedBudget;
  }

  async findOne(id: Types.ObjectId): Promise<Budget> {
    const budget = await this.budgetModel
      .findById(id)
      .populate({
        path: 'projectId',
        select: 'firstName lastName email phoneNumber',
      })
      .populate({
        path: 'auditTrail.performedBy',
        select: 'firstName lastName email phoneNumber',
      })
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email phoneNumber',
      })
      .populate({
        path: 'updatedBy',
        select: 'firstName lastName email phoneNumber',
      })
      .exec();

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }

  async update(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: UpdateBudgetDto,
  ): Promise<Budget> {
    const budget = await this.findOne(id);

    if (budget.status !== 'draft' && budget.status !== 'revision_requested') {
      throw new BadRequestException(
        'Budget can only be updated when in draft or revision requested status',
      );
    }

    // Increment version when significant changes are made
    const shouldIncrementVersion =
      dto.internalCategories?.length > 0 ||
      dto.externalCategories?.length > 0 ||
      dto.totalInternalBudget !== undefined ||
      dto.totalExternalBudget !== undefined;

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        updatedBy: userId,
        ...(shouldIncrementVersion && { version: budget.version + 1 }),
        $push: {
          auditTrail: {
            action: 'UPDATED',
            performedBy: userId,
            performedAt: new Date(),
            details: {
              internalCategories: dto.internalCategories,
              externalCategories: dto.externalCategories,
              totalInternalBudget: dto.totalInternalBudget,
              totalExternalBudget: dto.totalExternalBudget,
              version: shouldIncrementVersion
                ? budget.version + 1
                : budget.version,
            },
          },
        },
      },
      { new: true },
    );

    return updatedBudget;
  }

  async getNextApprover(level: string): Promise<User> {
    // In a production environment, this would use a more sophisticated
    // method to determine the next approver based on roles, departments,
    // and approval limits. For now, we'll get the first user with the appropriate role.
    const approver = await this.userModel.findOne({
      roles: { $in: [this.roleMap[level]] },
      isActive: true,
    });

    return approver;
  }

  async create(userId: Types.ObjectId, dto: CreateBudgetDto): Promise<Budget> {
    const project = await this.projectModel.findById(dto.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if budget already exists for this project
    const existingBudget = await this.budgetModel
      .findOne({
        _id: project.budgetId, // Use the budgetId from the project
      })
      .select('-__v'); // Exclude version field

    if (existingBudget) {
      console.log('Found existing budget:', existingBudget._id);

      // Create update object with only the fields that are provided
      const updateFields: any = {};

      // Define valid budget fields
      const validBudgetFields = [
        'projectId',
        'internalCategories',
        'externalCategories',
        'currency',
        'totalInternalBudget',
        'totalExternalBudget',
        'totalInternalSpent',
        'totalExternalSpent',
        'status',
        'notes',
        'auditTrail',
      ];

      // Only update arrays if they are provided in the DTO
      if (dto.internalCategories) {
        updateFields.internalCategories = dto.internalCategories;
        updateFields.totalInternalBudget = dto.totalInternalBudget || 0;
      }

      if (dto.externalCategories) {
        updateFields.externalCategories = dto.externalCategories;
        updateFields.totalExternalBudget = dto.totalExternalBudget || 0;
      }

      // Handle other non-array fields
      Object.entries(dto).forEach(([key, value]) => {
        if (
          value !== undefined &&
          validBudgetFields.includes(key) &&
          key !== 'internalCategories' &&
          key !== 'externalCategories' &&
          key !== 'totalInternalBudget' &&
          key !== 'totalExternalBudget'
        ) {
          updateFields[key] = value;
        }
      });

      // Use $set to update only the provided fields
      const updatedBudget = await this.budgetModel
        .findByIdAndUpdate(
          existingBudget._id,
          {
            $set: {
              ...updateFields,
              updatedBy: userId,
              updatedAt: new Date(),
            },
            $push: {
              auditTrail: {
                action: 'UPDATED',
                performedBy: userId,
                performedAt: new Date(),
                details: { updatedFields: Object.keys(updateFields) },
              },
            },
          },
          {
            new: true,
            runValidators: true,
            lean: true,
          },
        )
        .select('-__v');

      if (!updatedBudget) {
        throw new Error('Failed to update budget');
      }

      return updatedBudget;
    }

    // Create new budget if it doesn't exist
    const budget = new this.budgetModel({
      ...dto,
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
      auditTrail: [
        {
          action: 'CREATED',
          performedBy: userId,
          performedAt: new Date(),
          details: { status: 'draft' },
        },
      ],
    });

    const savedBudget = await budget.save();
    await this.projectModel.findByIdAndUpdate(dto.projectId, {
      budgetId: savedBudget._id,
    });

    return savedBudget.toObject({ versionKey: false });
  }

  async approve(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: BudgetApprovalDto,
  ): Promise<Budget> {
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
          comments: dto.comments,
        },
        auditTrail: {
          action: 'APPROVED',
          performedBy: userId,
          performedAt: new Date(),
          details: {
            level: approvalLevel,
            from: budget.status,
            to: nextStatus,
          },
        },
      },
    };

    if (nextStatus === 'approved') {
      update.approvedBy = userId;
      update.approvedAt = new Date();
    }

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(id, update, {
      new: true,
    });

    // Notify stakeholders
    await this.notifyStakeholders(
      updatedBudget,
      nextStatus === 'approved'
        ? 'Approved'
        : 'Approved at ' + approvalLevel + ' level',
      nextApprover,
      dto.comments,
    );

    return updatedBudget;
  }

  async reject(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: BudgetRejectionDto,
  ): Promise<Budget> {
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
          level: dto.level,
        },
        $push: {
          auditTrail: {
            action: 'REJECTED',
            performedBy: userId,
            performedAt: new Date(),
            details: { reason: dto.reason, level: dto.level },
          },
        },
      },
      { new: true },
    );

    // Notify stakeholders
    await this.notifyStakeholders(updatedBudget, 'Rejected', null, dto.reason);

    return updatedBudget;
  }

  async requestRevision(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: BudgetRevisionDto,
  ): Promise<Budget> {
    const budget = await this.findOne(id);

    // Store the current status and level to return to after revision
    const currentStatus = budget.status;
    const currentLevel = this.getApprovalLevel(currentStatus);

    const updatedBudget = await this.budgetModel.findByIdAndUpdate(
      id,
      {
        status: 'revision_requested',
        updatedBy: userId,
        revisionRequest: {
          requestedBy: userId,
          requestedAt: new Date(),
          comments: dto.comments,
          changes: dto.changes,
          returnToStatus: currentStatus,
          returnToLevel: currentLevel,
        },
        $push: {
          auditTrail: {
            action: 'REVISION_REQUESTED',
            performedBy: userId,
            performedAt: new Date(),
            details: {
              from: currentStatus,
              comments: dto.comments,
              changes: dto.changes,
              returnToStatus: currentStatus,
              returnToLevel: currentLevel,
            },
          },
        },
      },
      { new: true },
    );

    // Notify stakeholders
    await this.notifyStakeholders(
      updatedBudget,
      'Revision Requested',
      null,
      dto.comments,
    );

    return updatedBudget;
  }

  private getApprovalLevel(status: string): string {
    const statusToLevel = {
      pending_checker_approval: 'checker',
      pending_manager_approval: 'manager',
      pending_finance_approval: 'finance',
    };
    return statusToLevel[status] || 'checker';
  }

  async findByProject(projectId: Types.ObjectId): Promise<Budget> {
    const budget = await this.budgetModel.findOne({ projectId });
    if (!budget) {
      throw new NotFoundException('Budget not found for this project');
    }
    return budget;
  }

  async findAll(): Promise<Budget[]> {
    return this.budgetModel
      .find()
      .select('-auditTrail')
      .populate({
        path: 'projectId',
        select: 'name description startDate endDate status',
      })
      .populate({
        path: 'createdBy updatedBy approvedBy',
        select: 'firstName lastName email phoneNumber employeeId',
      })
      .populate({
        path: 'approvalFlow.checkerApprovals.approverId approvalFlow.managerApprovals.approverId approvalFlow.financeApprovals.approverId',
        select: 'firstName lastName email employeeId',
      })
      .populate({
        path: 'rejectionDetails.rejectedBy',
        select: 'firstName lastName email employeeId',
      })
      .populate({
        path: 'revisionRequest.requestedBy',
        select: 'firstName lastName email employeeId',
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  private async generateBaseEmailMessage(
    budget: Budget,
    project: Project,
  ): Promise<string> {
    const internalTotal =
      budget.internalCategories?.reduce(
        (sum, cat) =>
          sum +
          (cat.items?.reduce(
            (itemSum, item) => itemSum + (item.estimatedAmount || 0),
            0,
          ) || 0),
        0,
      ) || 0;

    const externalTotal =
      budget.externalCategories?.reduce(
        (sum, cat) =>
          sum +
          (cat.items?.reduce(
            (itemSum, item) => itemSum + (item.estimatedAmount || 0),
            0,
          ) || 0),
        0,
      ) || 0;

    const totalBudget = internalTotal + externalTotal;
    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Project Details</h3>
            <p><strong>Project Name:</strong> ${project.name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Status:</strong> ${budget.status.replace(/_/g, ' ').toUpperCase()}</p>
          </div>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Budget Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0;"><strong>Total Budget:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${budget.currency} ${totalBudget.toLocaleString()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0;"><strong>Internal Budget:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${budget.currency} ${internalTotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>External Budget:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${budget.currency} ${externalTotal.toLocaleString()}</td>
              </tr>
            </table>
            <div style="margin-top: 15px;">
              <p style="margin: 5px 0;"><strong>Version:</strong> ${budget.version}</p>
          
            </div>
          </div>

          ${budget.notes
        ? `
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Additional Notes</h3>
            <p style="margin: 0;">${budget.notes}</p>
          </div>
          `
        : ''
      }

          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            <p style="margin-bottom: 20px;">You can view the complete budget details in the <a href="https://srcc.strathmore.edu/budgets/${budget.id}" style="color: #3498db; text-decoration: none;">SRCC Portal</a>.</p>
            
            <p style="color: #7f8c8d; font-size: 12px; margin-top: 20px;">
              This is an automated message from the SRCC Budget Management System. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;
  }
}
