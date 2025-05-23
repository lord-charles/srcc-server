import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, IsEmail, IsMongoId, IsUrl, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { Schema as MongooseSchema } from 'mongoose';
import { TeamMemberDto } from './team-member.dto';

export class MilestoneDto {
  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Milestone description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Due date of milestone' })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @ApiProperty({ description: 'Milestone completion status' })
  @IsBoolean()
  completed: boolean;

  @ApiProperty({ description: 'Milestone completion date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completionDate?: Date;

  @ApiProperty({ description: 'Milestone budget' })
  @IsNumber()
  budget: number;

  @ApiProperty({ description: 'Milestone actual cost' })
  @IsOptional()
  @IsNumber()
  actualCost?: number;
}

export class RiskAssessmentDto {
  @ApiProperty({ description: 'Risk factors', required: false, default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  factors: string[] = [];

  @ApiProperty({ description: 'Risk mitigation strategies', required: false, default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mitigationStrategies: string[] = [];

  @ApiProperty({ description: 'Last risk assessment date', required: false })
  @IsOptional()
  @Type(() => Date)
  lastAssessmentDate?: string;

  @ApiProperty({ description: 'Next risk assessment string', required: false })
  @IsOptional()
  @Type(() => Date)
  nextAssessmentDate?: Date;
}

export class FinancialTrackingDto {
  @ApiProperty({ description: 'Invoices', required: false, default: [] })
  @IsOptional()
  @IsArray()
  invoices: any[] = [];

  @ApiProperty({ description: 'Expenses', required: false, default: [] })
  @IsOptional()
  @IsArray()
  expenses: any[] = [];
}

export class CreateProjectDto {
  @ApiProperty({
    example: 'Health System Upgrade',
    description: 'The name of the project. Should be unique and descriptive.'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'SU',
    description: 'The department of the project'
  })
  @IsNotEmpty()
  @IsString()
  department: string;

  @ApiProperty({
    example: 'A comprehensive project to upgrade the health system infrastructure including new equipment and staff training.',
    description: 'Detailed description of the project scope, objectives, and expected outcomes.'
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  // @ApiProperty({
  //   example: 5000000,
  //   description: 'Total budget allocated for the project in the specified currency'
  // })
  // @IsNotEmpty()
  // @IsNumber()
  // totalBudget: number;

  @ApiProperty({
    example: 4800000,
    description: 'Total estimated value of the project deliverables'
  })
  @IsNotEmpty()
  @IsNumber()
  totalProjectValue: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code for all monetary values in the project'
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Date when the contract/project officially starts'
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  contractStartDate: Date;

  @ApiProperty({
    example: '2025-12-31T00:00:00.000Z',
    description: 'Date when the contract/project is scheduled to end'
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  contractEndDate: Date;

  @ApiProperty({
    example: 'Ministry of Health',
    description: 'Name of the client organization funding the project'
  })
  @IsNotEmpty()
  @IsString()
  client: string;

  @ApiProperty({
    example: 'active',
    description: 'Current status of the project',
    enum: ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled']
  })
  @IsNotEmpty()
  @IsEnum(['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled'])
  status: string;

  @ApiProperty({
    description: 'Project manager ID reference',
    example: '507f1f77bcf86cd799439011'
  })
  @IsOptional()
  @IsMongoId()
  projectManagerId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({
    description: 'Team members', type: [TeamMemberDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teamMembers?: TeamMemberDto[];

  @ApiProperty({
    description: 'Project milestones', type: [MilestoneDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @ApiProperty({
    example: 'https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/project-proposal.pdf',
    description: 'Cloudinary URL for the uploaded project proposal document'
  })
  @IsOptional()
  @IsUrl()
  projectProposalUrl?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/signed-contract.pdf',
    description: 'Cloudinary URL for the uploaded signed contract document'
  })
  @IsOptional()
  @IsUrl()
  signedContractUrl?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/execution-memo.pdf',
    description: 'Cloudinary URL for the uploaded contract execution memo'
  })
  @IsOptional()
  @IsUrl()
  contractExecutionMemoUrl?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/your-cloud-name/raw/upload/v1234567890/signed-budget.pdf',
    description: 'Cloudinary URL for the uploaded signed budget document'
  })
  @IsOptional()
  @IsUrl()
  signedBudgetUrl?: string;

  @ApiProperty({ example: 'Public Procurement' })
  @IsNotEmpty()
  @IsString()
  procurementMethod: string;

  @ApiProperty({ example: 'High' })
  @IsOptional()
  @IsEnum(['Low', 'Medium', 'High'])
  riskLevel?: string;

  @ApiProperty({
    description: 'Risk assessment details'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RiskAssessmentDto)
  riskAssessment?: RiskAssessmentDto;

  @ApiProperty({ example: 'Monthly', enum: ['Weekly', 'Biweekly', 'Monthly', 'Quarterly'] })
  @IsOptional()
  @IsEnum(['Weekly', 'Biweekly', 'Monthly', 'Quarterly'])
  reportingFrequency?: string;

  @ApiProperty({
    description: 'Actual completion date'
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  actualCompletionDate?: Date;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsNumber()
  amountSpent?: number;

  @ApiProperty({
    description: 'Financial tracking details'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FinancialTrackingDto)
  financialTracking?: FinancialTrackingDto;

  @ApiProperty({
    description: 'Key performance indicators'
  })
  @IsOptional()
  @IsArray()
  kpis?: any[];
}
