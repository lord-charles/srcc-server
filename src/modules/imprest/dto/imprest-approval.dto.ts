import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

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

export class ImprestAccountingDto {
  @ApiProperty({
    description: 'List of receipts for accounting',
    type: [Object],
  })
  receipts: {
    description: string;
    amount: number;
    receiptUrl: string;
  }[];

  @ApiProperty({
    example: 'All receipts verified',
    description: 'Comments about the accounting',
  })
  @IsString()
  @IsOptional()
  comments?: string;
}
