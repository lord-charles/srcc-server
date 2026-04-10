import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
  ChartsOfAccounts,
  ChartsOfAccountsDocument,
} from '../schemas/charts-of-accounts.schema';
import {
  CreateChartsOfAccountsDto,
  UpdateChartsOfAccountsDto,
  BulkUpdateAccountsDto,
  BulkUpdateObjectCodesDto,
} from '../dto/charts-of-accounts.dto';

@Injectable()
export class ChartsOfAccountsService {
  private readonly logger = new Logger(ChartsOfAccountsService.name);

  constructor(
    @InjectModel(ChartsOfAccounts.name)
    private chartsOfAccountsModel: Model<ChartsOfAccountsDocument>,
  ) {}

  async create(
    createDto: CreateChartsOfAccountsDto,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    try {
      // Check if chart code already exists
      const existing = await this.chartsOfAccountsModel.findOne({
        chartCode: createDto.chartCode,
      });
      if (existing) {
        throw new ConflictException(
          `Chart with code ${createDto.chartCode} already exists`,
        );
      }

      const chart = await this.chartsOfAccountsModel.create({
        ...createDto,
        createdBy: userId as unknown as ObjectId,
        updatedBy: userId as unknown as ObjectId,
      });

      this.logger.log(`Created chart of accounts: ${createDto.chartCode}`);
      return chart;
    } catch (error) {
      this.logger.error(`Error creating chart: ${error.message}`);
      throw error;
    }
  }

  async findAll(): Promise<ChartsOfAccountsDocument[]> {
    return this.chartsOfAccountsModel.find().exec();
  }

  async findByChartCode(chartCode: string): Promise<ChartsOfAccountsDocument> {
    const chart = await this.chartsOfAccountsModel
      .findOne({ chartCode })
      .exec();
    if (!chart) {
      throw new NotFoundException(`Chart with code ${chartCode} not found`);
    }
    return chart;
  }

  async update(
    chartCode: string,
    updateDto: UpdateChartsOfAccountsDto,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    try {
      const chart = await this.chartsOfAccountsModel.findOne({ chartCode });
      if (!chart) {
        throw new NotFoundException(`Chart with code ${chartCode} not found`);
      }

      const updateData = {
        ...updateDto,
        updatedBy: userId as unknown as ObjectId,
      };

      const updated = await this.chartsOfAccountsModel
        .findOneAndUpdate({ chartCode }, updateData, { new: true })
        .exec();

      this.logger.log(`Updated chart of accounts: ${chartCode}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating chart: ${error.message}`);
      throw error;
    }
  }

  async remove(chartCode: string): Promise<ChartsOfAccountsDocument> {
    const chart = await this.chartsOfAccountsModel
      .findOneAndDelete({ chartCode })
      .exec();
    if (!chart) {
      throw new NotFoundException(`Chart with code ${chartCode} not found`);
    }
    this.logger.log(`Deleted chart of accounts: ${chartCode}`);
    return chart;
  }

  // Account-specific operations
  async addAccount(
    chartCode: string,
    accountData: any,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);

    // Check if account already exists
    const accountExists = chart.data.accounts.some(
      (acc) => acc.accountNumber === accountData.accountNumber,
    );
    if (accountExists) {
      throw new ConflictException(
        `Account ${accountData.accountNumber} already exists in this chart`,
      );
    }

