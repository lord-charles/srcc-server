import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Imprest, ImprestDocument } from './schemas/imprest.schema';
import { CreateImprestDto } from './dto/create-imprest.dto';
import { ImprestApprovalDto, ImprestRejectionDto, ImprestAccountingDto } from './dto/imprest-approval.dto';
import { NotificationService } from '../notifications/services/notification.service';
import { User } from '../auth/schemas/user.schema';

@Injectable()
export class ImprestService {
  constructor(
    @InjectModel(Imprest.name) private imprestModel: Model<ImprestDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationService: NotificationService,
  ) {}

  async create(createImprestDto: CreateImprestDto, userId: string): Promise<ImprestDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 72); 

    const imprest = new this.imprestModel({
      ...createImprestDto,
      employeeName: `${user.firstName} ${user.lastName}`,
      department: user.department,
      requestedBy: new Types.ObjectId(userId),
      requestDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'pending_hod',
    });

    const savedImprest = await imprest.save();

    // Notify HOD about new imprest request
    const hod = await this.userModel.findOne({ roles: { $in: ['hod'] }, status: 'active' });
    if (hod) {
      await this.notificationService.sendEmail(
        hod.email,
        'New Imprest Request Pending Approval',
        `Dear ${hod.firstName} ${hod.lastName},

A new imprest request requires your approval:

Request Details:
- Employee: ${user.firstName} ${user.lastName}
- Department: ${user.department}
- Amount: ${createImprestDto.currency} ${createImprestDto.amount.toFixed(2)}
- Purpose: ${createImprestDto.paymentReason}
- Type: ${createImprestDto.paymentType}

Additional Information:
${createImprestDto.explanation}

Please review and take appropriate action through the SRCC portal.

Best regards,
SRCC Finance Team`
      );
    }

    return savedImprest;
  }

  async findMyImprests(userId: string): Promise<ImprestDocument[]> {
    return this.imprestModel
      .find({ requestedBy: new Types.ObjectId(userId) })
      .populate([
        {
          path: 'requestedBy',
          select: 'firstName lastName email department',
        },
        {
          path: 'hodApproval.approvedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'accountantApproval.approvedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'disbursement.disbursedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'accounting.verifiedBy',
          select: 'firstName lastName email',
        },
      ])
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(filters: {
    status?: string;
    department?: string;
    requestedBy?: string;
  }): Promise<ImprestDocument[]> {
    const query = { ...filters };
    if (filters.requestedBy) {
      query.requestedBy = (filters.requestedBy);
    }

    return this.imprestModel
      .find(query)
      .populate([
        {
          path: 'requestedBy',
          select: 'firstName lastName email department',
        },
        {
          path: 'hodApproval.approvedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'accountantApproval.approvedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'disbursement.disbursedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'accounting.verifiedBy',
          select: 'firstName lastName email',
        },
      ])
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ImprestDocument> {
    const imprest = await this.imprestModel
      .findById(id)
      .populate([
        {
          path: 'requestedBy',
          select: 'firstName lastName email department',
        },
        {
          path: 'hodApproval.approvedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'accountantApproval.approvedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'disbursement.disbursedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'accounting.verifiedBy',
          select: 'firstName lastName email',
        },
      ])
      .exec();

    if (!imprest) {
      throw new NotFoundException('Imprest request not found');
    }

    return imprest;
  }

  async approveByHod(id: string, userId: string, approvalDto: ImprestApprovalDto): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    const isHod = await this.userModel.findById(userId);

    if (!isHod || !isHod.roles.includes('hod')) {
      throw new BadRequestException('User is not a HOD');
    }
    
    if (imprest.status !== 'pending_hod') {
      throw new BadRequestException('Imprest request is not pending HOD approval');
    }

    imprest.hodApproval = {
      approvedBy: new Types.ObjectId(userId),
      approvedAt: new Date(),
      comments: approvalDto.comments,
    };
    imprest.status = 'pending_accountant';

    const savedImprest = await imprest.save();

    // Get user data for notifications
    const requester = await this.userModel.findById(imprest.requestedBy);
    const approver = await this.userModel.findById(userId);

    // Notify accountants
    const accountants = await this.userModel.find({
      roles: { $in: ['accountant'] },
      status: 'active',
    })
    for (const accountant of accountants) {
      await this.notificationService.sendEmail(
        accountant.email,
        'Imprest Request Pending Accountant Approval',
        `Dear ${accountant.firstName} ${accountant.lastName},

An imprest request has been approved by HOD and requires your review:

Request Details:
- Employee: ${requester.firstName} ${requester.lastName}
- Department: ${requester.department}
- Amount: ${imprest.currency} ${imprest.amount.toFixed(2)}
- Purpose: ${imprest.paymentReason}
- HOD Comments: ${imprest.hodApproval.comments || 'No comments provided'}

Please review and process the request through the SRCC portal.

Best regards,
SRCC Finance Team`
      );
    }

    // Notify requester
    if (requester) {
      await this.notificationService.sendEmail(
        requester.email,
        'Imprest Request Approved by HOD',
        `Dear ${requester.firstName} ${requester.lastName},

Your imprest request has been approved by your HOD and is now pending accountant review:

Request Details:
- Amount: ${imprest.currency} ${imprest.amount.toFixed(2)}
- Purpose: ${imprest.paymentReason}
- HOD Comments: ${imprest.hodApproval.comments || 'No comments provided'}

You will be notified once the accountant reviews your request.

Best regards,
SRCC Finance Team`
      );
    }

    return savedImprest;
  }

  async approveByAccountant(id: string, userId: string, approvalDto: ImprestApprovalDto): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    const isAccountant = await this.userModel.findById(userId);

    if (!isAccountant || !isAccountant.roles.includes('accountant')) {
      throw new BadRequestException('User is not an accountant');
    }
    
    if (imprest.status !== 'pending_accountant') {
      throw new BadRequestException('Imprest request is not pending accountant approval');
    }

    imprest.accountantApproval = {
      approvedBy: new Types.ObjectId(userId),
      approvedAt: new Date(),
      comments: approvalDto.comments,
    };
    imprest.status = 'approved';

    const savedImprest = await imprest.save();

    // Notify requester
    const requester = await this.userModel.findById(imprest.requestedBy);
    if (requester) {
      await this.notificationService.sendEmail(
        requester.email,
        'Imprest Request Approved by Accountant',
        `Dear ${imprest.employeeName},

Your imprest request has been approved by the accountant:

Request Details:
- Amount: ${imprest.currency} ${imprest.amount.toFixed(2)}
- Purpose: ${imprest.paymentReason}
- Accountant Comments: ${imprest.accountantApproval.comments || 'No comments provided'}

The funds will be disbursed shortly. Please remember that all expenses must be accounted for within 72 hours of disbursement.

Best regards,
SRCC Finance Team`
      );
    }

    return savedImprest;
  }

  async reject(id: string, userId: string, rejectionDto: ImprestRejectionDto): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    
    if (!['pending_hod', 'pending_accountant'].includes(imprest.status)) {
      throw new BadRequestException('Imprest request cannot be rejected in its current state');
    }

    imprest.rejection = {
      rejectedBy: new Types.ObjectId(userId),
      rejectedAt: new Date(),
      reason: rejectionDto.reason,
    };
    imprest.status = 'rejected';

    const savedImprest = await imprest.save();

    // Notify requester
    const requester = await this.userModel.findById(imprest.requestedBy);
    if (requester) {
      await this.notificationService.sendEmail(
        requester.email,
        'Imprest Request Rejected',
        `Dear ${imprest.employeeName},

Your imprest request has been rejected:

Request Details:
- Amount: ${imprest.currency} ${imprest.amount.toFixed(2)}
- Purpose: ${imprest.paymentReason}
- Rejection Reason: ${rejectionDto.reason}

If you have any questions, please contact your HOD or the finance department.

Best regards,
SRCC Finance Team`
      );
    }

    return savedImprest;
  }

  async recordDisbursement(id: string, userId: string, amount: number): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    
    if (imprest.status !== 'approved') {
      throw new BadRequestException('Imprest request is not approved for disbursement');
    }

    imprest.disbursement = {
      disbursedBy: new Types.ObjectId(userId),
      disbursedAt: new Date(),
      amount,
    };
    imprest.status = 'disbursed';

    const savedImprest = await imprest.save();

    // Notify requester
    const requester = await this.userModel.findById(imprest.requestedBy);
    if (requester) {
      await this.notificationService.sendEmail(
        requester.email,
        'Imprest Funds Disbursed',
        `Dear ${imprest.employeeName},

Your imprest funds have been disbursed:

Disbursement Details:
- Amount: ${imprest.currency} ${amount.toFixed(2)}
- Purpose: ${imprest.paymentReason}
- Due Date: ${imprest.dueDate}

Important Reminders:
1. All expenses must be accounted for within 72 hours (by ${imprest.dueDate})
2. Keep all receipts and supporting documents
3. Submit your accounting through the SRCC portal
4. Unspent funds must be returned to the cashier

Best regards,
SRCC Finance Team`
      );
    }

    return savedImprest;
  }

  async submitAccounting(id: string, userId: string, accountingDto: ImprestAccountingDto): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    
    if (imprest.status !== 'disbursed') {
      throw new BadRequestException('Imprest request is not in disbursed state');
    }

    const totalAmount = accountingDto.receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const balance = imprest.disbursement.amount - totalAmount;

    imprest.accounting = {
      verifiedBy: new Types.ObjectId(userId),
      verifiedAt: new Date(),
      receipts: accountingDto.receipts.map(receipt => ({
        ...receipt,
        uploadedAt: new Date(),
      })),
      totalAmount,
      balance,
      comments: accountingDto.comments,
    };
    imprest.status = 'accounted';

    const savedImprest = await imprest.save();

    // Notify accountants about the accounting submission
    const accountants = await this.userModel.find({ role: 'accountant' });
    for (const accountant of accountants) {
      await this.notificationService.sendEmail(
        accountant.email,
        'Imprest Accounting Submitted',
        `Dear ${accountant.firstName} ${accountant.lastName},

An imprest accounting has been submitted for review:

Request Details:
- Employee: ${imprest.employeeName}
- Department: ${imprest.department}
- Original Amount: ${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}
- Total Spent: ${imprest.currency} ${totalAmount.toFixed(2)}
- Balance: ${imprest.currency} ${balance.toFixed(2)}

Number of Receipts: ${accountingDto.receipts.length}

Please review the submitted receipts and accounting through the SRCC portal.

Best regards,
SRCC Finance Team`
      );
    }

    return savedImprest;
  }

  async checkOverdueImprests(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const overdueImprests = await this.imprestModel.find({
      status: 'disbursed',
      dueDate: { $lt: today },
    }).populate('requestedBy', 'name email');

    for (const imprest of overdueImprests) {
      // Update status to overdue
      imprest.status = 'overdue';
      await imprest.save();

      // Notify requester and their HOD
      const requester = await this.userModel.findById(imprest.requestedBy);
      const hod = await this.userModel.findOne({ role: 'hod', department: imprest.department }); 

      if (requester) {
        await this.notificationService.sendEmail(
          requester.email,
          'URGENT: Imprest Accounting Overdue',
          `Dear ${imprest.employeeName},

This is an urgent reminder that your imprest accounting is overdue:

Request Details:
- Amount: ${imprest.currency} ${imprest.amount.toFixed(2)}
- Purpose: ${imprest.paymentReason}
- Due Date: ${imprest.dueDate}

Please submit your accounting immediately through the SRCC portal. Failure to account for imprest funds may result in:
1. Automatic salary recovery
2. Suspension of future imprest privileges
3. Disciplinary action as per HR policy

If you have already submitted your accounting, please disregard this message.

Best regards,
SRCC Finance Team`
        );
      }

      if (hod) {
        await this.notificationService.sendEmail(
          hod.email,
          'Employee Imprest Accounting Overdue',
          `Dear ${hod.firstName} ${hod.lastName},

This is to inform you that an imprest accounting from your department is overdue:

Employee Details:
- Name: ${imprest.employeeName}
- Department: ${imprest.department}
- Amount: ${imprest.currency} ${imprest.amount.toFixed(2)}
- Due Date: ${imprest.dueDate}

Please follow up with the employee to ensure immediate submission of the accounting.

Best regards,
SRCC Finance Team`
        );
      }
    }
  }
}
