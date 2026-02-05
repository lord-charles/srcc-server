import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Project } from '../schemas/project.schema';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  CreatePaymentDto,
  InvoiceApprovalDto,
  InvoiceRejectionDto,
  InvoiceRevisionDto,
} from '../dto/invoice.dto';
import { NotificationService } from '../../notifications/services/notification.service';
import { User, UserDocument } from 'src/modules/auth/schemas/user.schema';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  private async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const count = await this.invoiceModel.countDocuments({
      invoiceNumber: new RegExp(`^INV-${year}`),
    });
    return `INV-${year}-${(count + 1).toString().padStart(3, '0')}`;
  }

  private calculateTotals(items: any[]): {
    subtotal: number;
    totalTax: number;
    totalAmount: number;
  } {
    const subtotal = items.reduce(
      (sum, item) => sum + item.amount * item.quantity,
      0,
    );
    const totalTax = items.reduce(
      (sum, item) => sum + (item.amount * item.quantity * item.taxRate) / 100,
      0,
    );
    return {
      subtotal,
      totalTax,
      totalAmount: subtotal + totalTax,
    };
  }

  private async notifyInvoiceRequestHandlers(invoice: Invoice): Promise<void> {
    try {
      // Find all users with srcc_invoice_request role
      const invoiceRequestHandlers = await this.userModel.find({
        roles: { $in: ['srcc_invoice_request'] },
        status: 'active', // Only notify active users
      });

      if (invoiceRequestHandlers.length === 0) {
        console.log('No users found with srcc_invoice_request role');
        return;
      }

      const project = await this.projectModel.findById(invoice.projectId);
      if (!project) {
        throw new NotFoundException('Project not found');
      }

      const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailSubject = `New Invoice Request - ${project.name}`;
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">New Invoice Request Submitted</h2>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #34495e; margin-top: 0;">Invoice Details</h3>
              <p><strong>Project Name:</strong> ${project.name}</p>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date Submitted:</strong> ${formattedDate}</p>
              <p><strong>Status:</strong> PENDING APPROVAL</p>
            </div>

            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #34495e; margin-top: 0;">Financial Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0;"><strong>Subtotal:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">${invoice.currency} ${invoice.subtotal.toLocaleString()}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0;"><strong>Tax:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">${invoice.currency} ${invoice.totalTax.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
                  <td style="padding: 8px 0; text-align: right;"><strong>${invoice.currency} ${invoice.totalAmount.toLocaleString()}</strong></td>
                </tr>
              </table>
            </div>

            <div style="background-color: white; padding: 15px; border-radius: 5px;">
              <p style="color: #7f8c8d; font-size: 12px; margin: 0;">
                This is an automated message from the SRCC Invoice Management System. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `;

      const smsMessage = `SRCC: New invoice request submitted for ${project.name} (${invoice.invoiceNumber}) - ${invoice.currency} ${invoice.totalAmount.toLocaleString()}. Please review in the portal.`;

      // Send notifications to all invoice request handlers
      const notificationPromises = invoiceRequestHandlers.map(
        async (handler) => {
          try {
            // Send email
            const emailPromise = this.notificationService.sendEmail(
              handler.email,
              emailSubject,
              emailMessage,
            );

            // Send SMS if phone number is available
            const smsPromise = handler.phoneNumber
              ? this.notificationService.sendSMS(
                  handler.phoneNumber,
                  smsMessage,
                )
              : Promise.resolve(true);

            await Promise.all([emailPromise, smsPromise]);

            console.log(
              `Notified invoice request handler: ${handler.firstName} ${handler.lastName} (${handler.email})`,
            );
          } catch (error) {
            console.error(`Failed to notify ${handler.email}:`, error.message);
          }
        },
      );

      await Promise.all(notificationPromises);
      console.log(
        `Successfully notified ${invoiceRequestHandlers.length} invoice request handlers`,
      );
    } catch (error) {
      console.error('Error notifying invoice request handlers:', error.message);
      // Don't throw error to prevent invoice submission from failing
    }
  }

  private async notifyStakeholders(
    invoice: Invoice,
    action: string,
    comments?: string,
  ): Promise<void> {
    const project = await this.projectModel.findById(invoice.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [creator, projectManager] = await Promise.all([
      this.userModel.findById(invoice.createdBy),
      this.userModel.findById(project.projectManagerId),
    ]);

    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailSubject = `${project.name} - Invoice ${action} Notification`;
    const baseMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Invoice ${action}</h2>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Invoice Details</h3>
            <p><strong>Project Name:</strong> ${project.name}</p>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Status:</strong> ${invoice.status.replace(/_/g, ' ').toUpperCase()}</p>
          </div>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Financial Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0;"><strong>Subtotal:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.currency} ${invoice.subtotal.toLocaleString()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0;"><strong>Tax:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.currency} ${invoice.totalTax.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.currency} ${invoice.totalAmount.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          ${
            comments
              ? `
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin-top: 0;">Comments</h3>
            <p>${comments}</p>
          </div>
          `
              : ''
          }

          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            
            <p style="color: #7f8c8d; font-size: 12px; margin-top: 20px;">
              This is an automated message from the SRCC Invoice Management System. Please do not reply to this email.
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
  }

  async create(
    userId: Types.ObjectId,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    const project = await this.projectModel.findById(dto.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Calculate tax amount for each item
    const itemsWithTax = dto.items.map((item) => ({
      ...item,
      taxAmount: (item.amount * item.quantity * item.taxRate) / 100,
    }));

    const totals = this.calculateTotals(dto.items);
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = new this.invoiceModel({
      ...dto,
      items: itemsWithTax,
      ...totals,
      invoiceNumber,
      status: 'draft',
      issuedBy: userId,
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

    const savedInvoice = await invoice.save();

    await this.projectModel.findByIdAndUpdate(dto.projectId, {
      $push: { invoices: savedInvoice._id },
    });

    // Notify stakeholders
    await this.notifyStakeholders(savedInvoice, 'Created');

    return savedInvoice;
  }

  async findOne(id: Types.ObjectId): Promise<Invoice> {
    const invoice = await this.invoiceModel
      .findById(id)
      .populate({
        path: 'issuedBy',
        select: 'firstName lastName email phoneNumber',
      })
      .populate('projectId')
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email phoneNumber',
      })
      .populate({
        path: 'updatedBy',
        select: 'firstName lastName email phoneNumber',
      })
      .exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async update(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be updated');
    }

    const totals = this.calculateTotals(dto.items);

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        ...totals,
        updatedBy: userId,
        $push: {
          auditTrail: {
            action: 'UPDATED',
            performedBy: userId,
            performedAt: new Date(),
            details: { items: dto.items },
          },
        },
      },
      { new: true },
    );

    return updatedInvoice;
  }

  async submitForApproval(
    id: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== 'draft' && invoice.status !== 'revision_requested') {
      throw new BadRequestException(
        'Only drafts can be submitted for approval',
      );
    }

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        status: 'pending_approval',
        updatedBy: userId,
        $push: {
          auditTrail: {
            action: 'SUBMITTED_FOR_APPROVAL',
            performedBy: userId,
            performedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    // Notify stakeholders
    await this.notifyStakeholders(updatedInvoice, 'Submitted for Approval');

    // Notify users with srcc_invoice_request role
    await this.notifyInvoiceRequestHandlers(updatedInvoice);

    return updatedInvoice;
  }

  async approve(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: InvoiceApprovalDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== 'pending_approval') {
      throw new BadRequestException('Invoice is not pending approval');
    }

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        updatedBy: userId,
        approval: {
          approvedBy: userId,
          approvedAt: new Date(),
          comments: dto.comments,
        },
        $push: {
          auditTrail: {
            action: 'APPROVED',
            performedBy: userId,
            performedAt: new Date(),
            details: { comments: dto.comments },
          },
        },
      },
      { new: true },
    );

    // Notify stakeholders
    await this.notifyStakeholders(updatedInvoice, 'Approved', dto.comments);

    return updatedInvoice;
  }

  async reject(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: InvoiceRejectionDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== 'pending_approval') {
      throw new BadRequestException('Invoice is not pending approval');
    }

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        updatedBy: userId,
        rejection: {
          rejectedBy: userId,
          rejectedAt: new Date(),
          reason: dto.reason,
        },
        $push: {
          auditTrail: {
            action: 'REJECTED',
            performedBy: userId,
            performedAt: new Date(),
            details: { reason: dto.reason },
          },
        },
      },
      { new: true },
    );

    // Notify stakeholders
    await this.notifyStakeholders(updatedInvoice, 'Rejected', dto.reason);

    return updatedInvoice;
  }

  async requestRevision(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: InvoiceRevisionDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (!invoice.status.startsWith('pending_')) {
      throw new BadRequestException(
        'Invoice must be in pending approval status to request revision',
      );
    }

    // Store the current status and level to return to after revision
    const currentStatus = invoice.status;
    const currentLevel = this.getApprovalLevel(currentStatus);

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
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
      updatedInvoice,
      'Revision Requested',
      dto.comments,
    );

    return updatedInvoice;
  }

  private getApprovalLevel(status: string): string {
    const statusToLevel = {
      pending_approval: 'approver',
      pending_payment: 'finance',
    };
    return statusToLevel[status] || 'approver';
  }

  async recordPayment(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: CreatePaymentDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    // if (invoice.status !== 'approved' && invoice.status !== 'partially_paid') {
    //   throw new BadRequestException(
    //     'Invoice must be approved before recording payment',
    //   );
    // }

    const totalPaid =
      invoice.payments.reduce((sum, payment) => sum + payment.amountPaid, 0) +
      dto.amountPaid;
    const newStatus =
      totalPaid >= invoice.totalAmount ? 'paid' : 'partially_paid';

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        updatedBy: userId,
        $push: {
          payments: dto,
          auditTrail: {
            action: 'PAYMENT_RECORDED',
            performedBy: userId,
            performedAt: new Date(),
            details: { payment: dto },
          },
        },
      },
      { new: true },
    );

    // Notify stakeholders
    await this.notifyStakeholders(
      updatedInvoice,
      'Payment Recorded',
      `Payment of ${invoice.currency} ${dto.amountPaid.toLocaleString()} recorded. Invoice is now ${newStatus.replace('_', ' ')}.`,
    );

    return updatedInvoice;
  }

  async findByProject(projectId: Types.ObjectId): Promise<Invoice[]> {
    return this.invoiceModel.find({ projectId }).sort({ invoiceDate: -1 });
  }

  /**
   * Attach or update the actualInvoice URL for an invoice
   */
  async attachOrUpdateActualInvoice(
    id: Types.ObjectId,
    url: string,
    userId: any,
  ): Promise<Invoice> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    invoice.actualInvoice = url;
    invoice.updatedBy = userId;
    invoice.auditTrail.push({
      action: 'ACTUAL_INVOICE_UPDATED',
      performedBy: userId,
      performedAt: new Date(),
      details: { actualInvoice: url },
    });
    await invoice.save();
    return invoice;
  }

  async markAsOverdue(): Promise<void> {
    const now = new Date();
    await this.invoiceModel.updateMany(
      {
        status: { $in: ['approved', 'partially_paid'] },
        dueDate: { $lt: now },
      },
      {
        status: 'overdue',
        $push: {
          auditTrail: {
            action: 'MARKED_OVERDUE',
            performedAt: now,
            details: { dueDate: '$dueDate' },
          },
        },
      },
    );
  }
}
