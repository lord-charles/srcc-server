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
  AddCreditNoteDto,
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

  // Notify invoice approvers (invoice_approver role) for the project's department
  private async notifyInvoiceApprovers(invoice: Invoice): Promise<void> {
    try {
      const project = await this.projectModel.findById(invoice.projectId);
      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Find all active users with invoice_approver role for this department
      const approvers = await this.userModel.find({
        roles: { $in: ['invoice_approver'] },
        status: 'active',
        department: project.department,
      });

      if (approvers.length === 0) {
        console.log(
          `No invoice approvers found for department ${project.department}`,
        );
        return;
      }

      const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailSubject = `Invoice Pending Approval - ${project.name}`;
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Invoice Pending Department Approval</h2>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #34495e; margin-top: 0;">Invoice Details</h3>
              <p><strong>Project Name:</strong> ${project.name}</p>
              <p><strong>Project Department:</strong> ${project.department}</p>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date Submitted:</strong> ${formattedDate}</p>
              <p><strong>Status:</strong> PENDING INVOICE APPROVER</p>
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

      const smsMessage = `SRCC: Invoice ${invoice.invoiceNumber} for ${project.name} is pending department approval - ${invoice.currency} ${invoice.totalAmount.toLocaleString()}. Please review in the portal.`;

      const notificationPromises = approvers.map(async (approver) => {
        try {
          const emailPromise = this.notificationService.sendEmail(
            approver.email,
            emailSubject,
            emailMessage,
          );

          const smsPromise = approver.phoneNumber
            ? this.notificationService.sendSMS(approver.phoneNumber, smsMessage)
            : Promise.resolve(true);

          await Promise.all([emailPromise, smsPromise]);

          console.log(
            `Notified invoice approver: ${approver.firstName} ${approver.lastName} (${approver.email}) for department ${project.department}`,
          );
        } catch (error) {
          console.error(`Failed to notify ${approver.email}:`, error.message);
        }
      });

      await Promise.all(notificationPromises);
      console.log(
        `Successfully notified ${approvers.length} invoice approvers for department ${project.department}`,
      );
    } catch (error) {
      console.error('Error notifying invoice approvers:', error.message);
    }
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
              <p><strong>Status:</strong> PENDING INVOICE ATTACHMENT</p>
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

  private async notifyInvoiceAttachmentHandlers(
    invoice: Invoice,
  ): Promise<void> {
    try {
      // Find all users with srcc_invoice_request role
      const invoiceAttachmentHandlers = await this.userModel.find({
        roles: { $in: ['srcc_invoice_request'] },
        status: 'active', // Only notify active users
      });

      if (invoiceAttachmentHandlers.length === 0) {
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

      const emailSubject = `Invoice Pending Attachment - ${project.name}`;
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Invoice Pending Actual Document Attachment</h2>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #34495e; margin-top: 0;">Invoice Details</h3>
              <p><strong>Project Name:</strong> ${project.name}</p>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date Submitted:</strong> ${formattedDate}</p>
              <p><strong>Status:</strong> PENDING INVOICE ATTACHMENT</p>
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
                Please attach the actual invoice document in the portal. This is an automated message from the SRCC Invoice Management System.
              </p>
            </div>
          </div>
        </div>
      `;

      const smsMessage = `SRCC: Invoice ${invoice.invoiceNumber} for ${project.name} is pending actual document attachment - ${invoice.currency} ${invoice.totalAmount.toLocaleString()}. Please attach in the portal.`;

      // Send notifications to all invoice attachment handlers
      const notificationPromises = invoiceAttachmentHandlers.map(
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
              `Notified invoice attachment handler: ${handler.firstName} ${handler.lastName} (${handler.email})`,
            );
          } catch (error) {
            console.error(`Failed to notify ${handler.email}:`, error.message);
          }
        },
      );

      await Promise.all(notificationPromises);
      console.log(
        `Successfully notified ${invoiceAttachmentHandlers.length} invoice attachment handlers`,
      );
    } catch (error) {
      console.error(
        'Error notifying invoice attachment handlers:',
        error.message,
      );
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

    // Allow editing in draft or revision_requested status
    if (invoice.status !== 'draft' && invoice.status !== 'revision_requested') {
      throw new BadRequestException(
        'Only draft or revision-requested invoices can be updated',
      );
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
            details: {
              items: dto.items,
              previousStatus: invoice.status,
            },
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
        'Only drafts or revised invoices can be submitted',
      );
    }

    // Ensure there is at least one active invoice approver for this project's department
    const project = await this.projectModel.findById(invoice.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const departmentApprovers = await this.userModel.countDocuments({
      roles: { $in: ['invoice_approver'] },
      status: 'active',
      department: project.department,
    });

    if (departmentApprovers === 0) {
      throw new BadRequestException(
        `No invoice approver available for department ${project.department}. Please assign at least one approver before submitting the invoice.`,
      );
    }

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        status: 'pending_invoice_approver',
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
    await this.notifyStakeholders(
      updatedInvoice,
      'Submitted - Pending Invoice Approver',
    );

    // Notify department-specific invoice approvers
    await this.notifyInvoiceApprovers(updatedInvoice);

    return updatedInvoice;
  }

  async approve(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: InvoiceApprovalDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    // Stage 1: Department invoice approver moves invoice to pending_invoice_attachment
    if (invoice.status === 'pending_invoice_approver') {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.roles.includes('invoice_approver')) {
        throw new BadRequestException(
          'You do not have permission to approve invoices. Required role: invoice_approver',
        );
      }

      const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
        id,
        {
          status: 'pending_invoice_attachment',
          updatedBy: userId,
          $push: {
            auditTrail: {
              action: 'APPROVAL_GRANTED',
              performedBy: userId,
              performedAt: new Date(),
              details: { level: 'business_approval', comments: dto.comments },
            },
          },
        },
        { new: true },
      );

      await this.notifyStakeholders(
        updatedInvoice,
        'Approved by Invoice Approver - Pending Attachment',
        dto.comments,
      );

      // Notify srcc_invoice_request handlers to attach the invoice
      await this.notifyInvoiceAttachmentHandlers(updatedInvoice);

      return updatedInvoice;
    }

    // Stage 2: Final approval from pending_invoice_attachment to approved
    if (
      invoice.status !== 'pending_invoice_attachment' &&
      invoice.status !== 'approved'
    ) {
      throw new BadRequestException(
        'Invoice is not in a valid state for approval',
      );
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

    await this.notifyStakeholders(updatedInvoice, 'Approved', dto.comments);

    return updatedInvoice;
  }

  /**
   * Allow an invoice approver to request changes at the approver stage.
   * This sends the invoice back to draft with an audit entry and notifies the creator.
   */
  async approverRequestChanges(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    comments: string,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== 'pending_invoice_approver') {
      throw new BadRequestException(
        'Invoice must be pending invoice approver to request changes at this level',
      );
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.roles.includes('invoice_approver')) {
      throw new BadRequestException(
        'You do not have permission to request changes at this stage. Required role: invoice_approver',
      );
    }

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        status: 'revision_requested',
        updatedBy: userId,
        revisionRequest: {
          requestedBy: userId,
          requestedAt: new Date(),
          comments,
          changes: [],
          returnToStatus: 'pending_invoice_approver',
          returnToLevel: 'approver',
        },
        $push: {
          auditTrail: {
            action: 'REVISION_REQUESTED_BY_APPROVER',
            performedBy: userId,
            performedAt: new Date(),
            details: {
              comments,
              from: 'pending_invoice_approver',
              returnToStatus: 'pending_invoice_approver',
              level: 'approver',
            },
          },
        },
      },
      { new: true },
    );

    // Notify the invoice creator using the existing revision notification style
    await this.notifyInvoiceCreatorOfRevision(updatedInvoice, comments, []);

    // Notify other stakeholders as well
    await this.notifyStakeholders(
      updatedInvoice,
      'Revision Requested by Approver',
      comments,
    );

    return updatedInvoice;
  }

  async reject(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: InvoiceRejectionDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status !== 'pending_invoice_attachment') {
      throw new BadRequestException(
        'Invoice is not pending invoice attachment',
      );
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
    // Check if user has the required role
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.roles.includes('srcc_invoice_request')) {
      throw new BadRequestException(
        'You do not have permission to request invoice revisions. Required role: srcc_invoice_request',
      );
    }

    const invoice = await this.findOne(id);

    if (invoice.status !== 'pending_invoice_attachment') {
      throw new BadRequestException(
        'Invoice must be pending invoice attachment to request revision',
      );
    }

    // Store the current status to return to after revision
    const currentStatus = invoice.status;

    const updatedInvoice = await this.invoiceModel
      .findByIdAndUpdate(
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
            returnToLevel: 'invoice_attachment',
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
                returnToLevel: 'invoice_attachment',
              },
            },
          },
        },
        { new: true },
      )
      .populate('createdBy');

    // Notify the invoice creator about the revision request
    await this.notifyInvoiceCreatorOfRevision(
      updatedInvoice,
      dto.comments,
      dto.changes,
    );

    // Notify other stakeholders
    await this.notifyStakeholders(
      updatedInvoice,
      'Revision Requested',
      dto.comments,
    );

    return updatedInvoice;
  }

  private async notifyInvoiceCreatorOfRevision(
    invoice: Invoice,
    comments: string,
    changes: string[],
  ): Promise<void> {
    try {
      const creator = await this.userModel.findById(invoice.createdBy);
      if (!creator) {
        console.log('Invoice creator not found');
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

      const emailSubject = `Invoice Revision Requested - ${project.name}`;
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Invoice Revision Requested</h2>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #34495e; margin-top: 0;">Invoice Details</h3>
              <p><strong>Project Name:</strong> ${project.name}</p>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Status:</strong> REVISION REQUESTED</p>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">Revision Comments</h3>
              <p style="color: #856404;">${comments}</p>
            </div>

            ${
              changes && changes.length > 0
                ? `
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #34495e; margin-top: 0;">Requested Changes</h3>
              <ul style="color: #495057;">
                ${changes.map((change) => `<li>${change}</li>`).join('')}
              </ul>
            </div>
            `
                : ''
            }

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
                Please review the requested changes and resubmit the invoice. This is an automated message from the SRCC Invoice Management System.
              </p>
            </div>
          </div>
        </div>
      `;

      const smsMessage = `SRCC: Revision requested for invoice ${invoice.invoiceNumber} (${project.name}). Comments: ${comments.substring(0, 100)}${comments.length > 100 ? '...' : ''}. Please check your email for details.`;

      // Send email
      await this.notificationService.sendEmail(
        creator.email,
        emailSubject,
        emailMessage,
      );

      // Send SMS if phone number is available
      if (creator.phoneNumber) {
        await this.notificationService.sendSMS(creator.phoneNumber, smsMessage);
      }

      console.log(
        `Notified invoice creator: ${creator.firstName} ${creator.lastName} (${creator.email}) about revision request`,
      );
    } catch (error) {
      console.error(
        'Error notifying invoice creator of revision:',
        error.message,
      );
      // Don't throw error to prevent revision request from failing
    }
  }

  async recordPayment(
    id: Types.ObjectId,
    userId: Types.ObjectId,
    dto: CreatePaymentDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    const previousPaid = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amountPaid || 0),
      0,
    );
    const currentPaymentAmount = Number(dto.amountPaid || 0);
    const totalPaid = previousPaid + currentPaymentAmount;

    // Use a small tolerance to account for potential rounding issues when
    // comparing totals that include tax.
    const epsilon = 0.01;
    let newStatus: Invoice['status'];

    if (Math.abs(totalPaid - invoice.totalAmount) <= epsilon) {
      // Fully settled: requested amount (including tax) is covered
      newStatus = 'paid';
    } else if (totalPaid > 0 && totalPaid < invoice.totalAmount - epsilon) {
      // Some payment has been made, but less than requested amount
      newStatus = 'partially_paid';
    } else if (totalPaid > invoice.totalAmount + epsilon) {
      // Overpayment scenario – still treat as paid
      newStatus = 'paid';
    } else {
      // No effective payment recorded; keep existing status
      newStatus = invoice.status as Invoice['status'];
    }

    // Ensure we persist a numeric amountPaid in the payments array
    const paymentToStore = {
      ...dto,
      amountPaid: currentPaymentAmount,
    } as any;

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        updatedBy: userId,
        $push: {
          payments: paymentToStore,
          auditTrail: {
            action: 'PAYMENT_RECORDED',
            performedBy: userId,
            performedAt: new Date(),
            details: { payment: paymentToStore },
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
    return this.invoiceModel
      .find({ projectId })
      .populate('issuedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate({
        path: 'auditTrail.performedBy',
        select: 'firstName lastName email',
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async addCreditNote(
    id: Types.ObjectId,
    userId: string,
    dto: AddCreditNoteDto,
  ): Promise<Invoice> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const recordedBy = new Types.ObjectId(userId);

    // Initialise creditNotes if it doesn't exist (though schema has default [])
    if (!invoice.creditNotes) {
      invoice.creditNotes = [];
    }

    invoice.creditNotes.push({
      ...dto,
      issuedAt: new Date(),
      recordedBy,
    });

    // Update status if fully "paid" by credit notes and payments
    const totalPaid = (invoice.payments || []).reduce(
      (sum, p) => sum + (p.amountPaid || 0),
      0,
    );
    const totalCreditNotes = invoice.creditNotes.reduce(
      (sum, cn) => sum + cn.amount,
      0,
    );

    if (totalPaid + totalCreditNotes >= invoice.totalAmount) {
      invoice.status = 'paid';
    } else if (totalPaid + totalCreditNotes > 0) {
      invoice.status = 'partially_paid';
    }

    // Add to audit trail
    invoice.auditTrail.push({
      action: 'CREDIT_NOTE_ADDED',
      performedBy: recordedBy as any,
      performedAt: new Date(),
      details: { creditNote: dto },
    });

    await invoice.save();

    // Populate the populated fields after save
    return this.findOne(invoice._id as any);
  }

  /**
   * Attach or update the actualInvoice URL for an invoice
   * Only users with 'srcc_invoice_request' role can perform this action
   */
  async attachOrUpdateActualInvoice(
    id: Types.ObjectId,
    url: string,
    userId: any,
  ): Promise<Invoice> {
    // Check if user has the required role
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.roles.includes('srcc_invoice_request')) {
      throw new BadRequestException(
        'You do not have permission to attach invoice documents. Required role: srcc_invoice_request',
      );
    }

    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Update status to approved when actual invoice is attached
    invoice.actualInvoice = url;
    invoice.status = 'approved';
    invoice.updatedBy = userId;
    invoice.auditTrail.push({
      action: 'ACTUAL_INVOICE_ATTACHED',
      performedBy: userId,
      performedAt: new Date(),
      details: { actualInvoice: url },
    });

    await invoice.save();

    // Notify stakeholders that invoice has been approved with document attached
    await this.notifyStakeholders(
      invoice,
      'Approved - Invoice Document Attached',
      `The actual invoice document has been attached and the invoice is now approved.`,
    );

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