    chart.data.accounts.push(accountData);
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Added account ${accountData.accountNumber} to chart ${chartCode}`,
    );
    return updated;
  }

  async updateAccount(
    chartCode: string,
    accountNumber: string,
    accountData: any,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);

    const accountIndex = chart.data.accounts.findIndex(
      (acc) => acc.accountNumber === accountNumber,
    );
    if (accountIndex === -1) {
      throw new NotFoundException(
        `Account ${accountNumber} not found in chart ${chartCode}`,
      );
    }

    chart.data.accounts[accountIndex] = {
      ...chart.data.accounts[accountIndex],
      ...accountData,
    };
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(`Updated account ${accountNumber} in chart ${chartCode}`);
    return updated;
  }

  async removeAccount(
    chartCode: string,
    accountNumber: string,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);

    const accountIndex = chart.data.accounts.findIndex(
      (acc) => acc.accountNumber === accountNumber,
    );
    if (accountIndex === -1) {
      throw new NotFoundException(
        `Account ${accountNumber} not found in chart ${chartCode}`,
      );
    }

    chart.data.accounts.splice(accountIndex, 1);
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(`Removed account ${accountNumber} from chart ${chartCode}`);
    return updated;
  }

  async getAccount(chartCode: string, accountNumber: string): Promise<any> {
    const chart = await this.findByChartCode(chartCode);
    const account = chart.data.accounts.find(
      (acc) => acc.accountNumber === accountNumber,
    );

    if (!account) {
      throw new NotFoundException(
        `Account ${accountNumber} not found in chart ${chartCode}`,
      );
    }

    return account;
  }

  // Sub-account operations
  async addSubAccount(
    chartCode: string,
    accountNumber: string,
    subAccountData: any,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);
    const account = chart.data.accounts.find(
      (acc) => acc.accountNumber === accountNumber,
    );

    if (!account) {
      throw new NotFoundException(
        `Account ${accountNumber} not found in chart ${chartCode}`,
      );
    }

    const subAccountExists = account.subAccounts.some(
      (sub) => sub.subAccountNumber === subAccountData.subAccountNumber,
    );
    if (subAccountExists) {
      throw new ConflictException(
        `Sub-account ${subAccountData.subAccountNumber} already exists in account ${accountNumber}`,
      );
    }

    account.subAccounts.push(subAccountData);
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Added sub-account ${subAccountData.subAccountNumber} to account ${accountNumber}`,
    );
    return updated;
  }

  async removeSubAccount(
    chartCode: string,
    accountNumber: string,
    subAccountNumber: string,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);
    const account = chart.data.accounts.find(
      (acc) => acc.accountNumber === accountNumber,
    );

    if (!account) {
      throw new NotFoundException(
        `Account ${accountNumber} not found in chart ${chartCode}`,
      );
    }

    const subAccountIndex = account.subAccounts.findIndex(
      (sub) => sub.subAccountNumber === subAccountNumber,
    );
    if (subAccountIndex === -1) {
      throw new NotFoundException(
        `Sub-account ${subAccountNumber} not found in account ${accountNumber}`,
      );
    }

    account.subAccounts.splice(subAccountIndex, 1);
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Removed sub-account ${subAccountNumber} from account ${accountNumber}`,
    );
    return updated;
  }

  // Object code operations
  async addObjectCode(
    chartCode: string,
    objectCodeData: any,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);

    const codeExists = chart.data.objectCodes.some(
      (code) => code.objectCode === objectCodeData.objectCode,
    );
    if (codeExists) {
      throw new ConflictException(
        `Object code ${objectCodeData.objectCode} already exists in this chart`,
      );
    }

    chart.data.objectCodes.push(objectCodeData);
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Added object code ${objectCodeData.objectCode} to chart ${chartCode}`,
    );
    return updated;
  }

  async removeObjectCode(
    chartCode: string,
    objectCode: string,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);

    const codeIndex = chart.data.objectCodes.findIndex(
      (code) => code.objectCode === objectCode,
    );
    if (codeIndex === -1) {
      throw new NotFoundException(
        `Object code ${objectCode} not found in chart ${chartCode}`,
      );
    }

    chart.data.objectCodes.splice(codeIndex, 1);
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Removed object code ${objectCode} from chart ${chartCode}`,
    );
    return updated;
  }

  // Mapping operations
  async addMapping(
    chartCode: string,
    accountNumber: string,
    mappingData: any,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);
    const account = chart.data.accounts.find(
      (acc) => acc.accountNumber === accountNumber,
    );

    if (!account) {
      throw new NotFoundException(
        `Account ${accountNumber} not found in chart ${chartCode}`,
      );
    }

    account.mappings.push(mappingData);
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Added mapping to account ${accountNumber} in chart ${chartCode}`,
    );
    return updated;
  }

  async removeMapping(
    chartCode: string,
    accountNumber: string,
    mappingIndex: number,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(chartCode);
    const account = chart.data.accounts.find(
      (acc) => acc.accountNumber === accountNumber,
    );

    if (!account) {
      throw new NotFoundException(
        `Account ${accountNumber} not found in chart ${chartCode}`,
      );
    }

    if (mappingIndex < 0 || mappingIndex >= account.mappings.length) {
      throw new BadRequestException(`Invalid mapping index ${mappingIndex}`);
    }

    account.mappings.splice(mappingIndex, 1);
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Removed mapping from account ${accountNumber} in chart ${chartCode}`,
    );
    return updated;
  }

  // Bulk operations
  async bulkUpdateAccounts(
    bulkUpdateDto: BulkUpdateAccountsDto,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(bulkUpdateDto.chartCode);

    // Replace all accounts with proper defaults for optional fields
    chart.data.accounts = bulkUpdateDto.accounts.map((acc) => ({
      ...acc,
      subAccounts: acc.subAccounts || [],
      mappings: acc.mappings || [],
    })) as any;
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Bulk updated ${bulkUpdateDto.accounts.length} accounts in chart ${bulkUpdateDto.chartCode}`,
    );
    return updated;
  }

  async bulkUpdateObjectCodes(
    bulkUpdateDto: BulkUpdateObjectCodesDto,
    userId: string,
  ): Promise<ChartsOfAccountsDocument> {
    const chart = await this.findByChartCode(bulkUpdateDto.chartCode);

    // Replace all object codes
    chart.data.objectCodes = bulkUpdateDto.objectCodes;
    chart.updatedBy = userId as unknown as ObjectId;

    const updated = await chart.save();
    this.logger.log(
      `Bulk updated ${bulkUpdateDto.objectCodes.length} object codes in chart ${bulkUpdateDto.chartCode}`,
    );
    return updated;
  }

  // Search and filter operations
  async searchAccounts(chartCode: string, searchTerm: string): Promise<any[]> {
    const chart = await this.findByChartCode(chartCode);
    const lowerSearchTerm = searchTerm.toLowerCase();

    return chart.data.accounts.filter(
      (acc) =>
        acc.accountNumber.toLowerCase().includes(lowerSearchTerm) ||
        acc.accountName.toLowerCase().includes(lowerSearchTerm),
    );
  }

  async searchObjectCodes(
    chartCode: string,
    searchTerm: string,
  ): Promise<any[]> {
    const chart = await this.findByChartCode(chartCode);
    const lowerSearchTerm = searchTerm.toLowerCase();

    return chart.data.objectCodes.filter(
      (code) =>
        code.objectCode.toLowerCase().includes(lowerSearchTerm) ||
        code.objectCodeName.toLowerCase().includes(lowerSearchTerm),
    );
  }

  async getAccountsByType(chartCode: string, type: string): Promise<any[]> {
    const chart = await this.findByChartCode(chartCode);
    return chart.data.accounts.filter((acc) =>
      acc.subAccounts.some((sub) => sub.type === type),
    );
  }

  async getChartStatistics(chartCode: string): Promise<any> {
    const chart = await this.findByChartCode(chartCode);

    return {
      chartCode: chart.chartCode,
      totalAccounts: chart.data.accounts.length,
      totalSubAccounts: chart.data.accounts.reduce(
        (sum, acc) => sum + acc.subAccounts.length,
        0,
      ),
      totalObjectCodes: chart.data.objectCodes.length,
      totalMappings: chart.data.accounts.reduce(
        (sum, acc) => sum + acc.mappings.length,
        0,
      ),
    };
  }
}
