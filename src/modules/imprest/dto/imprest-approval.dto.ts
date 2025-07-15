import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
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
