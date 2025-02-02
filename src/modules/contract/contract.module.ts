import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contract, ContractSchema } from './schemas/contract.schema';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Contract.name, schema: ContractSchema }])
  ],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService]
})
export class ContractModule {}
