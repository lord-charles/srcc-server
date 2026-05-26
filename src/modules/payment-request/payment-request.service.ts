import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PaymentRequest,
  PaymentRequestDocument,
  PaymentRequestStatus,
} from './schemas/payment-request.schema';
import {
  PaymentVoucher,
  PaymentVoucherDocument,
  PaymentVoucherStatus,
} from './schemas/payment-voucher.schema';
import {
  CreatePaymentRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  RequestRevisionDto,
  CreateVoucherDto,
  ApproveVoucherDto,
  RejectVoucherDto,
  VoucherRevisionDto,
  PayVoucherDto,
} from './dto/payment-request.dto';
import { Project, ProjectDocument } from '../project/schemas/project.schema';
import { Lpo, LpoDocument, LpoStatus } from '../lpo/schemas/lpo.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { NotificationService } from '../notifications/services/notification.service';

@Injectable()
export class PaymentRequestService {
  private readonly logger = new Logger(PaymentRequestService.name);

  constructor(
    @InjectModel(PaymentRequest.name)
    private paymentRequestModel: Model<PaymentRequestDocument>,
    @InjectModel(PaymentVoucher.name)
    private paymentVoucherModel: Model<PaymentVoucherDocument>,
    @InjectModel(Project.name)
    private projectModel: Model<ProjectDocument>,
    @InjectModel(Lpo.name)
    private lpoModel: Model<LpoDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  private async notifyRole(role: string, subject: string, message: string) {
    try {
      const users = await this.userModel.find({ roles: role }).exec();
      for (const user of users) {
        if (user.email) {
          await this.notificationService.sendEmail(user.email, subject, message);
        }
        if (user.phoneNumber) {
          await this.notificationService.sendSMS(user.phoneNumber, message);
        }
      }
    } catch (err) {
      this.logger.error(`Error notifying role ${role}: ${err.message}`);
    }
  }

  private async notifyUser(
    userId: Types.ObjectId | string,
    subject: string,
    message: string,
  ) {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (user) {
        if (user.email) {
          await this.notificationService.sendEmail(user.email, subject, message);
        }
        if (user.phoneNumber) {
          await this.notificationService.sendSMS(user.phoneNumber, message);
        }
      }
    } catch (err) {
      this.logger.error(`Error notifying user ${userId}: ${err.message}`);
    }
  }

  // Calculate LPO remaining balance
  async getLpoRemainingBalance(lpoId: string, excludeRequestId?: string): Promise<number> {
    const lpo = await this.lpoModel.findById(lpoId).exec();
    if (!lpo) {
      throw new NotFoundException(`LPO not found`);
    }

    const query: any = { lpoId: new Types.ObjectId(lpoId), status: { $ne: 'rejected' } };
    if (excludeRequestId) {
      query._id = { $ne: new Types.ObjectId(excludeRequestId) };
    }

    const requests = await this.paymentRequestModel.find(query).exec();
    const sum = requests.reduce((acc, req) => acc + req.amount, 0);
    return Math.max(0, lpo.totalAmount - sum);
  }

