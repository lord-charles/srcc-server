import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Project } from '../schemas/project.schema';
import { CreateInvoiceDto, UpdateInvoiceDto, CreatePaymentDto, InvoiceApprovalDto, InvoiceRejectionDto } from '../dto/invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  private async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const count = await this.invoiceModel.countDocuments({
      invoiceNumber: new RegExp(`^INV-${year}`)
    });
    return `INV-${year}-${(count + 1).toString().padStart(3, '0')}`;
  }

  private calculateTotals(items: any[]): { subtotal: number; totalTax: number; totalAmount: number } {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = items.reduce((sum, item) => sum + (item.amount * item.taxRate / 100), 0);
    return {
      subtotal,
      totalTax,
      totalAmount: subtotal + totalTax
    };
  }

  async create(userId: Types.ObjectId, dto: CreateInvoiceDto): Promise<Invoice> {
    const project = await this.projectModel.findById(dto.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totals = this.calculateTotals(dto.items);
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = new this.invoiceModel({
      ...dto,
      ...totals,
      invoiceNumber,
      status: 'draft',
      issuedBy:userId ,
      createdBy: userId,
      updatedBy: userId,
      auditTrail: [{
        action: 'CREATED',
        performedBy: userId,
        performedAt: new Date(),
        details: { status: 'draft' }
      }]
    });

    const savedInvoice = await invoice.save();
    
    await this.projectModel.findByIdAndUpdate(
      dto.projectId,
      { $push: { invoices: savedInvoice._id } }
    );

    return savedInvoice;
  }

  async findOne(id: Types.ObjectId): Promise<Invoice> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async update(id: Types.ObjectId, userId: Types.ObjectId, dto: UpdateInvoiceDto): Promise<Invoice> {
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
            details: { items: dto.items }
          }
        }
      },
      { new: true }
    );

    return updatedInvoice;
  }

  async submitForApproval(id: Types.ObjectId, userId: Types.ObjectId): Promise<Invoice> {
    const invoice = await this.findOne(id);
    
    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be submitted for approval');
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
            performedAt: new Date()
          }
        }
      },
      { new: true }
    );

    return updatedInvoice;
  }

  async approve(id: Types.ObjectId, userId: Types.ObjectId, dto: InvoiceApprovalDto): Promise<Invoice> {
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
          comments: dto.comments
        },
        $push: {
          auditTrail: {
            action: 'APPROVED',
            performedBy: userId,
            performedAt: new Date(),
            details: { comments: dto.comments }
          }
        }
      },
      { new: true }
    );

    return updatedInvoice;
  }

  async reject(id: Types.ObjectId, userId: Types.ObjectId, dto: InvoiceRejectionDto): Promise<Invoice> {
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
          reason: dto.reason
        },
        $push: {
          auditTrail: {
            action: 'REJECTED',
            performedBy: userId,
            performedAt: new Date(),
            details: { reason: dto.reason }
          }
        }
      },
      { new: true }
    );

    return updatedInvoice;
  }

  async recordPayment(id: Types.ObjectId, userId: Types.ObjectId, dto: CreatePaymentDto): Promise<Invoice> {
    const invoice = await this.findOne(id);
    
    if (invoice.status !== 'approved' && invoice.status !== 'partially_paid') {
      throw new BadRequestException('Invoice must be approved before recording payment');
    }

    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaid, 0) + dto.amountPaid;
    const newStatus = totalPaid >= invoice.totalAmount ? 'paid' : 'partially_paid';

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
            details: { payment: dto }
          }
        }
      },
      { new: true }
    );

    return updatedInvoice;
  }

  async findByProject(projectId: Types.ObjectId): Promise<Invoice[]> {
    return this.invoiceModel.find({ projectId }).sort({ invoiceDate: -1 });
  }

  async markAsOverdue(): Promise<void> {
    const now = new Date();
    await this.invoiceModel.updateMany(
      {
        status: { $in: ['approved', 'partially_paid'] },
        dueDate: { $lt: now }
      },
      {
        status: 'overdue',
        $push: {
          auditTrail: {
            action: 'MARKED_OVERDUE',
            performedAt: now,
            details: { dueDate: '$dueDate' }
          }
        }
      }
    );
  }
}
