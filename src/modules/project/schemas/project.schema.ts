import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @ApiProperty({
    example: 'Health System Upgrade',
    description: 'The name of the project',
  })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({
    example: 'SU',
    description: 'The department of the project',
  })
  @Prop({ required: true })
  department: string;

  @ApiProperty({
    example: 'A project to upgrade the health system infrastructure.',
    description: 'A brief description of the project',
  })
  @Prop({ required: true, trim: true })
  description: string;

  @ApiProperty({ description: 'Reference to the project budget' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Budget' })
  budgetId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ example: 'USD', description: 'Currency for the budget' })
  @Prop({ required: true, trim: true })
  currency: string;

  @ApiProperty({ example: '2024-01-01', description: 'Contract start date' })
  @Prop({ required: true })
  contractStartDate: Date;

  @ApiProperty({ example: '2025-12-31', description: 'Contract end date' })
  @Prop({ required: true })
  contractEndDate: Date;

  @ApiProperty({
    example: 20251231,
    description: 'Total project value',
  })
  @Prop({ required: true })
  totalProjectValue: number;

  @ApiProperty({
    example: 'Ministry of Health',
    description: 'The client or organization funding the project',
  })
  @Prop({ required: true, trim: true })
  client: string;

  @ApiProperty({
    example: 'active',
    description: 'Project status',
    enum: [
      'draft',
      'pending_approval',
      'active',
      'on_hold',
      'completed',
      'cancelled',
    ],
  })
  @Prop({
    required: true,
    enum: [
      'draft',
      'pending_approval',
      'active',
      'on_hold',
      'completed',
      'cancelled',
    ],
    default: 'draft',
  })
  status: string;

  @ApiProperty({ description: 'User who created the project' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'User who last updated the project' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Project manager reference' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
  })
  projectManagerId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Project manager contract reference' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Contract' })
  projectManagerContractId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Assistant project managers' })
  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        contractId: { type: MongooseSchema.Types.ObjectId, ref: 'Contract' },
        assignedDate: { type: Date, default: Date.now },
        responsibilities: [String],
      },
    ],
    default: [],
  })
  assistantProjectManagers?: {
    userId: MongooseSchema.Types.ObjectId;
    contractId?: MongooseSchema.Types.ObjectId;
    assignedDate: Date;
    responsibilities: string[];
  }[];

  @ApiProperty({ description: 'Team members assigned to the project' })
  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        startDate: { type: Date },
        endDate: { type: Date },
        responsibilities: [String],
      },
    ],
    required: false,
    default: [],
  })
  teamMembers?: {
    userId: MongooseSchema.Types.ObjectId;
    role: string;
    startDate: Date;
    endDate?: Date;
    responsibilities: string[];
  }[];

  @ApiProperty({ description: 'Team member contracts' })
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Contract' }],
    default: [],
  })
  teamMemberContracts: MongooseSchema.Types.ObjectId[];

  @ApiProperty({ description: 'Coach managers assigned to the project' })
  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        assignedDate: { type: Date, default: Date.now },
        responsibilities: [String],
      },
    ],
    default: [],
  })
  coachManagers?: {
    userId: MongooseSchema.Types.ObjectId;
    assignedDate: Date;
    responsibilities: string[];
  }[];

  @ApiProperty({ description: 'Coach assistants for the project' })
  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        assignedDate: { type: Date, default: Date.now },
        responsibilities: [String],
      },
    ],
    default: [],
  })
  coachAssistants?: {
    userId: MongooseSchema.Types.ObjectId;
    assignedDate: Date;
    responsibilities: string[];
  }[];

  @ApiProperty({ description: 'Coaches assigned to milestones within the project' })
  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        milestoneId: { type: MongooseSchema.Types.ObjectId },
        startDate: { type: Date },
        endDate: { type: Date },
        responsibilities: [String],
        contract: {
          rate: { type: Number, required: true },
          rateUnit: { type: String, enum: ['per_session', 'per_hour'], required: true },
          currency: { type: String, enum: ['KES', 'USD'], default: 'KES' },
          notes: { type: String },
        },
      },
    ],
    default: [],
  })
  coaches?: {
    userId: MongooseSchema.Types.ObjectId;
    milestoneId: MongooseSchema.Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    responsibilities: string[];
    contract: {
      rate: number;
      rateUnit: 'per_session' | 'per_hour';
      currency: 'KES' | 'USD';
      notes?: string;
    };
  }[];

  @ApiProperty({
    example: 'Public Procurement',
    description: 'The procurement method used',
  })
  @Prop({ required: true, trim: true })
  procurementMethod: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/example/project-proposal.pdf',
  })
  @Prop()
  projectProposalUrl?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/example/signed-contract.pdf',
  })
  @Prop({ required: true })
  signedContractUrl: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/example/execution-memo.pdf',
  })
  @Prop({ required: true })
  executionMemoUrl: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/example/signed-budget.pdf',
  })
  @Prop({ required: true })
  signedBudgetUrl: string;

  @ApiProperty({
    description: 'Document references for additional uploads',
    type: [Object],
  })
  @Prop({
    type: [
      {
        type: {
          type: String,
          required: true,
          enum: ['contract', 'budget', 'memo', 'report', 'other'],
        },
        url: { type: String, required: true },
        name: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: {
          type: MongooseSchema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      },
    ],
  })
  documents: {
    type: string;
    url: string;
    name: string;
    uploadedAt: Date;
    uploadedBy: MongooseSchema.Types.ObjectId;
  }[];

  @ApiProperty({
    example: 'High',
    description: 'Risk level assessment for the project',
    enum: ['Low', 'Medium', 'High'],
  })
  @Prop({ enum: ['Low', 'Medium', 'High'], default: 'Medium', required: false })
  riskLevel?: string;

  @ApiProperty({ description: 'Risk assessment details' })
  @Prop({
    type: {
      factors: { type: [String], default: [] },
      mitigationStrategies: { type: [String], default: [] },
      lastAssessmentDate: { type: String },
      nextAssessmentDate: { type: String },
    },
    _id: false,
  })
  riskAssessment?: {
    factors: string[];
    mitigationStrategies: string[];
    lastAssessmentDate?: string;
    nextAssessmentDate?: string;
  };

  @ApiProperty({
    example: 'Quarterly',
    description: 'Frequency of progress reports',
  })
  @Prop({
    enum: ['Weekly', 'Biweekly', 'Monthly', 'Quarterly'],
    default: 'Monthly',
    required: false,
  })
  reportingFrequency?: string;

  @ApiProperty({
    example: '2024-06-30',
    description: 'Actual completion date of the project',
  })
  @Prop({ required: false })
  actualCompletionDate?: Date;

  @ApiProperty({
    example: 500000,
    description: 'Total amount spent so far on the project',
  })
  @Prop({ required: true, default: 0 })
  amountSpent: number;

  @ApiProperty({ description: 'Financial tracking' })
  @Prop({
    type: {
      invoices: [
        {
          number: String,
          amount: Number,
          date: Date,
          status: { type: String, enum: ['pending', 'paid', 'cancelled'] },
          description: String,
        },
      ],
      expenses: [
        {
          category: String,
          amount: Number,
          date: Date,
          description: String,
          approvedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        },
      ],
    },
  })
  financialTracking: {
    invoices: {
      number: string;
      amount: number;
      date: Date;
      status: string;
      description: string;
    }[];
    expenses: {
      category: string;
      amount: number;
      date: Date;
      description: string;
      approvedBy: MongooseSchema.Types.ObjectId;
    }[];
  };

  @ApiProperty({ description: 'Project KPIs and metrics' })
  @Prop({
    type: [
      {
        name: String,
        target: Number,
        current: Number,
        unit: String,
        lastUpdated: Date,
      },
    ],
  })
  kpis: {
    name: string;
    target: number;
    current: number;
    unit: string;
    lastUpdated: Date;
  }[];

  @ApiProperty({ description: 'Milestones of the project', type: [Object] })
  @Prop({
    type: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        dueDate: { type: Date, required: true },
        completed: { type: Boolean, default: false },
        completionDate: { type: Date },
        budget: { type: Number, required: true },
        actualCost: { type: Number },
      },
    ],
    required: false,
  })
  milestones?: {
    title: string;
    description: string;
    dueDate: Date;
    completed: boolean;
    completionDate?: Date;
    budget: number;
    actualCost?: number;
  }[];

  @ApiProperty({ description: 'Project invoices' })
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Invoice' }],
    default: [],
  })
  invoices: MongooseSchema.Types.ObjectId[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
