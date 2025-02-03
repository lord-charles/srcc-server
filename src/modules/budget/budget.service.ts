import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Budget, BudgetDocument } from './schemas/budget.schema';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
  ) {}

  async create(createBudgetDto: CreateBudgetDto): Promise<Budget> {
    const createdBudget = new this.budgetModel(createBudgetDto);
    return createdBudget.save();
  }

  async findAll(): Promise<Budget[]> {
    return this.budgetModel.find().exec();
  }

  async findOne(id: string): Promise<Budget> {
    const budget = await this.budgetModel.findById(id).exec();
    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }
    return budget;
  }

  async findByProject(projectId: string): Promise<Budget[]> {
    return this.budgetModel.find({ projectId: new Types.ObjectId(projectId) }).exec();
  }

  async update(id: string, updateBudgetDto: UpdateBudgetDto): Promise<Budget> {
    const existingBudget = await this.budgetModel
      .findByIdAndUpdate(id, updateBudgetDto, { new: true })
      .exec();
    
    if (!existingBudget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }
    return existingBudget;
  }

  async remove(id: string): Promise<Budget> {
    const deletedBudget = await this.budgetModel.findByIdAndDelete(id).exec();
    if (!deletedBudget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }
    return deletedBudget;
  }

  async updateBudgetStatus(id: string, status: string): Promise<Budget> {
    const budget = await this.budgetModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    
    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }
    return budget;
  }

}
