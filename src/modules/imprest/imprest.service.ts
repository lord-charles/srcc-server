import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Imprest, ImprestDocument } from './schemas/imprest.schema';
import { CreateImprestDto } from './dto/create-imprest.dto';
import {
  ImprestApprovalDto,
  ImprestRejectionDto,
  ImprestAccountingDto,
  ImprestDisbursementDto,
  ImprestAcknowledgmentDto,
  ImprestDisputeResolutionDto,
} from './dto/imprest-approval.dto';
import { NotificationService } from '../notifications/services/notification.service';
import { User } from '../auth/schemas/user.schema';

@Injectable()
export class ImprestService {
  constructor(
    @InjectModel(Imprest.name) private imprestModel: Model<ImprestDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationService: NotificationService,
  ) {}

  async create(
    createImprestDto: CreateImprestDto,
    userId: string,
    attachments: { fileName: string; fileUrl: string; uploadedAt: Date }[] = [],
  ): Promise<ImprestDocument> {
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
      attachments: attachments,
    });

    const savedImprest = await imprest.save();

    // Notify HOD about new imprest request
    const hod = await this.userModel.findOne({
      roles: { $in: ['hod'] },
      status: 'active',
    });
    if (hod) {
      // Send detailed email
      await this.notificationService.sendEmail(
        hod.email,
        'New Imprest Request Pending Approval',
        `Dear ${hod.firstName} ${hod.lastName},

A new imprest request requires your approval:

Request Details:
- Employee: ${user.firstName} ${user.lastName}
- Department: ${user.department}
- Amount: ${createImprestDto.currency} ${createImprestDto.amount}
- Purpose: ${createImprestDto.paymentReason}
- Type: ${createImprestDto.paymentType}
${attachments.length > 0 ? `- Attachments: ${attachments.length} file(s) attached` : ''}

Additional Information:
${createImprestDto.explanation}

Please review and take appropriate action through the SRCC portal.

Best regards,
SRCC Finance Team`,
      );

      // Send brief SMS
      if (hod.phoneNumber) {
        await this.notificationService.sendSMS(
          hod.phoneNumber,
          `SRCC: New imprest request from ${user.firstName} ${user.lastName} (${createImprestDto.currency} ${createImprestDto.amount}) pending your approval.`,
        );
      }
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
        {
          path: 'rejection.rejectedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'acknowledgment.acknowledgedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'disputeResolution.resolvedBy',
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
      query.requestedBy = filters.requestedBy;
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
        {
          path: 'acknowledgment.acknowledgedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'disputeResolution.resolvedBy',
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
        {
          path: 'acknowledgment.acknowledgedBy',
          select: 'firstName lastName email',
        },
        {
          path: 'disputeResolution.resolvedBy',
          select: 'firstName lastName email',
        },
      ])
      .exec();

    if (!imprest) {
      throw new NotFoundException('Imprest request not found');
    }

    return imprest;
  }

  async approveByHod(
    id: string,
    userId: string,
    approvalDto: ImprestApprovalDto,
  ): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    const isHod = await this.userModel.findById(userId);

    if (!isHod || !isHod.roles.includes('hod')) {
      throw new BadRequestException('User is not a HOD');
    }

    if (imprest.status !== 'pending_hod') {
      throw new BadRequestException(
        'Imprest request is not pending HOD approval',
      );
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
    });
    for (const accountant of accountants) {
      // Send detailed email
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
SRCC Finance Team`,
      );

      // Send brief SMS
      if (accountant.phoneNumber) {
        await this.notificationService.sendSMS(
          accountant.phoneNumber,
          `SRCC: Imprest request from ${requester.firstName} ${requester.lastName} (${imprest.currency} ${imprest.amount.toFixed(2)}) approved by HOD, pending your review.`,
        );
      }
    }

    // Notify requester
    if (requester) {
      // Send detailed email
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
SRCC Finance Team`,
      );

      // Send brief SMS
      if (requester.phoneNumber) {
        await this.notificationService.sendSMS(
          requester.phoneNumber,
          `SRCC: Your imprest request (${imprest.currency} ${imprest.amount.toFixed(2)}) approved by HOD, now pending accountant review.`,
        );
      }
    }

    return savedImprest;
  }

  async approveByAccountant(
    id: string,
    userId: string,
    approvalDto: ImprestApprovalDto,
  ): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    const isAccountant = await this.userModel.findById(userId);

    if (!isAccountant || !isAccountant.roles.includes('accountant')) {
      throw new BadRequestException('User is not an accountant');
    }

    if (imprest.status !== 'pending_accountant') {
      throw new BadRequestException(
        'Imprest request is not pending accountant approval',
      );
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
      // Send detailed email
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
SRCC Finance Team`,
      );

      // Send brief SMS
      if (requester.phoneNumber) {
        await this.notificationService.sendSMS(
          requester.phoneNumber,
          `SRCC: Your imprest request (${imprest.currency} ${imprest.amount.toFixed(2)}) approved by accountant. Funds will be disbursed shortly.`,
        );
      }
    }

    return savedImprest;
  }

  async reject(
    id: string,
    userId: string,
    rejectionDto: ImprestRejectionDto,
  ): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);

    if (!['pending_hod', 'pending_accountant'].includes(imprest.status)) {
      throw new BadRequestException(
        'Imprest request cannot be rejected in its current state',
      );
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
      // Send detailed email
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
SRCC Finance Team`,
      );

      // Send brief SMS
      if (requester.phoneNumber) {
        await this.notificationService.sendSMS(
          requester.phoneNumber,
          `SRCC: Your imprest request (${imprest.currency} ${imprest.amount.toFixed(2)}) has been rejected. Check email for details.`,
        );
      }
    }

    return savedImprest;
  }

  async recordDisbursement(
    id: string,
    userId: string,
    disbursementDto: ImprestDisbursementDto,
  ): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);

    if (imprest.status !== 'approved') {
      throw new BadRequestException(
        'Imprest request is not approved for disbursement',
      );
    }

    imprest.disbursement = {
      disbursedBy: new Types.ObjectId(userId),
      disbursedAt: new Date(),
      amount: disbursementDto.amount,
      comments: disbursementDto.comments,
    };
    imprest.status = 'pending_acknowledgment';

    const savedImprest = await imprest.save();

    // Notify requester to acknowledge receipt
    const requester = await this.userModel.findById(imprest.requestedBy);
    if (requester) {
      // Send detailed email
      await this.notificationService.sendEmail(
        requester.email,
        'Imprest Funds Disbursed - Please Acknowledge Receipt',
        `Dear ${imprest.employeeName},

Your imprest funds have been disbursed:

Disbursement Details:
- Amount: ${imprest.currency} ${disbursementDto.amount.toFixed(2)}
- Purpose: ${imprest.paymentReason}
- Due Date: ${imprest.dueDate}
${disbursementDto.comments ? `- Comments: ${disbursementDto.comments}` : ''}

IMPORTANT ACTION REQUIRED:
Please log into the SRCC portal and acknowledge whether you have received the money. This is mandatory before you can proceed with your expenses.

If you have NOT received the money, please report this immediately through the portal so we can investigate and resolve the issue.

Important Reminders:
1. All expenses must be accounted for within 72 hours (by ${imprest.dueDate})
2. Keep all receipts and supporting documents
3. Submit your accounting through the SRCC portal
4. Unspent funds must be returned to the cashier

Best regards,
SRCC Finance Team`,
      );

      // Send brief SMS
      if (requester.phoneNumber) {
        await this.notificationService.sendSMS(
          requester.phoneNumber,
          `SRCC: Your imprest funds (${imprest.currency} ${disbursementDto.amount.toFixed(2)}) have been disbursed. Please log in to acknowledge receipt.`,
        );
      }
    }

    return savedImprest;
  }

  async submitAccounting(
    id: string,
    userId: string,
    accountingDto: ImprestAccountingDto,
    processedReceipts: {
      description: string;
      amount: number;
      receiptUrl: string;
      uploadedAt: Date;
    }[] = [],
  ): Promise<ImprestDocument> {
    const imprest = await this.imprestModel.findById(id);
    if (!imprest) {
      throw new NotFoundException('Imprest request not found');
    }

    if (imprest.status !== 'disbursed') {
      throw new BadRequestException(
        'Imprest must be disbursed before accounting',
      );
    }

    if (imprest.requestedBy.toString() !== userId) {
      throw new BadRequestException('Only the requester can submit accounting');
    }

    // Calculate total amount and balance
    const totalAmount = processedReceipts.reduce(
      (sum, receipt) => sum + receipt.amount,
      0,
    );
    const balance = imprest.disbursement.amount - totalAmount;

    // Update imprest with accounting details
    imprest.accounting = {
      verifiedBy: new Types.ObjectId(userId),
      verifiedAt: new Date(),
      receipts: processedReceipts,
      totalAmount,
      balance,
      comments: accountingDto.comments,
    };
    imprest.status = 'pending_accounting_approval';

    const savedImprest = await imprest.save();

    // Notify accountants about the accounting submission
    const accountants = await this.userModel.find({
      roles: { $in: ['accountant'] },
      status: 'active',
    });
    for (const accountant of accountants) {
      // Send detailed email
      await this.notificationService.sendEmail(
        accountant.email,
        'Imprest Accounting Pending Approval',
        `Dear ${accountant.firstName} ${accountant.lastName},

An imprest accounting has been submitted and is pending your approval:

Request Details:
- Employee: ${imprest.employeeName}
- Department: ${imprest.department}
- Original Amount: ${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}
- Total Spent: ${imprest.currency} ${totalAmount.toFixed(2)}
- Balance: ${imprest.currency} ${balance.toFixed(2)}

Number of Receipts: ${processedReceipts.length}

Please review and approve the submitted receipts and accounting through the SRCC portal.

Best regards,
SRCC Finance Team`,
      );

      // Send brief SMS
      if (accountant.phoneNumber) {
        await this.notificationService.sendSMS(
          accountant.phoneNumber,
          `SRCC: Imprest accounting from ${imprest.employeeName} (${imprest.currency} ${totalAmount.toFixed(2)} spent) pending your approval.`,
        );
      }
    }

    return savedImprest;
  }

  async approveAccounting(
    id: string,
    userId: string,
    comments?: string,
  ): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    const user = await this.userModel.findById(userId);
    if (!user || !user.roles.includes('accountant')) {
      throw new BadRequestException('User is not an accountant');
    }
    if (imprest.status !== 'pending_accounting_approval') {
      throw new BadRequestException(
        'Imprest accounting is not pending approval',
      );
    }
    //  append approval comments
    if (comments) {
      imprest.accounting.comments =
        (imprest.accounting.comments
          ? imprest.accounting.comments + '\n'
          : '') +
        '[Accountant Approval] ' +
        comments;
    }
    imprest.status = 'accounted';
    const savedImprest = await imprest.save();
    // Notify requester
    const requester = await this.userModel.findById(imprest.requestedBy);
    if (requester) {
      // Send detailed email
      await this.notificationService.sendEmail(
        requester.email,
        'Imprest Accounting Approved',
        `Dear ${imprest.employeeName},\n\nYour imprest accounting submission has been reviewed and approved by the accountant.\n\nRequest Details:\n- Original Amount: ${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}\n- Total Spent: ${imprest.currency} ${imprest.accounting.totalAmount.toFixed(2)}\n- Balance: ${imprest.currency} ${imprest.accounting.balance.toFixed(2)}\n\nThank you for completing your accounting.\n\nBest regards,\nSRCC Finance Team`,
      );

      // Send brief SMS
      if (requester.phoneNumber) {
        await this.notificationService.sendSMS(
          requester.phoneNumber,
          `SRCC: Your imprest accounting has been approved. Balance: ${imprest.currency} ${imprest.accounting.balance.toFixed(2)}.`,
        );
      }
    }
    return savedImprest;
  }

  async acknowledgeReceipt(
    id: string,
    userId: string,
    acknowledgmentDto: ImprestAcknowledgmentDto,
  ): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);

    if (
      !['pending_acknowledgment', 'resolved_dispute'].includes(imprest.status)
    ) {
      throw new BadRequestException('Imprest is not pending acknowledgment');
    }

    // Fix: Access the _id field correctly when requestedBy is populated
    const requestedById = imprest.requestedBy._id
      ? imprest.requestedBy._id.toString()
      : imprest.requestedBy.toString();

    if (requestedById !== userId) {
      throw new BadRequestException(
        'Only the requester can acknowledge receipt',
      );
    }

    imprest.acknowledgment = {
      acknowledgedBy: new Types.ObjectId(userId),
      acknowledgedAt: new Date(),
      received: acknowledgmentDto.received,
      comments: acknowledgmentDto.comments,
    };

    if (acknowledgmentDto.received) {
      // Money received successfully - preserve dispute history if it exists
      imprest.status = imprest.hasDisputeHistory
        ? 'resolved_dispute'
        : 'disbursed';

      const savedImprest = await imprest.save();

      // Notify requester about successful acknowledgment
      const requester = await this.userModel.findById(imprest.requestedBy);
      if (requester) {
        // Send detailed email
        await this.notificationService.sendEmail(
          requester.email,
          'Money Receipt Acknowledged - Proceed with Expenses',
          `Dear ${imprest.employeeName},

Thank you for confirming receipt of your imprest funds.

You can now proceed with your expenses. Remember:
- Amount: ${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}
- Due Date for Accounting: ${imprest.dueDate}
- Keep all receipts and supporting documents
- Submit your accounting through the SRCC portal within 72 hours

Best regards,
SRCC Finance Team`,
        );

        // Send brief SMS
        if (requester.phoneNumber) {
          await this.notificationService.sendSMS(
            requester.phoneNumber,
            `SRCC: Receipt confirmed. You can now proceed with expenses. Submit accounting by ${imprest.dueDate}.`,
          );
        }
      }

      return savedImprest;
    } else {
      // Money not received - create dispute
      imprest.status = 'disputed';
      imprest.hasDisputeHistory = true;

      const savedImprest = await imprest.save();

      // Notify system admins about the dispute
      const admins = await this.userModel.find({
        roles: { $in: ['admin'] },
        status: 'active',
      });
      for (const admin of admins) {
        // Send detailed email
        await this.notificationService.sendEmail(
          admin.email,
          'URGENT: Imprest Disbursement Dispute Reported',
          `Dear ${admin.firstName} ${admin.lastName},

A user has reported NOT receiving their imprest disbursement:

Dispute Details:
- Employee: ${imprest.employeeName}
- Department: ${imprest.department}
- Amount: ${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}
- Purpose: ${imprest.paymentReason}
- Disbursed At: ${imprest.disbursement.disbursedAt}
- User Comments: ${acknowledgmentDto.comments || 'No comments provided'}

IMMEDIATE ACTION REQUIRED:
Please investigate this issue and resolve it through the SRCC portal. The user cannot proceed with their work until this is resolved.

Best regards,
SRCC System`,
        );

        // Send urgent SMS
        if (admin.phoneNumber) {
          await this.notificationService.sendSMS(
            admin.phoneNumber,
            `URGENT SRCC: ${imprest.employeeName} reports NOT receiving imprest funds (${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}). Immediate investigation required.`,
          );
        }
      }

      // Notify requester about dispute creation
      const requester = await this.userModel.findById(imprest.requestedBy);
      if (requester) {
        // Send detailed email
        await this.notificationService.sendEmail(
          requester.email,
          'Disbursement Issue Reported - Under Investigation',
          `Dear ${imprest.employeeName},

We have received your report that you did not receive the imprest funds.

Your report has been escalated to the system administrators for immediate investigation. You will be notified once the issue is resolved.

Dispute Details:
- Amount: ${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}
- Your Comments: ${acknowledgmentDto.comments || 'No comments provided'}

Please do not attempt to proceed with expenses until this issue is resolved.

Best regards,
SRCC Finance Team`,
        );

        // Send brief SMS
        if (requester.phoneNumber) {
          await this.notificationService.sendSMS(
            requester.phoneNumber,
            `SRCC: Your disbursement issue has been reported to administrators. You will be notified once resolved.`,
          );
        }
      }

      return savedImprest;
    }
  }

  async resolveDispute(
    id: string,
    userId: string,
    resolutionDto: ImprestDisputeResolutionDto,
  ): Promise<ImprestDocument> {
    const imprest = await this.findOne(id);
    const admin = await this.userModel.findById(userId);

    if (!admin || !admin.roles.includes('admin')) {
      throw new BadRequestException('Only administrators can resolve disputes');
    }

    if (imprest.status !== 'disputed') {
      throw new BadRequestException('Imprest is not in disputed status');
    }

    imprest.disputeResolution = {
      resolvedBy: new Types.ObjectId(userId),
      resolvedAt: new Date(),
      resolution: resolutionDto.resolution,
      adminComments: resolutionDto.adminComments,
    };

    // Mark that this imprest has dispute history
    imprest.hasDisputeHistory = true;

    if (resolutionDto.resolution === 'disbursed') {
      // Issue resolved, money re-disbursed or confirmed - use special status
      imprest.status = 'resolved_dispute';
    } else {
      // Cancelled - no money will be disbursed
      imprest.status = 'cancelled';
    }

    const savedImprest = await imprest.save();

    // Notify requester about resolution
    const requester = await this.userModel.findById(imprest.requestedBy);
    if (requester) {
      if (resolutionDto.resolution === 'disbursed') {
        // Send detailed email
        await this.notificationService.sendEmail(
          requester.email,
          'Disbursement Issue Resolved - Please Check Again',
          `Dear ${imprest.employeeName},

Your disbursement issue has been resolved by the administrator.

Resolution Details:
- Status: Issue resolved, funds available
- Admin Comments: ${resolutionDto.adminComments || 'Issue has been resolved'}

IMPORTANT: Please log into the SRCC portal again and confirm whether you have now received the money.

Amount: ${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}

Best regards,
SRCC Finance Team`,
        );

        // Send brief SMS
        if (requester.phoneNumber) {
          await this.notificationService.sendSMS(
            requester.phoneNumber,
            `SRCC: Your disbursement issue has been resolved. Please log in to confirm receipt of funds (${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}).`,
          );
        }
      } else {
        // Send detailed email
        await this.notificationService.sendEmail(
          requester.email,
          'Imprest Request Cancelled Due to Disbursement Issues',
          `Dear ${imprest.employeeName},

Your imprest request has been cancelled due to disbursement issues that could not be resolved.

Cancellation Details:
- Amount: ${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}
- Admin Comments: ${resolutionDto.adminComments || 'Request cancelled due to technical issues'}

You may submit a new imprest request if needed.

Best regards,
SRCC Finance Team`,
        );

        // Send brief SMS
        if (requester.phoneNumber) {
          await this.notificationService.sendSMS(
            requester.phoneNumber,
            `SRCC: Your imprest request (${imprest.currency} ${imprest.disbursement.amount.toFixed(2)}) has been cancelled due to disbursement issues. You may submit a new request.`,
          );
        }
      }
    }

    return savedImprest;
  }

  async checkOverdueImprests(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const overdueImprests = await this.imprestModel
      .find({
        status: 'disbursed',
        dueDate: { $lt: today },
      })
      .populate('requestedBy', 'name email');

    for (const imprest of overdueImprests) {
      // Update status to overdue
      imprest.status = 'overdue';
      await imprest.save();

      // Notify requester and their HOD
      const requester = await this.userModel.findById(imprest.requestedBy);
      const hod = await this.userModel.findOne({
        role: 'hod',
        department: imprest.department,
      });

      if (requester) {
        // Send detailed email
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
SRCC Finance Team`,
        );

        // Send urgent SMS
        if (requester.phoneNumber) {
          await this.notificationService.sendSMS(
            requester.phoneNumber,
            `URGENT SRCC: Your imprest accounting is OVERDUE (${imprest.currency} ${imprest.amount.toFixed(2)}). Submit immediately to avoid penalties.`,
          );
        }
      }

      if (hod) {
        // Send detailed email
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
SRCC Finance Team`,
        );

        // Send brief SMS
        if (hod.phoneNumber) {
          await this.notificationService.sendSMS(
            hod.phoneNumber,
            `SRCC: Employee ${imprest.employeeName} has overdue imprest accounting (${imprest.currency} ${imprest.amount.toFixed(2)}). Please follow up.`,
          );
        }
      }
    }
  }
}
