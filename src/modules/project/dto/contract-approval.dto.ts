import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ContractApprovalDto {
  @ApiProperty({
    description: 'Optional comments for the approval',
    required: false,
  })
  @IsString()
  @IsOptional()
  comments?: string;
}

export class ContractRejectionDto {
  @ApiProperty({
    description: 'Reason for rejection',
    required: true,
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Level at which the contract was rejected',
    required: true,
    enum: ['finance', 'md'],
  })
  @IsString()
  level: string;
}
