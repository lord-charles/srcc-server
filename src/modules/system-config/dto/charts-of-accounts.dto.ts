import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubAccountDto {
  @ApiProperty({ description: 'Sub-account number', example: '00001' })
  @IsString()
  subAccountNumber: string;

  @ApiProperty({ description: 'Sub-account name', example: 'SUP Books' })
  @IsString()
  subAccountName: string;

  @ApiProperty({ description: 'Account type', example: 'EX' })
  @IsString()
  type: string;
}

export class MappingDto {
  @ApiProperty({ description: 'Section identifier', example: 'unknown' })
  @IsString()
  section: string;

  @ApiProperty({ description: 'Chart code', example: 'SR' })
  @IsString()
  chart: string;

  @ApiProperty({ description: 'Account number', example: '2101400' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Account name', example: 'DLC MANAGER', required: false })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiProperty({ description: 'Account name for 2025', example: 'DLC MANAGER', required: false })
  @IsString()
  @IsOptional()
  accountName2025?: string;

  @ApiProperty({ description: 'Object code', example: '265' })
  @IsString()
  objectCode: string;

  @ApiProperty({ description: 'Object code name', example: 'REVISION KITS' })
  @IsString()
  objectCodeName: string;

  @ApiProperty({ description: 'Financial statement type', example: 'Income Statement' })
  @IsString()
  financialStatement: string;

  @ApiProperty({ description: 'Account type', example: 'Income' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Financial statement title', example: 'Sale of Books' })
  @IsString()
  fsTitle: string;

  @ApiProperty({ description: 'Financial statement subtitle', example: 'Current Assets', required: false })
  @IsString()
  @IsOptional()
  fsSubTitle?: string;

  @ApiProperty({ description: 'Whether mapping is active', example: true })
  @IsBoolean()
  mapping: boolean;
}

export class ObjectCodeDto {
  @ApiProperty({ description: 'Object code', example: '100' })
  @IsString()
  objectCode: string;

  @ApiProperty({ description: 'Object code name', example: 'APPLICATION FEES' })
  @IsString()
  objectCodeName: string;

  @ApiProperty({ description: 'Code type', example: 'IN' })
  @IsString()
  type: string;
}

export class AccountDto {
  @ApiProperty({ description: 'Account number', example: '2101400' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Account name', example: 'DLC MANAGER' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'Sub-accounts', type: [SubAccountDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubAccountDto)
  @IsOptional()
  subAccounts?: SubAccountDto[];

  @ApiProperty({ description: 'Account mappings', type: [MappingDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MappingDto)
  @IsOptional()
  mappings?: MappingDto[];
}

export class ChartDataDto {
  @ApiProperty({ description: 'List of accounts', type: [AccountDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountDto)
  accounts: AccountDto[];

  @ApiProperty({ description: 'List of object codes', type: [ObjectCodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObjectCodeDto)
  objectCodes: ObjectCodeDto[];

  @ApiProperty({ description: 'Chart-level mappings', type: [MappingDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MappingDto)
  @IsOptional()
  mappings?: MappingDto[];
}

export class CreateChartsOfAccountsDto {
  @ApiProperty({ description: 'Chart code', example: 'SR' })
  @IsString()
  chartCode: string;

  @ApiProperty({ description: 'Chart name', example: 'Strathmore University' })
  @IsString()
  chartName: string;

  @ApiProperty({ description: 'Chart description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Chart data', type: ChartDataDto })
  @ValidateNested()
  @Type(() => ChartDataDto)
  data: ChartDataDto;

  @ApiProperty({ description: 'Whether chart is active', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Currency', example: 'KES', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class UpdateChartsOfAccountsDto extends PartialType(CreateChartsOfAccountsDto) {
  @ApiProperty({ description: 'Version number', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  version?: number;
}

export class BulkUpdateAccountsDto {
  @ApiProperty({ description: 'Chart code', example: 'SR' })
  @IsString()
  chartCode: string;

  @ApiProperty({ description: 'Accounts to update', type: [AccountDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountDto)
  accounts: AccountDto[];
}

export class BulkUpdateObjectCodesDto {
  @ApiProperty({ description: 'Chart code', example: 'SR' })
  @IsString()
  chartCode: string;

  @ApiProperty({ description: 'Object codes to update', type: [ObjectCodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObjectCodeDto)
  objectCodes: ObjectCodeDto[];
}
