import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LpoItemDto {
  @ApiProperty()
  @IsNumber()
  noOfDays: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  rate: number;

  @ApiProperty()
  @IsNumber()
  total: number;
}

export class CreateLpoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @ApiProperty()
  @IsDateString()
  lpoDate: string;

  @ApiProperty({ type: [LpoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LpoItemDto)
  items: LpoItemDto[];

  @ApiProperty()
  @IsNumber()
  subTotal: number;

  @ApiProperty()
  @IsNumber()
  vatAmount: number;

  @ApiProperty()
  @IsNumber()
  totalAmount: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  validityDays?: number;
}

export class SendLpoEmailDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pdfBase64: string;

  @ApiProperty()
  @IsOptional()
  ccEmails?: string[];

  @ApiProperty()
  @IsOptional()
  message?: string;
}
