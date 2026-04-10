import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from './dto/create-supplier.dto';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    try {
      const emailExists = await this.supplierModel.findOne({
        email: createSupplierDto.email,
      });
      if (emailExists) {
        throw new BadRequestException(
          'Supplier with this email already exists',
        );
      }

      const kraPinExists = await this.supplierModel.findOne({
        kraPin: createSupplierDto.kraPin,
      });
      if (kraPinExists) {
        throw new BadRequestException(
          'Supplier with this KRA PIN already exists',
        );
      }

      // Default status if not provided, assuming approval process
      const statusToSet = createSupplierDto.status || 'pending_approval';

      const createdSupplier = new this.supplierModel({
        ...createSupplierDto,
        status: statusToSet,
      });

      return await createdSupplier.save();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error creating supplier: ${error.message}`);
      throw new InternalServerErrorException('Failed to create supplier');
    }
  }

  async findAll(query?: any): Promise<Supplier[]> {
    try {
      const filter: any = { isDeleted: { $ne: true } };

      if (query?.status) {
        filter.status = query.status;
      }

      if (query?.supplierCategory) {
        filter.supplierCategory = query.supplierCategory;
      }

      if (query?.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { email: { $regex: query.search, $options: 'i' } },
          { kraPin: { $regex: query.search, $options: 'i' } },
        ];
      }

      return await this.supplierModel
        .find(filter)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName email')
        .exec();
    } catch (error) {
      this.logger.error(`Error fetching suppliers: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch suppliers');
    }
  }

  async search(query: string): Promise<Partial<Supplier>[]> {
    try {
      if (!query) return [];

      const filter: any = {
        isDeleted: { $ne: true },
        status: 'active', // Only search for active suppliers for LPO
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { kraPin: { $regex: query, $options: 'i' } },
        ],
      };

      return await this.supplierModel
        .find(filter)
        .select('_id name email kraPin')
        .limit(20)
        .exec();
    } catch (error) {
      this.logger.error(`Error searching suppliers: ${error.message}`);
      throw new InternalServerErrorException('Failed to search suppliers');
    }
  }

  async findOne(id: string): Promise<Supplier> {
    try {
      const supplier = await this.supplierModel
        .findOne({ _id: id, isDeleted: { $ne: true } })
        .populate('createdBy', 'firstName lastName email')
        .exec();

      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }

      return supplier;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching supplier ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch supplier');
    }
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    try {
      // Check for uniqueness conflicts if updating email or kra
      if (updateSupplierDto.email) {
        const existing = await this.supplierModel.findOne({
          email: updateSupplierDto.email,
          _id: { $ne: id },
        });
        if (existing)
          throw new BadRequestException(
            'Email already in use by another supplier',
          );
      }

      if (updateSupplierDto.kraPin) {
        const existing = await this.supplierModel.findOne({
          kraPin: updateSupplierDto.kraPin,
          _id: { $ne: id },
        });
        if (existing)
          throw new BadRequestException(
            'KRA PIN already in use by another supplier',
          );
      }

      const updatedSupplier = await this.supplierModel
        .findByIdAndUpdate(id, updateSupplierDto, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedSupplier) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }

      return updatedSupplier;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error updating supplier ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to update supplier');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.supplierModel
        .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
        .exec();
      if (!result) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting supplier ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete supplier');
    }
  }

  async getStats(): Promise<any> {
    try {
      const stats = await this.supplierModel.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalSuppliers: { $sum: 1 },
            activeSuppliers: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
            },
            pendingSuppliers: {
              $sum: { $cond: [{ $eq: ['$status', 'pending_approval'] }, 1, 0] },
            },
            goodsSuppliers: {
              $sum: {
                $cond: [
                  { $in: ['$supplierCategory', ['Goods', 'Both']] },
                  1,
                  0,
                ],
              },
            },
            servicesSuppliers: {
              $sum: {
                $cond: [
                  { $in: ['$supplierCategory', ['Services', 'Both']] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const result =
        stats.length > 0
          ? stats[0]
          : {
              totalSuppliers: 0,
              activeSuppliers: 0,
              pendingSuppliers: 0,
              goodsSuppliers: 0,
              servicesSuppliers: 0,
            };

      if (result._id === null) delete result._id;
      return result;
    } catch (error) {
      this.logger.error(`Error fetching supplier stats: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to fetch supplier statistics',
      );
    }
  }
}
