import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  ValidateNested,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class MilestoneClaimUpdateDto {
  @ApiProperty({ description: 'ID of the milestone being claimed' })
  @IsString()
  milestoneId: string;

  @ApiProperty({ description: 'Title of the milestone' })
  @IsString()
  title: string;

  @ApiProperty({ 
    description: 'Percentage of milestone amount being claimed',
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  percentageClaimed: number;
}

class DocumentUpdateDto {
  @ApiProperty({ description: 'URL of the uploaded document' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Name of the document' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Type of document',
    enum: ['invoice', 'receipt', 'timesheet', 'report', 'other']
  })
  @IsEnum(['invoice', 'receipt', 'timesheet', 'report', 'other'])
  type: string;
}

class BankAccountUpdateDto {
  @ApiProperty({ description: 'Name of the account holder' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'Bank account number' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Name of the bank' })
  @IsString()
  bankName: string;

  @ApiProperty({ description: 'Name of the bank branch' })
  @IsString()
  branchName: string;
}

export class UpdateClaimDto {
  @ApiProperty({ description: 'Amount being claimed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    description: 'Milestones this claim is associated with',
    type: [MilestoneClaimUpdateDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneClaimUpdateDto)
  milestones?: MilestoneClaimUpdateDto[];

  @ApiProperty({
    description: 'Status of the claim',
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'paid', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['draft', 'pending_approval', 'approved', 'rejected', 'paid', 'cancelled'])
  status?: string;

  @ApiProperty({ description: 'Supporting documents for the claim' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentUpdateDto)
  documents?: DocumentUpdateDto[];

  @ApiProperty({ description: 'Bank account details for payment' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BankAccountUpdateDto)
  bankAccount?: BankAccountUpdateDto;

  @ApiProperty({ description: 'Approval details' })
  @IsOptional()
  @IsObject()
  approval?: {
    comments?: string;
  };

  @ApiProperty({ description: 'Payment details' })
  @IsOptional()
  @IsObject()
  payment?: {
    paymentMethod: string;
    reference: string;
    transactionId: string;
  };

  @ApiProperty({ description: 'Rejection details' })
  @IsOptional()
  @IsObject()
  rejection?: {
    reason: string;
  };

  @ApiProperty({ description: 'Notes or comments about the claim' })
  @IsOptional()
  @IsString()
  notes?: string;
}
