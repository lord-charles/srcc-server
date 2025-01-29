import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

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

  @ApiProperty({ example: 'active', description: 'Project status', enum: ['active', 'completed', 'on-hold', 'cancelled'] })
  @Prop({ required: true, enum: ['active', 'completed', 'on-hold', 'cancelled'], default: 'active' })
  status: string;

  @ApiProperty({ example: 'John Doe', description: 'The project manager overseeing the project' })
  @Prop({ required: true, trim: true })
  projectManager: string;

  @ApiProperty({ description: 'Milestones of the project', type: [Object] })
  @Prop({ type: [{ title: String, description: String, dueDate: Date, completed: Boolean }] })
  milestones: { title: string; description: string; dueDate: Date; completed: boolean }[];

  @ApiProperty({ description: 'Team members assigned to the project', type: [Object] })
  @Prop({ type: [{ name: String, role: String, contact: String }] })
  teamMembers: { name: string; role: string; contact: string }[];

  @ApiProperty({ example: 'Public Procurement', description: 'The procurement method used' })
  @Prop({ required: true, trim: true })
  procurementMethod: string;

  @ApiProperty({ description: 'Signed contract file URL' })
  @Prop({ required: true })
  signedContractUrl: string;

  @ApiProperty({ description: 'Contract execution memo file URL' })
  @Prop({ required: true })
  contractExecutionMemoUrl: string;

  @ApiProperty({ description: 'Signed budget document file URL' })
  @Prop({ required: true })
  signedBudgetUrl: string;

  @ApiProperty({ example: 'High', description: 'Risk level assessment for the project', enum: ['Low', 'Medium', 'High'] })
  @Prop({ required: true, enum: ['Low', 'Medium', 'High'], default: 'Medium' })
  riskLevel: string;

  @ApiProperty({ example: 'Quarterly', description: 'Frequency of progress reports' })
  @Prop({ required: true, trim: true })
  reportingFrequency: string;

  @ApiProperty({ example: '2024-06-30', description: 'Actual completion date of the project' })
  @Prop()
  actualCompletionDate: Date;

  @ApiProperty({ example: '500000', description: 'Total amount spent so far on the project' })
  @Prop({ required: true })
  amountSpent: number;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
