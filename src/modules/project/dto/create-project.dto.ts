import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsMongoId,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

class TeamMemberDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: ['Frontend Development', 'UI/UX Design'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibilities?: string[];
}

class MilestoneDto {
  @ApiProperty({ example: 'Phase 1 Completion' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Complete initial system setup and configuration' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2024-03-31' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({ example: false })
  @IsOptional()
  completed?: boolean;

  @ApiProperty({ example: null })
  @IsDateString()
  @IsOptional()
  completionDate?: string;

  @ApiProperty({ example: 1000000 })
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiProperty({ example: null })
  @IsNumber()
  @IsOptional()
  actualCost?: number;
}

class RiskAssessmentDto {
  @ApiProperty({ example: ['Technical complexity', 'Resource availability'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  factors?: string[];

  @ApiProperty({
    example: ['Regular technical reviews', 'Early resource planning'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mitigationStrategies?: string[];

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  lastAssessmentDate?: string;

  @ApiProperty({ example: '2024-02-01' })
  @IsDateString()
  @IsOptional()
  nextAssessmentDate?: string;
}

class FinancialTrackingDto {
  @ApiProperty({ example: ['Invoice 1', 'Invoice 2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  invoices?: string[];

  @ApiProperty({ example: ['Expense 1', 'Expense 2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  expenses?: string[];
}

export class CreateProjectDto {
  @ApiProperty({ example: 'Health System Upgrade' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ILAB' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ example: 'Comprehensive upgrade of the hospital management system' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 2300000 })
  @IsNumber()
  @IsNotEmpty()
  totalProjectValue: number;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['KES', 'USD', 'EUR', 'GBP'])
  currency: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  @IsNotEmpty()
  contractStartDate: string;

  @ApiProperty({ example: '2024-12-31' })
  @IsDateString()
  @IsNotEmpty()
  contractEndDate: string;

  @ApiProperty({ example: 'Ministry of Health' })
  @IsString()
  @IsNotEmpty()
  client: string;

  @ApiProperty({ example: 'draft' })
  @IsString()
  @IsOptional()
  @IsEnum([
    'draft',
    'pending_approval',
    'active',
    'on_hold',
    'completed',
    'cancelled',
  ])
  status?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsNotEmpty()
  projectManagerId: string;

  @ApiProperty({ type: [TeamMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  @IsOptional()
  teamMembers?: TeamMemberDto[];

  @ApiProperty({ type: [MilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  @IsOptional()
  milestones?: MilestoneDto[];

  @ApiProperty({ type: RiskAssessmentDto })
  @ValidateNested()
  @Type(() => RiskAssessmentDto)
  @IsOptional()
  riskAssessment?: RiskAssessmentDto;

  @ApiProperty({ example: 'Monthly' })
  @IsString()
  @IsOptional()
  @IsEnum(['Weekly', 'Biweekly', 'Monthly', 'Quarterly'])
  reportingFrequency?: string;

  @ApiProperty({ example: 'http://example.com/proposal.pdf' })
  @IsOptional()
  @IsString()
  @IsUrl()
  projectProposalUrl?: string;

  @ApiProperty({ example: 'http://example.com/contract.pdf' })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  signedContractUrl: string;

  @ApiProperty({ example: 'http://example.com/memo.pdf' })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  executionMemoUrl: string;

  @ApiProperty({ example: 'http://example.com/budget.pdf' })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  signedBudgetUrl: string;

  @ApiProperty({ example: 'Open Tender' })
  @IsString()
  @IsNotEmpty()
  @IsEnum([
    'Open Tender',
    'Restricted Tender',
    'Direct Procurement',
    'Request for Quotation',
  ])
  procurementMethod: string;

  @ApiProperty({ example: 'High' })
  @IsOptional()
  @IsEnum(['Low', 'Medium', 'High'])
  riskLevel: string;

  @ApiProperty({ type: FinancialTrackingDto })
  @ValidateNested()
  @Type(() => FinancialTrackingDto)
  @IsOptional()
  financialTracking?: FinancialTrackingDto;

  @ApiProperty({ example: ['KPI 1', 'KPI 2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  kpis?: string[];

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
