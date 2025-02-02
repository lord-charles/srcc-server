import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsEnum, IsMongoId, IsBoolean, IsArray, ValidateNested, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ContractTermDto {
  @ApiProperty({ example: '1.1', description: 'Clause number or identifier' })
  @IsString()
  clause: string;

  @ApiProperty({ example: 'The contractor shall...', description: 'Description of the clause' })
  @IsString()
  description: string;
}

class DeliverableDto {
  @ApiProperty({ example: 'Phase 1 Completion', description: 'Title of the deliverable' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Complete foundation work', description: 'Description of the deliverable' })
  @IsString()
  description: string;

  @ApiProperty({ example: '2025-06-30', description: 'Due date for the deliverable' })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @ApiProperty({ example: false, description: 'Whether the deliverable is completed' })
  @IsBoolean()
  completed: boolean;

  @ApiProperty({ example: ['Must pass inspection', 'Documentation complete'], description: 'Acceptance criteria' })
  @IsArray()
  @IsString({ each: true })
  acceptanceCriteria: string[];
}

class PaymentScheduleDto {
  @ApiProperty({ example: 'Foundation completion', description: 'Payment milestone' })
  @IsString()
  milestone: string;

  @ApiProperty({ example: 500000, description: 'Payment amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2025-06-30', description: 'Due date for the payment' })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @ApiProperty({ example: false, description: 'Whether the payment has been made' })
  @IsBoolean()
  paid: boolean;

  @ApiProperty({ example: '2025-06-25', description: 'Date when payment was made' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paymentDate?: Date;
}

class AmendmentDto {
  @ApiProperty({ example: 'AMD-001', description: 'Amendment number' })
  @IsString()
  amendmentNumber: string;

  @ApiProperty({ example: 'Extension of timeline', description: 'Description of the amendment' })
  @IsString()
  description: string;

  @ApiProperty({ example: '2025-06-30', description: 'Date of amendment' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'User ID who approved the amendment' })
  @IsMongoId()
  approvedBy: string;
}

export class CreateContractDto {
  @ApiProperty({ example: 'KPA/2025/001', description: 'Contract reference number' })
  @IsString()
  contractNumber: string;

  @ApiProperty({ example: 'Port Infrastructure Development', description: 'Title of the contract' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Infrastructure development and modernization of Mombasa Port facilities', description: 'Detailed description of the contract' })
  @IsString()
  description: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Reference to the contracting authority' })
  @IsMongoId()
  contractingAuthorityId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Reference to the contractor organization' })
  @IsMongoId()
  contractorId: string;

  @ApiProperty({ example: 2500000000, description: 'Total contract value in KES' })
  @IsNumber()
  @Min(0)
  contractValue: number;

  @ApiProperty({ example: 'KES', description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '2025-03-01', description: 'Contract start date' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ example: '2027-02-28', description: 'Contract end date' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiProperty({ 
    example: 'active',
    enum: ['draft', 'pending_approval', 'active', 'completed', 'terminated', 'suspended'],
    description: 'Contract status'
  })
  @IsEnum(['draft', 'pending_approval', 'active', 'completed', 'terminated', 'suspended'])
  status: string;

  @ApiProperty({ 
    example: 'Open Tender',
    enum: ['Open Tender', 'Restricted Tender', 'Direct Procurement', 'Request for Proposal', 'Request for Quotation'],
    description: 'Procurement method used'
  })
  @IsEnum(['Open Tender', 'Restricted Tender', 'Direct Procurement', 'Request for Proposal', 'Request for Quotation'])
  procurementMethod: string;

  @ApiProperty({ example: 'PPRA/2025/123', description: 'Procurement reference number from PPRA' })
  @IsString()
  procurementReferenceNumber: string;

  @ApiProperty({ type: [ContractTermDto], description: 'Contract terms and conditions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractTermDto)
  terms: ContractTermDto[];

  @ApiProperty({ type: [DeliverableDto], description: 'Contract deliverables' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliverableDto)
  deliverables: DeliverableDto[];

  @ApiProperty({ type: [PaymentScheduleDto], description: 'Payment schedule' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleDto)
  paymentSchedule: PaymentScheduleDto[];

  @ApiProperty({ example: true, description: 'Whether performance security is required' })
  @IsBoolean()
  requiresPerformanceSecurity: boolean;

  @ApiProperty({ example: 125000000, description: 'Performance security amount in KES (if required)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  performanceSecurityAmount?: number;

  @ApiProperty({ type: [AmendmentDto], description: 'Contract amendments history' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmendmentDto)
  amendments?: AmendmentDto[];

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'User who created the contract' })
  @IsMongoId()
  createdBy: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Contract manager assigned to oversee the contract' })
  @IsMongoId()
  contractManagerId: string;
}
