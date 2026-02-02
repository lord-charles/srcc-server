import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types as MongooseSchema } from 'mongoose';

export type BudgetDocument = Budget & Document;

// Budget Item Schema for both internal and external items
@Schema({ _id: false })
class BudgetItem {
  @ApiProperty({
    example: 'Employee Salary',
    description: 'Name of the budget item',
  })
  @Prop({ required: true })
  name: string;

  @ApiProperty({
    example: 'Monthly salary for senior developer',
    description: 'Description of the budget item',
  })
  @Prop({ required: true })
  description: string;

  @ApiProperty({
    example: 500000,
    description: 'Estimated amount for this item',
  })
  @Prop({ required: true })
  estimatedAmount: number;

  @ApiProperty({ example: 450000, description: 'Actual amount spent' })
  @Prop({ default: 0 })
  actualAmount: number;

  @ApiProperty({
    example: ['salary', 'internal'],
    description: 'Tags to categorize the budget item',
  })
  @Prop({ type: [String], default: [] })
  tags: string[];

  @ApiProperty({ example: 'monthly', description: 'Frequency of the expense' })
  @Prop({
    enum: ['one-time', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  })
  frequency: string;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Start date for recurring items',
  })
  @Prop()
  startDate?: Date;

  @ApiProperty({
    example: '2024-12-31',
    description: 'End date for recurring items',
  })
  @Prop()
  endDate?: Date;

  @ApiProperty({
    example: { rate: 5000, units: 'hours', quantity: 160 },
    description: 'Additional metadata for calculations',
  })
  @Prop({ type: MongooseSchema.ObjectId })
  metadata?: Record<string, any>;

  @ApiProperty({
    example: '65f1a2b3c4d5e6f7a8b9c0d1',
    description: 'Reference to the milestone this item belongs to',
  })
  @Prop()
  milestoneId?: string;
}

// Budget Category Schema to group related items
@Schema({ _id: false })
class BudgetCategory {
  @ApiProperty({
    example: 'Human Resources',
    description: 'Name of the budget category',
  })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Description of what this category covers' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ description: 'Budget items in this category' })
  @Prop({ type: [BudgetItem], default: [] })
  items: BudgetItem[];

  @ApiProperty({ example: ['internal'], description: 'Tags for the category' })
  @Prop({ type: [String], default: [] })
  tags: string[];
}

@Schema({ timestamps: true })
export class Budget extends Document {
  @ApiProperty({ description: 'Reference to the project' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.ObjectId;

  @ApiProperty({ description: 'Internal budget categories' })
  @Prop({ type: [BudgetCategory], default: [] })
  internalCategories: BudgetCategory[];

  @ApiProperty({ description: 'External budget categories' })
  @Prop({ type: [BudgetCategory], default: [] })
  externalCategories: BudgetCategory[];

  @ApiProperty({ example: 'KES', description: 'Currency for all amounts' })
  @Prop({ required: true, default: 'KES' })
  currency: string;

  @ApiProperty({ description: 'Total internal budget' })
  @Prop({ required: true, default: 0 })
  totalInternalBudget: number;

  @ApiProperty({ description: 'Total external budget' })
  @Prop({ required: true, default: 0 })
  totalExternalBudget: number;

  @ApiProperty({ description: 'Total actual internal spend' })
  @Prop({ required: true, default: 0 })
  totalInternalSpent: number;

  @ApiProperty({ description: 'Total actual external spend' })
  @Prop({ required: true, default: 0 })
  totalExternalSpent: number;

  @ApiProperty({ description: 'Budget version number' })
  @Prop({ required: true, default: 1 })
  version: number;

  @ApiProperty({ description: 'Budget status' })
  @Prop({
    required: true,
    enum: [
      'draft',
      'pending_checker_approval',
      'pending_manager_approval',
      'pending_finance_approval',
      'approved',
      'rejected',
      'revision_requested',
    ],
    default: 'draft',
  })
  status: string;

  @ApiProperty({ description: 'Approval workflow tracking' })
  @Prop({
    type: {
      checkerApprovals: [
        {
          approverId: {
            type: MongooseSchema.ObjectId,
            ref: 'User',
            required: true,
          },
          approvedAt: { type: Date, required: true },
          comments: String,
          attachments: [String],
        },
      ],
      managerApprovals: [
        {
          approverId: {
            type: MongooseSchema.ObjectId,
            ref: 'User',
            required: true,
          },
          approvedAt: { type: Date, required: true },
          comments: String,
          attachments: [String],
        },
      ],
      financeApprovals: [
        {
          approverId: {
            type: MongooseSchema.ObjectId,
            ref: 'User',
            required: true,
          },
          approvedAt: { type: Date, required: true },
          comments: String,
          attachments: [String],
        },
      ],
    },
    _id: false,
  })
  approvalFlow: {
    checkerApprovals: {
      approverId: MongooseSchema.ObjectId;
      approvedAt: Date;
      comments?: string;
      attachments?: string[];
    }[];
    managerApprovals: {
      approverId: MongooseSchema.ObjectId;
      approvedAt: Date;
      comments?: string;
      attachments?: string[];
    }[];
    financeApprovals: {
      approverId: MongooseSchema.ObjectId;
      approvedAt: Date;
      comments?: string;
      attachments?: string[];
    }[];
  };

  @ApiProperty({ description: 'Current approval level deadline' })
  @Prop()
  currentLevelDeadline?: Date;

  @ApiProperty({ description: 'Rejection details if budget was rejected' })
  @Prop({
    type: {
      rejectedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
      rejectedAt: Date,
      reason: String,
      level: {
        type: String,
        enum: ['checker', 'manager', 'finance'],
      },
    },
    _id: false,
  })
  rejectionDetails?: {
    rejectedBy: MongooseSchema.ObjectId;
    rejectedAt: Date;
    reason: string;
    level: string;
  };

  @ApiProperty({ description: 'Revision request details' })
  @Prop({
    type: {
      requestedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
      requestedAt: Date,
      comments: String,
      changes: [String],
      returnToStatus: {
        type: String,
        enum: [
          'draft',
          'pending_checker_approval',
          'pending_manager_approval',
          'pending_finance_approval',
        ],
      },
      returnToLevel: {
        type: String,
        enum: ['checker', 'manager', 'finance'],
      },
    },
    _id: false,
  })
  revisionRequest?: {
    requestedBy: MongooseSchema.ObjectId;
    requestedAt: Date;
    comments: string;
    changes: string[];
    returnToStatus: string;
    returnToLevel: string;
  };

  @ApiProperty({ description: 'User who created the budget' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.ObjectId;

  @ApiProperty({ description: 'User who last updated the budget' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'User', required: true })
  updatedBy: MongooseSchema.ObjectId;

  @ApiProperty({ description: 'Notes or comments about the budget' })
  @Prop({ type: String })
  notes?: string;

  @ApiProperty({ description: 'Audit trail of all budget changes' })
  @Prop([
    {
      action: { type: String, required: true },
      performedBy: {
        type: MongooseSchema.ObjectId,
        ref: 'User',
        required: true,
      },
      performedAt: { type: Date, required: true },
      details: { type: Object },
      previousValues: { type: Object },
    },
  ])
  auditTrail: {
    action: string;
    performedBy: MongooseSchema.ObjectId;
    performedAt: Date;
    details?: Record<string, any>;
    previousValues?: Record<string, any>;
  }[];

  @ApiProperty({ description: 'User who approved the budget' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'User' })
  approvedBy?: MongooseSchema.ObjectId;

  @ApiProperty({ description: 'Approval date' })
  @Prop()
  approvedAt?: Date;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
