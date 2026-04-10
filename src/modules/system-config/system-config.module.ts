import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChartsOfAccounts,
  ChartsOfAccountsSchema,
} from './schemas/charts-of-accounts.schema';
import { ChartsOfAccountsService } from './services/charts-of-accounts.service';
import { ChartsOfAccountsController } from './controllers/charts-of-accounts.controller';
import {
  SystemConfig,
  SystemConfigSchema,
} from './schemas/system-config.schema';
import { SystemConfigService } from './services/system-config.service';
import { SystemConfigController } from './controllers/system-config.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartsOfAccounts.name, schema: ChartsOfAccountsSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
    ]),
  ],
  controllers: [ChartsOfAccountsController, SystemConfigController],
  providers: [ChartsOfAccountsService, SystemConfigService],
  exports: [ChartsOfAccountsService, SystemConfigService],
})
export class SystemConfigModule {}
