import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImprestApprovalDto {
  @ApiProperty({
    example: 'Approved for payment',
    description: 'Comments for the approval/rejection',
  })
  @IsString()
  @IsOptional()
  comments?: string;
}

export class ImprestRejectionDto {
  @ApiProperty({
    example: 'Insufficient documentation provided',
    description: 'Reason for rejection',
  })
  @IsString()
  reason: string;
}

export class ImprestDisbursementDto {
  @ApiProperty({
    example: 1048.59,
    description: 'Amount to be disbursed',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 'Disbursed via bank transfer',
    description: 'Optional comments about the disbursement',
  })
  @IsString()
  @IsOptional()
  comments?: string;
}

export class ReceiptDto {
  @ApiProperty({
    example: 'Office supplies',
    description: 'Description of the expense',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 150.75,
    description: 'Amount of the expense',
  })
  @IsNumber()
  amount: number;
}

export class ImprestAccountingDto {
  @ApiProperty({
    description: 'List of receipts for accounting',
    type: [ReceiptDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptDto)
  receipts: ReceiptDto[];

  @ApiProperty({
    example: 'All receipts verified',
    description: 'Comments about the accounting',
  })
  @IsString()
  @IsOptional()
  comments?: string;
}

export class ImprestAcknowledgmentDto {
  @ApiProperty({
    example: true,
    description: 'Whether the user received the money',
  })
  @IsBoolean()
  received: boolean;

  @ApiProperty({
    example: 'Money received successfully',
    description: 'Acknowledgment comments',
    required: false,
  })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class ImprestDisputeResolutionDto {
  @ApiProperty({
    example: 'disbursed',
    description: 'Resolution action',
    enum: ['disbursed', 'cancelled'],
  })
  @IsString()
  @IsIn(['disbursed', 'cancelled'])
  resolution: string;

  @ApiProperty({
    example: 'Issue resolved, money re-disbursed',
    description: 'Admin comments',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminComments?: string;
}

export class ImprestRevisionDto {
  @ApiProperty({
    example: 'Please provide more details on the payment breakdown',
    description: 'Reason for requesting revision',
  })
  @IsString()
  reason: string;
}

export class ImprestAccountingRevisionDto {
  @ApiProperty({
    example: 'Receipts do not match the claimed amounts, please resubmit',
    description: 'Reason for requesting accounting revision',
  })
  @IsString()
  reason: string;
}
