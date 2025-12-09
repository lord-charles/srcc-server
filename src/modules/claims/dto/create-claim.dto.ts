import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsMongoId,
  ValidateNested,
  Min,
  IsEnum,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

class MilestoneClaimDto {
  @ApiProperty({ description: 'ID of the milestone being claimed' })
  @IsNotEmpty()
  @IsString()
  milestoneId: string;

  @ApiProperty({ description: 'Title of the milestone' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Percentage of milestone amount being claimed',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  percentageClaimed: number;
}

class DocumentDto {
  @ApiProperty({ description: 'URL of the uploaded document' })
  @IsNotEmpty()
  @IsString()
  url: string;

  @ApiProperty({ description: 'Name of the document' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Type of document',
    enum: ['invoice', 'receipt', 'timesheet', 'report', 'other'],
  })
  @IsNotEmpty()
  @IsEnum(['invoice', 'receipt', 'timesheet', 'report', 'other'])
  type: string;
}

class BankAccountDto {
  @ApiProperty({ description: 'Name of the account holder' })
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'Bank account number' })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Name of the bank' })
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty({ description: 'Name of the bank branch' })
  @IsNotEmpty()
  @IsString()
  branchName: string;
}

export class CreateClaimDto {
  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsMongoId()
  projectId: Types.ObjectId;

  @ApiProperty({ description: 'Contract ID' })
  @IsNotEmpty()
  @IsMongoId()
  contractId: Types.ObjectId;

  @ApiProperty({ example: 50000, description: 'Amount being claimed' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'USD', description: 'Currency of the claim' })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Milestones this claim is associated with',
    type: [MilestoneClaimDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneClaimDto)
  @ArrayMinSize(1)
  milestones: MilestoneClaimDto[];

  @ApiProperty({ description: 'Supporting documents for the claim' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @ApiProperty({ description: 'Bank account details for payment' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bankAccount?: BankAccountDto;

  @ApiProperty({ description: 'Notes or comments about the claim' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description:
      'User ID of the claimant (optional - only for authorized users creating claims on behalf of others)',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  claimantId?: Types.ObjectId;
}