  // Create payment request (PM only, but roles guard is in controller)
  async createRequest(
    createDto: CreatePaymentRequestDto,
    userId: string,
  ): Promise<PaymentRequestDocument> {
    const project = await this.projectModel.findById(createDto.projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const lpo = await this.lpoModel.findById(createDto.lpoId).exec();
    if (!lpo) {
      throw new NotFoundException('LPO not found');
    }

    if (lpo.status !== LpoStatus.FINANCE_APPROVED) {
      throw new BadRequestException('Payment request can only be raised for approved LPOs');
    }

    const remainingBalance = await this.getLpoRemainingBalance(createDto.lpoId);
    if (createDto.amount > remainingBalance) {
      throw new BadRequestException(
        `Requested amount (${createDto.amount}) exceeds the LPO remaining balance (${remainingBalance})`,
      );
    }

    const newRequest = new this.paymentRequestModel({
      ...createDto,
      requestedBy: new Types.ObjectId(userId) as any,
      status: PaymentRequestStatus.PENDING_HOD_APPROVAL,
      auditTrail: [
        {
          actionBy: new Types.ObjectId(userId) as any,
          action: 'Created',
          actionAt: new Date(),
          comments: 'Initial payment request submission',
        },
      ],
    });

    const savedRequest = await newRequest.save();

    // Notify HOD role
    await this.notifyRole(
      'hod',
      `New Payment Request Pending Approval`,
      `A payment request of ${savedRequest.amount} ${savedRequest.currency} has been raised against LPO ${lpo.lpoNo} for project "${project.name}". It is pending your HOD approval.`,
    );

    return savedRequest;
  }

  // Update payment request (e.g., if PM wants to edit after revision requested)
  async updateRequest(
    id: string,
    updateDto: CreatePaymentRequestDto,
    userId: string,
  ): Promise<PaymentRequestDocument> {
    const request = await this.getRequestById(id);
    if (!request) {
      throw new NotFoundException('Payment Request not found');
    }

    if (
      request.status !== PaymentRequestStatus.PENDING_HOD_APPROVAL &&
      request.status !== PaymentRequestStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException('Request can only be updated if pending HOD approval or revision requested');
    }

    const remainingBalance = await this.getLpoRemainingBalance(updateDto.lpoId, id);
    if (updateDto.amount > remainingBalance) {
      throw new BadRequestException(
        `Requested amount (${updateDto.amount}) exceeds the LPO remaining balance (${remainingBalance})`,
      );
    }

    request.amount = updateDto.amount;
    request.grnUrl = updateDto.grnUrl;
    if (updateDto.currency) request.currency = updateDto.currency;
    request.status = PaymentRequestStatus.PENDING_HOD_APPROVAL; // reset to pending HOD approval
    request.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Updated',
      actionAt: new Date(),
      comments: 'Request updated by creator',
    });

    const savedRequest = await request.save();

    // Notify HODs again
    const lpo = await this.lpoModel.findById(savedRequest.lpoId).exec();
    const project = await this.projectModel.findById(savedRequest.projectId).exec();
    await this.notifyRole(
      'hod',
      `Payment Request Re-submitted`,
      `A payment request of ${savedRequest.amount} ${savedRequest.currency} has been re-submitted against LPO ${lpo?.lpoNo} for project "${project?.name}". It requires HOD approval.`,
    );

