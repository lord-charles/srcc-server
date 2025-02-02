import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractorController } from './contractor.controller';
import { ContractorService } from './contractor.service';
import { Contractor, ContractorSchema } from './schemas/contractor.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contractor.name, schema: ContractorSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ContractorController],
  providers: [ContractorService],
  exports: [ContractorService],
})
export class ContractorModule {}
