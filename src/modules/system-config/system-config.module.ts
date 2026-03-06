import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartsOfAccounts, ChartsOfAccountsSchema } from './schemas/charts-of-accounts.schema';
import { ChartsOfAccountsService } from './services/charts-of-accounts.service';
import { ChartsOfAccountsController } from './controllers/charts-of-accounts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartsOfAccounts.name, schema: ChartsOfAccountsSchema },
    ]),
  ],
  controllers: [ ChartsOfAccountsController],
  providers: [ChartsOfAccountsService],
  exports: [ ChartsOfAccountsService],
})
export class SystemConfigModule {}