    return savedRequest;
  }

  async getRequests(filters: any): Promise<PaymentRequest[]> {
    return this.paymentRequestModel
      .find(filters)
      .populate('projectId', 'name department currency')
      .populate('lpoId', 'lpoNo totalAmount preparedBy status')
      .populate('requestedBy', 'firstName lastName email phoneNumber')
      .populate({
        path: 'approval.approvedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'rejection.rejectedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'revision.requestedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'auditTrail.actionBy',
        select: 'firstName lastName',
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getRequestById(id: string): Promise<PaymentRequestDocument> {
    const request = await this.paymentRequestModel
      .findById(id)
      .populate('projectId')
      .populate('lpoId')
      .populate('requestedBy', 'firstName lastName email phoneNumber')
      .populate({
        path: 'approval.approvedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'rejection.rejectedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'revision.requestedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'auditTrail.actionBy',
        select: 'firstName lastName',
      })
      .exec();

    if (!request) {
      throw new NotFoundException(`Payment Request with ID ${id} not found`);
    }
    return request;
  }

  // Approve Request (HOD only)
  async approveRequest(id: string, dto: ApproveRequestDto, userId: string): Promise<PaymentRequestDocument> {
    const request = await this.getRequestById(id);
    if (request.status !== PaymentRequestStatus.PENDING_HOD_APPROVAL) {
      throw new BadRequestException('Request is not pending HOD approval');
    }

    request.status = PaymentRequestStatus.HOD_APPROVED;
    request.approval = {
      approvedBy: new Types.ObjectId(userId) as any,
      approvedAt: new Date(),
      comments: dto.comments,
    };
    request.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Approved by HOD',
      actionAt: new Date(),
      comments: dto.comments,
    });

    const savedRequest = await request.save();

    // Notify srcc_checker (Finance Checker)
    const lpo = (savedRequest.lpoId as any);
    await this.notifyRole(
      'srcc_checker',
      `Payment Request HOD Approved`,
      `Payment request for ${savedRequest.amount} ${savedRequest.currency} (LPO: ${lpo?.lpoNo || ''}) has been approved by HOD and is ready for voucher creation.`,
    );

    return savedRequest;
  }

  // Reject Request (HOD only)
  async rejectRequest(id: string, dto: RejectRequestDto, userId: string): Promise<PaymentRequestDocument> {
    const request = await this.getRequestById(id);
    if (request.status !== PaymentRequestStatus.PENDING_HOD_APPROVAL) {
      throw new BadRequestException('Request is not pending HOD approval');
    }

    request.status = PaymentRequestStatus.REJECTED;
    request.rejection = {
      rejectedBy: new Types.ObjectId(userId) as any,
      rejectedAt: new Date(),
      reason: dto.reason,
    };
    request.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Rejected by HOD',
      actionAt: new Date(),
      comments: dto.reason,
    });

    const savedRequest = await request.save();

    // Notify requester
    await this.notifyUser(
      savedRequest.requestedBy as any,
      `Payment Request Rejected`,
      `Your payment request of ${savedRequest.amount} ${savedRequest.currency} has been rejected by HOD. Reason: ${dto.reason}`,
    );

    return savedRequest;
  }

  // Request Corrections / Revision (HOD only)
  async requestRequestRevision(
    id: string,
    dto: RequestRevisionDto,
    userId: string,
  ): Promise<PaymentRequestDocument> {
    const request = await this.getRequestById(id);
    if (request.status !== PaymentRequestStatus.PENDING_HOD_APPROVAL) {
      throw new BadRequestException('Request is not pending HOD approval');
    }

    request.status = PaymentRequestStatus.REVISION_REQUESTED;
    request.revision = {
      requestedBy: new Types.ObjectId(userId) as any,
      requestedAt: new Date(),
      comment: dto.comment,
    };
    request.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Revision Requested by HOD',
      actionAt: new Date(),
      comments: dto.comment,
    });

    const savedRequest = await request.save();

    // Notify requester
    await this.notifyUser(
      savedRequest.requestedBy as any,
      `Payment Request: Revision Required`,
      `Your payment request of ${savedRequest.amount} ${savedRequest.currency} requires corrections. HOD Comments: ${dto.comment}`,
    );

    return savedRequest;
  }

  // --- PAYMENT VOUCHER LOGIC ---

  async createVoucher(dto: CreateVoucherDto, userId: string): Promise<PaymentVoucherDocument> {
    const request = await this.getRequestById(dto.paymentRequestId);
    if (
      request.status !== PaymentRequestStatus.HOD_APPROVED &&
      request.status !== PaymentRequestStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException('Cannot raise a voucher. Request must be HOD approved.');
    }

    if (dto.amount > request.amount) {
      throw new BadRequestException(`Voucher amount (${dto.amount}) cannot exceed payment request amount (${request.amount})`);
    }

    const newVoucher = new this.paymentVoucherModel({
      paymentRequestId: new Types.ObjectId(dto.paymentRequestId) as any,
      amount: dto.amount,
      preparedBy: new Types.ObjectId(userId) as any,
      status: PaymentVoucherStatus.PENDING_FINANCE_APPROVAL,
      auditTrail: [
        {
          actionBy: new Types.ObjectId(userId) as any,
          action: 'Created Voucher',
          actionAt: new Date(),
          comments: 'Initial voucher generation',
        },
      ],
    });

    const savedVoucher = await newVoucher.save();

    // Notify srcc_finance (Finance Approver)
    await this.notifyRole(
      'srcc_finance',
      `Payment Voucher Pending Approval`,
      `A new payment voucher ${savedVoucher.voucherNo} for amount ${savedVoucher.amount} KES has been generated and requires your approval.`,
    );

    return savedVoucher;
  }

  // Update voucher (if checker edits after revision requested)
  async updateVoucher(
    id: string,
    dto: CreateVoucherDto,
    userId: string,
  ): Promise<PaymentVoucherDocument> {
    const voucher = await this.getVoucherById(id);
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (
      voucher.status !== PaymentVoucherStatus.PENDING_FINANCE_APPROVAL &&
      voucher.status !== PaymentVoucherStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException('Voucher can only be updated if pending approval or revision requested');
    }

    const request = await this.getRequestById(dto.paymentRequestId);
    if (dto.amount > request.amount) {
      throw new BadRequestException(`Voucher amount (${dto.amount}) cannot exceed payment request amount (${request.amount})`);
    }

    voucher.amount = dto.amount;
    voucher.status = PaymentVoucherStatus.PENDING_FINANCE_APPROVAL; // reset to pending approval
    voucher.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Updated Voucher',
      actionAt: new Date(),
      comments: 'Voucher details updated by checker',
    });

    const savedVoucher = await voucher.save();

    // Notify srcc_finance again
    await this.notifyRole(
      'srcc_finance',
      `Payment Voucher Re-submitted`,
      `Payment voucher ${savedVoucher.voucherNo} for amount ${savedVoucher.amount} KES has been re-submitted for approval.`,
    );

    return savedVoucher;
  }

  async getVouchers(filters: any): Promise<PaymentVoucher[]> {
    return this.paymentVoucherModel
      .find(filters)
      .populate({
        path: 'paymentRequestId',
        populate: [
          { path: 'projectId', select: 'name department currency' },
          { path: 'lpoId', select: 'lpoNo totalAmount preparedBy' },
          { path: 'requestedBy', select: 'firstName lastName email' },
        ],
      })
      .populate('preparedBy', 'firstName lastName email')
      .populate({
        path: 'approval.approvedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'rejection.rejectedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'revision.requestedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'auditTrail.actionBy',
        select: 'firstName lastName',
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getVoucherById(id: string): Promise<PaymentVoucherDocument> {
    const voucher = await this.paymentVoucherModel
      .findById(id)
      .populate({
        path: 'paymentRequestId',
        populate: [
          { path: 'projectId' },
          { path: 'lpoId' },
          { path: 'requestedBy', select: 'firstName lastName email phoneNumber' },
        ],
      })
      .populate('preparedBy', 'firstName lastName email')
      .populate({
        path: 'approval.approvedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'rejection.rejectedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'revision.requestedBy',
        select: 'firstName lastName',
      })
      .populate({
        path: 'auditTrail.actionBy',
        select: 'firstName lastName',
      })
      .exec();

    if (!voucher) {
      throw new NotFoundException(`Payment Voucher with ID ${id} not found`);
    }
    return voucher;
  }

  // Approve Voucher (srcc_finance / Finance Approver only)
  async approveVoucher(id: string, dto: ApproveVoucherDto, userId: string): Promise<PaymentVoucherDocument> {
    const voucher = await this.getVoucherById(id);
    if (voucher.status !== PaymentVoucherStatus.PENDING_FINANCE_APPROVAL) {
      throw new BadRequestException('Voucher is not pending approval');
    }

    voucher.status = PaymentVoucherStatus.APPROVED;
    voucher.approval = {
      approvedBy: new Types.ObjectId(userId) as any,
      approvedAt: new Date(),
      comments: dto.comments,
    };
    voucher.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Approved by Finance Approver',
      actionAt: new Date(),
      comments: dto.comments,
    });

    const savedVoucher = await voucher.save();

    // Notify checker (preparedBy) & PM (requestedBy)
    const request: any = savedVoucher.paymentRequestId;
    if (savedVoucher.preparedBy) {
      await this.notifyUser(
        savedVoucher.preparedBy as any,
        `Voucher Approved`,
        `Payment voucher ${savedVoucher.voucherNo} for ${savedVoucher.amount} KES has been approved by Finance Approver and is now pending payment.`,
      );
    }
    if (request && request.requestedBy) {
      await this.notifyUser(
        request.requestedBy._id,
        `Payment Request Approved & Voucher Created`,
        `Your payment request of ${request.amount} ${request.currency} has been approved, and voucher ${savedVoucher.voucherNo} is approved and pending payment.`,
      );
    }

    return savedVoucher;
  }

  // Reject Voucher (srcc_finance / Finance Approver only)
  async rejectVoucher(id: string, dto: RejectVoucherDto, userId: string): Promise<PaymentVoucherDocument> {
    const voucher = await this.getVoucherById(id);
    if (voucher.status !== PaymentVoucherStatus.PENDING_FINANCE_APPROVAL) {
      throw new BadRequestException('Voucher is not pending approval');
    }

    voucher.status = PaymentVoucherStatus.REJECTED;
    voucher.rejection = {
      rejectedBy: new Types.ObjectId(userId) as any,
      rejectedAt: new Date(),
      reason: dto.reason,
    };
    voucher.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Rejected by Finance Approver',
      actionAt: new Date(),
      comments: dto.reason,
    });

    const savedVoucher = await voucher.save();

    // Notify checker
    if (savedVoucher.preparedBy) {
      await this.notifyUser(
        savedVoucher.preparedBy as any,
        `Voucher Rejected`,
        `Payment voucher ${savedVoucher.voucherNo} was rejected by Finance Approver. Reason: ${dto.reason}`,
      );
    }

    return savedVoucher;
  }

  // Request Revision for Voucher (srcc_finance / Finance Approver only)
  async requestVoucherRevision(
    id: string,
    dto: VoucherRevisionDto,
    userId: string,
  ): Promise<PaymentVoucherDocument> {
    const voucher = await this.getVoucherById(id);
    if (voucher.status !== PaymentVoucherStatus.PENDING_FINANCE_APPROVAL) {
      throw new BadRequestException('Voucher is not pending approval');
    }

    voucher.status = PaymentVoucherStatus.REVISION_REQUESTED;
    voucher.revision = {
      requestedBy: new Types.ObjectId(userId) as any,
      requestedAt: new Date(),
      comment: dto.comment,
    };
    voucher.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Revision Requested by Finance Approver',
      actionAt: new Date(),
      comments: dto.comment,
    });

    const savedVoucher = await voucher.save();

    // Notify checker
    if (savedVoucher.preparedBy) {
      await this.notifyUser(
        savedVoucher.preparedBy as any,
        `Voucher: Revision Required`,
        `Payment voucher ${savedVoucher.voucherNo} requires corrections. Comments: ${dto.comment}`,
      );
    }

    return savedVoucher;
  }

  // Mark Paid (Finance only - srcc_checker or srcc_finance)
  async payVoucher(id: string, dto: PayVoucherDto, userId: string): Promise<PaymentVoucherDocument> {
    const voucher = await this.getVoucherById(id);
    if (voucher.status !== PaymentVoucherStatus.APPROVED) {
      throw new BadRequestException('Voucher is not approved for payment');
    }

    voucher.status = PaymentVoucherStatus.PAID;
    voucher.payment = {
      paidBy: new Types.ObjectId(userId) as any,
      paidAt: new Date(),
      transactionId: dto.transactionId || '',
      paymentMethod: dto.paymentMethod || 'Bank Transfer',
      reference: dto.reference || '',
      paymentAdviceUrl: dto.paymentAdviceUrl,
    };
    voucher.auditTrail.push({
      actionBy: new Types.ObjectId(userId) as any,
      action: 'Marked Paid',
      actionAt: new Date(),
      comments: `Voucher paid. Reference: ${dto.reference || 'N/A'}. Advice document uploaded.`,
    });

    const savedVoucher = await voucher.save();

    // Retrieve PM
    const request: any = savedVoucher.paymentRequestId;
    if (request && request.requestedBy) {
      // Notify requester (PM)
      await this.notifyUser(
        request.requestedBy._id,
        `Payment Processed`,
        `Your payment request of ${request.amount} ${request.currency} has been paid. Payment Advice is available for download: ${dto.paymentAdviceUrl}`,
      );
    }

    // Notify HODs
    await this.notifyRole(
      'hod',
      `Payment Processed`,
      `Payment voucher ${savedVoucher.voucherNo} for ${savedVoucher.amount} KES has been marked as paid.`,
    );

    return savedVoucher;
  }
}
