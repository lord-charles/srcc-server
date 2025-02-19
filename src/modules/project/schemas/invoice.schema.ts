import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ _id: false })
class InvoiceItem {
  @ApiProperty({ description: 'Description of the item or service', example: 'Software Development Services - Sprint 1' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ description: 'Quantity of items', example: 160 })
  @Prop({ required: true, min: 0 })
  quantity: number;


  @ApiProperty({ description: 'Total amount for this item', example: 800000 })
  @Prop({ required: true, min: 0 })
  amount: number;

  @ApiProperty({ description: 'Tax rate applied to this item (%)', example: 16 })
  @Prop({ required: true, default: 0, min: 0, max: 100 })
  taxRate: number;

  @ApiProperty({ description: 'Tax amount for this item', example: 128000 })
  @Prop({ required: true, default: 0, min: 0 })
  taxAmount: number;
}

@Schema({ _id: false })
class PaymentDetails {
  @ApiProperty({ description: 'Payment method', example: 'bank_transfer' })
  @Prop({ 
    required: true,
    enum: ['bank_transfer', 'cheque', 'mpesa', 'cash'],
    default: 'bank_transfer'
  })
  method: string;

  @ApiProperty({ description: 'Bank name if applicable', example: 'Equity Bank' })
  @Prop()
  bankName?: string;

  @ApiProperty({ description: 'Account number if applicable', example: '1234567890' })
  @Prop()
  accountNumber?: string;

  @ApiProperty({ description: 'Bank branch code if applicable', example: '001' })
  @Prop()
  branchCode?: string;

  @ApiProperty({ description: 'Payment reference number', example: 'TRX123456' })
  @Prop()
  referenceNumber?: string;

  @ApiProperty({ description: 'Date payment was made' })
  @Prop()
  paidAt?: Date;

  @ApiProperty({ description: 'Amount paid', example: 928000 })
  @Prop({ min: 0 })
  amountPaid?: number;

  @ApiProperty({ description: 'Payment receipt URL' })
  @Prop()
  receiptUrl?: string;
}

@Schema({ timestamps: true })
export class Invoice {
  @ApiProperty({ description: 'Reference to the project' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Invoice number', example: 'INV-2025-001' })
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @ApiProperty({ description: 'Reference to the organization/consultant raising the invoice' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  issuedBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Invoice date' })
  @Prop({ required: true })
  invoiceDate: Date;

  @ApiProperty({ description: 'Due date for payment' })
  @Prop({ required: true })
  dueDate: Date;

  @ApiProperty({ description: 'Invoice items' })
  @Prop({ type: [InvoiceItem], required: true })
  items: InvoiceItem[];

  @ApiProperty({ description: 'Subtotal before tax', example: 800000 })
  @Prop({ required: true, min: 0 })
  subtotal: number;

  @ApiProperty({ description: 'Total tax amount', example: 128000 })
  @Prop({ required: true, min: 0 })
  totalTax: number;

  @ApiProperty({ description: 'Total amount including tax', example: 928000 })
  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @ApiProperty({ description: 'Currency', example: 'KES' })
  @Prop({ required: true, default: 'KES' })
  currency: string;

  @ApiProperty({ description: 'Invoice status' })
  @Prop({
    required: true,
    enum: [
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'sent',
      'partially_paid',
      'paid',
      'overdue',
      'cancelled'
    ],
    default: 'draft'
  })
  status: string;

  @ApiProperty({ description: 'Payment terms', example: 'Net 30' })
  @Prop({ required: true })
  paymentTerms: string;

  @ApiProperty({ description: 'Notes to the client' })
  @Prop()
  notes?: string;

  @ApiProperty({ description: 'Internal notes' })
  @Prop()
  internalNotes?: string;

  @ApiProperty({ description: 'Payment tracking' })
  @Prop({ type: [PaymentDetails], default: [] })
  payments: PaymentDetails[];

  @ApiProperty({ description: 'Approval details' })
  @Prop({
    type: {
      approvedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      comments: String
    },
    _id: false
  })
  approval?: {
    approvedBy: MongooseSchema.Types.ObjectId;
    approvedAt: Date;
    comments?: string;
  };

  @ApiProperty({ description: 'Rejection details' })
  @Prop({
    type: {
      rejectedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      rejectedAt: Date,
      reason: String
    },
    _id: false
  })
  rejection?: {
    rejectedBy: MongooseSchema.Types.ObjectId;
    rejectedAt: Date;
    reason: string;
  };

  @ApiProperty({ description: 'User who created the invoice' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'User who last updated the invoice' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Date when the invoice was sent to the client' })
  @Prop()
  sentAt?: Date;

  @ApiProperty({ description: 'Audit trail of invoice changes' })
  @Prop([{
    action: { type: String, required: true },
    performedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, required: true },
    details: { type: Object }
  }])
  auditTrail: {
    action: string;
    performedBy: MongooseSchema.Types.ObjectId;
    performedAt: Date;
    details?: Record<string, any>;
  }[];
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Add indexes for better query performance
InvoiceSchema.index({ projectId: 1, invoiceNumber: 1 });
InvoiceSchema.index({ issuedBy: 1, invoiceDate: -1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ 'payments.paidAt': 1 });
