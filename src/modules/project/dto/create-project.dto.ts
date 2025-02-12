import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, IsEmail, IsMongoId, IsUrl, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectManagerDto {
  @ApiProperty({ description: 'Project manager name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Project manager email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Project manager phone' })
  @IsString()
  phone: string;
}

export class TeamMemberDto {
  @ApiProperty({ description: 'Team member name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Team member email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Team member phone' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Team member role in the project' })
  @IsString()
  role: string;

  @ApiProperty({ description: 'Start date of team member in project' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'End date of team member in project' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({ description: 'Team member responsibilities' })
  @IsArray()
  @IsString({ each: true })
  responsibilities: string[];
}

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

export class CreateProjectDto {
  @ApiProperty({
    example: 'Health System Upgrade',
    description: 'The name of the project. Should be unique and descriptive.'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'A comprehensive project to upgrade the health system infrastructure including new equipment and staff training.',
    description: 'Detailed description of the project scope, objectives, and expected outcomes.'
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: 5000000,
    description: 'Total budget allocated for the project in the specified currency'
  })
  @IsNotEmpty()
  @IsNumber()
  totalBudget: number;

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
    example: 'draft',
    description: 'Current status of the project',
    enum: ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled']
  })
  @IsNotEmpty()
  @IsEnum(['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled'])
  status: string;

  @ApiProperty({
    description: 'Project manager details'
  })
  @ValidateNested()
  @Type(() => ProjectManagerDto)
  projectManager: ProjectManagerDto;

  @ApiProperty({
    description: 'Team members', type: [TeamMemberDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teamMembers: TeamMemberDto[];

  @ApiProperty({
    description: 'Project milestones', type: [MilestoneDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones: MilestoneDto[];

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
  @IsNotEmpty()
  @IsEnum(['Low', 'Medium', 'High'])
  riskLevel: string;

  @ApiProperty()
  @IsOptional()
  riskAssessment?: {
    factors: string[];
    mitigationStrategies: string[];
    lastAssessmentDate: Date;
    nextAssessmentDate: Date;
  };

  @ApiProperty({ example: 'Monthly' })
  @IsNotEmpty()
  @IsEnum(['Weekly', 'Biweekly', 'Monthly', 'Quarterly'])
  reportingFrequency: string;

  @ApiProperty()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  actualCompletionDate?: Date;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsNumber()
  amountSpent?: number;

  @ApiProperty()
  @IsOptional()
  financialTracking?: {
    invoices: any[];
    expenses: any[];
  };

  @ApiProperty()
  @IsOptional()
  @IsArray()
  kpis?: any[];
}
