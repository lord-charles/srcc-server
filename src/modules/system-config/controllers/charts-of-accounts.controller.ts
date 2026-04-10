import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ChartsOfAccountsService } from '../services/charts-of-accounts.service';
import {
  CreateChartsOfAccountsDto,
  UpdateChartsOfAccountsDto,
  BulkUpdateAccountsDto,
  BulkUpdateObjectCodesDto,
} from '../dto/charts-of-accounts.dto';

@ApiTags('Charts of Accounts')
@Controller('charts-of-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChartsOfAccountsController {
  constructor(
    private readonly chartsOfAccountsService: ChartsOfAccountsService,
  ) {}

  // Chart CRUD Operations
  @Post()
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chart of accounts' })
  @ApiResponse({ status: 201, description: 'Chart created successfully' })
  create(@Body() createDto: CreateChartsOfAccountsDto, @Req() req) {
    return this.chartsOfAccountsService.create(createDto, req.user.sub);
  }

  @Get()
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Get all charts of accounts' })
  @ApiResponse({ status: 200, description: 'List of all charts' })
  findAll() {
    return this.chartsOfAccountsService.findAll();
  }

  @Get(':chartCode')
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Get chart of accounts by code' })
  @ApiResponse({ status: 200, description: 'Chart details' })
  findByChartCode(@Param('chartCode') chartCode: string) {
    return this.chartsOfAccountsService.findByChartCode(chartCode);
  }

  @Patch(':chartCode')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Update chart of accounts' })
  @ApiResponse({ status: 200, description: 'Chart updated successfully' })
  update(
    @Param('chartCode') chartCode: string,
    @Body() updateDto: UpdateChartsOfAccountsDto,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.update(
      chartCode,
      updateDto,
      req.user.sub,
    );
  }

  @Delete(':chartCode')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete chart of accounts' })
  @ApiResponse({ status: 204, description: 'Chart deleted successfully' })
  remove(@Param('chartCode') chartCode: string) {
    return this.chartsOfAccountsService.remove(chartCode);
  }

  // Account Operations
  @Post(':chartCode/accounts')
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add account to chart' })
  addAccount(
    @Param('chartCode') chartCode: string,
    @Body() accountData: any,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.addAccount(
      chartCode,
      accountData,
      req.user.sub,
    );
  }

  @Get(':chartCode/accounts')
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Get all accounts in chart' })
  getAccounts(@Param('chartCode') chartCode: string) {
    return this.chartsOfAccountsService
      .findByChartCode(chartCode)
      .then((chart) => chart.data.accounts);
  }

  @Get(':chartCode/accounts/:accountNumber')
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Get specific account' })
  getAccount(
    @Param('chartCode') chartCode: string,
    @Param('accountNumber') accountNumber: string,
  ) {
    return this.chartsOfAccountsService.getAccount(chartCode, accountNumber);
  }

  @Patch(':chartCode/accounts/:accountNumber')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Update account' })
  updateAccount(
    @Param('chartCode') chartCode: string,
    @Param('accountNumber') accountNumber: string,
    @Body() accountData: any,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.updateAccount(
      chartCode,
      accountNumber,
      accountData,
      req.user.sub,
    );
  }

  @Delete(':chartCode/accounts/:accountNumber')
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete account' })
  removeAccount(
    @Param('chartCode') chartCode: string,
    @Param('accountNumber') accountNumber: string,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.removeAccount(
      chartCode,
      accountNumber,
      req.user.sub,
    );
  }

  // Sub-Account Operations
  @Post(':chartCode/accounts/:accountNumber/sub-accounts')
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add sub-account' })
  addSubAccount(
    @Param('chartCode') chartCode: string,
    @Param('accountNumber') accountNumber: string,
    @Body() subAccountData: any,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.addSubAccount(
      chartCode,
      accountNumber,
      subAccountData,
      req.user.sub,
    );
  }

  @Delete(':chartCode/accounts/:accountNumber/sub-accounts/:subAccountNumber')
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete sub-account' })
  removeSubAccount(
    @Param('chartCode') chartCode: string,
    @Param('accountNumber') accountNumber: string,
    @Param('subAccountNumber') subAccountNumber: string,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.removeSubAccount(
      chartCode,
      accountNumber,
      subAccountNumber,
      req.user.sub,
    );
  }

  // Object Code Operations
  @Post(':chartCode/object-codes')
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add object code' })
  addObjectCode(
    @Param('chartCode') chartCode: string,
    @Body() objectCodeData: any,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.addObjectCode(
      chartCode,
      objectCodeData,
      req.user.sub,
    );
  }

  @Get(':chartCode/object-codes')
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Get all object codes in chart' })
  getObjectCodes(@Param('chartCode') chartCode: string) {
    return this.chartsOfAccountsService
      .findByChartCode(chartCode)
      .then((chart) => chart.data.objectCodes);
  }

  @Delete(':chartCode/object-codes/:objectCode')
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete object code' })
  removeObjectCode(
    @Param('chartCode') chartCode: string,
    @Param('objectCode') objectCode: string,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.removeObjectCode(
      chartCode,
      objectCode,
      req.user.sub,
    );
  }

  // Mapping Operations
  @Post(':chartCode/accounts/:accountNumber/mappings')
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add mapping to account' })
  addMapping(
    @Param('chartCode') chartCode: string,
    @Param('accountNumber') accountNumber: string,
    @Body() mappingData: any,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.addMapping(
      chartCode,
      accountNumber,
      mappingData,
      req.user.sub,
    );
  }

  @Delete(':chartCode/accounts/:accountNumber/mappings/:mappingIndex')
  @Roles('admin', 'finance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete mapping' })
  removeMapping(
    @Param('chartCode') chartCode: string,
    @Param('accountNumber') accountNumber: string,
    @Param('mappingIndex') mappingIndex: number,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.removeMapping(
      chartCode,
      accountNumber,
      mappingIndex,
      req.user.sub,
    );
  }

  // Bulk Operations
  @Patch(':chartCode/accounts/bulk')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Bulk update accounts' })
  bulkUpdateAccounts(
    @Param('chartCode') chartCode: string,
    @Body() bulkUpdateDto: BulkUpdateAccountsDto,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.bulkUpdateAccounts(
      bulkUpdateDto,
      req.user.sub,
    );
  }

  @Patch(':chartCode/object-codes/bulk')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Bulk update object codes' })
  bulkUpdateObjectCodes(
    @Param('chartCode') chartCode: string,
    @Body() bulkUpdateDto: BulkUpdateObjectCodesDto,
    @Req() req,
  ) {
    return this.chartsOfAccountsService.bulkUpdateObjectCodes(
      bulkUpdateDto,
      req.user.sub,
    );
  }

  // Search and Filter Operations
  @Get(':chartCode/accounts/search')
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Search accounts' })
  searchAccounts(
    @Param('chartCode') chartCode: string,
    @Query('q') searchTerm: string,
  ) {
    return this.chartsOfAccountsService.searchAccounts(chartCode, searchTerm);
  }

  @Get(':chartCode/object-codes/search')
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Search object codes' })
  searchObjectCodes(
    @Param('chartCode') chartCode: string,
    @Query('q') searchTerm: string,
  ) {
    return this.chartsOfAccountsService.searchObjectCodes(
      chartCode,
      searchTerm,
    );
  }

  @Get(':chartCode/accounts/type/:type')
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Get accounts by type' })
  getAccountsByType(
    @Param('chartCode') chartCode: string,
    @Param('type') type: string,
  ) {
    return this.chartsOfAccountsService.getAccountsByType(chartCode, type);
  }

  // Statistics
  @Get(':chartCode/statistics')
  @Roles('admin', 'finance', 'user')
  @ApiOperation({ summary: 'Get chart statistics' })
  getStatistics(@Param('chartCode') chartCode: string) {
    return this.chartsOfAccountsService.getChartStatistics(chartCode);
  }
}
