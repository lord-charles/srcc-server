import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './schemas/project.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Contract, ContractSchema } from '../contract/schemas/contract.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoiceController } from './controllers/invoice.controller';
import { BudgetController } from './controllers/budget.controller';
import { InvoiceService } from './services/invoice.service';
import { BudgetService } from './services/budget.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { NotificationService } from '../notifications/services/notification.service';
import { Budget, BudgetSchema } from './schemas/budget.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Budget.name, schema: BudgetSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ProjectController, InvoiceController, BudgetController],
  providers: [
    ProjectService,
    InvoiceService,
    BudgetService,
    NotificationService,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
