import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './schemas/project.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoiceController } from './controllers/invoice.controller';
import { BudgetController } from './controllers/budget.controller';
import { InvoiceService } from './services/invoice.service';
import { BudgetService } from './services/budget.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { NotificationService } from '../notifications/services/notification.service';
import { Budget, BudgetSchema } from './schemas/budget.schema';
import { Contract, ContractSchema } from './schemas/contract.schema';
import { ContractController } from './controllers/contract.controller';
import { ContractService } from './services/contract.service';
import { ContractTemplate, ContractTemplateSchema } from './schemas/contract-template.schema';
import { ContractTemplateController } from './controllers/contract-template.controller';
import { ContractTemplateService } from './services/contract-template.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Budget.name, schema: BudgetSchema },
      { name: User.name, schema: UserSchema },
      { name: ContractTemplate.name, schema: ContractTemplateSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [
    ProjectController,
    InvoiceController,
    BudgetController,
    ContractController,
    ContractTemplateController,
  ],
  providers: [
    ProjectService,
    InvoiceService,
    BudgetService,
    NotificationService,
    ContractService,
    ContractTemplateService,
  ],
  exports: [ProjectService, ContractService],
})
export class ProjectModule {}

