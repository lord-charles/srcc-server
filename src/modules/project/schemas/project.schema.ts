import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @ApiProperty({ example: 'Health System Upgrade', description: 'The name of the project' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 'A project to upgrade the health system infrastructure.', description: 'A brief description of the project' })
  @Prop({ required: true, trim: true })
  description: string;

  @ApiProperty({ example: 5000000, description: 'Total budget allocated for the project' })
  @Prop({ required: true })
  totalBudget: number;

  @ApiProperty({ example: 4800000, description: 'Total estimated value of the project' })
  @Prop({ required: true })
  totalProjectValue: number;

  @ApiProperty({ example: 'USD', description: 'Currency for the budget' })
  @Prop({ required: true, trim: true })
  currency: string;

  @ApiProperty({ example: '2024-01-01', description: 'Contract start date' })
  @Prop({ required: true })
  contractStartDate: Date;

  @ApiProperty({ example: '2025-12-31', description: 'Contract end date' })
  @Prop({ required: true })
  contractEndDate: Date;

  @ApiProperty({ example: 'Ministry of Health', description: 'The client or organization funding the project' })
  @Prop({ required: true, trim: true })
  client: string;

  @ApiProperty({
    example: 'active',
    description: 'Project status',
    enum: ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled']
  })
  @Prop({
    required: true,
    enum: ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'draft'
  })
  status: string;

  @ApiProperty({ description: 'Project manager details' })
  @Prop({
    type: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    required: true
  })
  projectManager: {
    name: string;
    email: string;
    phone: string;
  };

  @ApiProperty({ description: 'Team members assigned to the project', type: [Object] })
  @Prop({
    type: [{
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      role: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      responsibilities: [String]
    }]
  })
  teamMembers: {
    name: string;
    email: string;
    phone: string;
    role: string;
    startDate: Date;
    endDate?: Date;
    responsibilities: string[];
  }[];

  @ApiProperty({ example: 'Public Procurement', description: 'The procurement method used' })
  @Prop({ required: true, trim: true })
  procurementMethod: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/project-proposal.pdf' })
  @Prop({ required: true })
  projectProposalUrl: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/signed-contract.pdf' })
  @Prop({ required: true })
  signedContractUrl: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/execution-memo.pdf' })
  @Prop({ required: true })
  executionMemoUrl: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/signed-budget.pdf' })
  @Prop({ required: true })
  signedBudgetUrl: string;

  @ApiProperty({ description: 'Document references for additional uploads', type: [Object] })
  @Prop({
    type: [{
      type: { type: String, required: true, enum: ['contract', 'budget', 'memo', 'report', 'other'] },
      url: { type: String, required: true },
      name: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true }
    }]
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
    enum: ['Low', 'Medium', 'High']
  })
  @Prop({ required: true, enum: ['Low', 'Medium', 'High'], default: 'Medium' })
  riskLevel: string;

  @ApiProperty({ description: 'Risk assessment details' })
  @Prop({
    type: {
      factors: [String],
      mitigationStrategies: [String],
      lastAssessmentDate: Date,
      nextAssessmentDate: Date
    }
  })
  riskAssessment: {
    factors: string[];
    mitigationStrategies: string[];
    lastAssessmentDate: Date;
    nextAssessmentDate: Date;
  };

  @ApiProperty({ example: 'Quarterly', description: 'Frequency of progress reports' })
  @Prop({ required: true, enum: ['Weekly', 'Biweekly', 'Monthly', 'Quarterly'], default: 'Monthly' })
  reportingFrequency: string;

  @ApiProperty({ example: '2024-06-30', description: 'Actual completion date of the project' })
  @Prop()
  actualCompletionDate: Date;

  @ApiProperty({ example: 500000, description: 'Total amount spent so far on the project' })
  @Prop({ required: true, default: 0 })
  amountSpent: number;

  @ApiProperty({ description: 'Financial tracking' })
  @Prop({
    type: {
      invoices: [{
        number: String,
        amount: Number,
        date: Date,
        status: { type: String, enum: ['pending', 'paid', 'cancelled'] },
        description: String
      }],
      expenses: [{
        category: String,
        amount: Number,
        date: Date,
        description: String,
        approvedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' }
      }]
    }
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
    type: [{
      name: String,
      target: Number,
      current: Number,
      unit: String,
      lastUpdated: Date
    }]
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
    type: [{
      title: { type: String, required: true },
      description: { type: String, required: true },
      dueDate: { type: Date, required: true },
      completed: { type: Boolean, default: false },
      completionDate: { type: Date },
      budget: { type: Number, required: true },
      actualCost: { type: Number }
    }]
  })
  milestones: {
    title: string;
    description: string;
    dueDate: Date;
    completed: boolean;
    completionDate?: Date;
    budget: number;
    actualCost?: number;
  }[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
