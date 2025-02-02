import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contractor, ContractorDocument } from './schemas/contractor.schema';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';


@Injectable()
export class ContractorService {
  constructor(
    @InjectModel(Contractor.name)
    private contractorModel: Model<ContractorDocument>,
  ) {}

  async create(createContractorDto: CreateContractorDto): Promise<Contractor> {
    // Check if contractor with same registration number or KRA PIN exists
    const existingContractor = await this.contractorModel.findOne({
      $or: [
        { registrationNumber: createContractorDto.registrationNumber },
        { kraPinNumber: createContractorDto.kraPinNumber }
      ]
    });

    if (existingContractor) {
      if (existingContractor.registrationNumber === createContractorDto.registrationNumber) {
        throw new ConflictException(`Contractor with registration number ${createContractorDto.registrationNumber} already exists`);
      }
      if (existingContractor.kraPinNumber === createContractorDto.kraPinNumber) {
        throw new ConflictException(`Contractor with KRA PIN number ${createContractorDto.kraPinNumber} already exists`);
      }
    }

    // Parse nested objects if they are strings
    const transformedDto = {
      ...createContractorDto,
      companyContactDetails: typeof createContractorDto.companyContactDetails === 'string'
        ? JSON.parse(createContractorDto.companyContactDetails)
        : createContractorDto.companyContactDetails,
      contactPersonDetails: typeof createContractorDto.contactPersonDetails === 'string'
        ? JSON.parse(createContractorDto.contactPersonDetails)
        : createContractorDto.contactPersonDetails
    };

    const createdContractor = new this.contractorModel(transformedDto);
    return createdContractor.save();
  }

  async findAll(): Promise<Contractor[]> {
    return this.contractorModel.find().exec();
  }

  async findOne(id: string): Promise<Contractor> {
    const contractor = await this.contractorModel.findById(id).exec();
    if (!contractor) {
      throw new NotFoundException(`Contractor with ID ${id} not found`);
    }
    return contractor;
  }

  async update(id: string, updateContractorDto: UpdateContractorDto): Promise<Contractor> {
    const updatedContractor = await this.contractorModel
      .findByIdAndUpdate(id, updateContractorDto, { new: true })
      .exec();
    
    if (!updatedContractor) {
      throw new NotFoundException(`Contractor with ID ${id} not found`);
    }
    
    return updatedContractor;
  }

  async remove(id: string): Promise<void> {
    const contractor = await this.contractorModel.findById(id);
    await contractor.deleteOne();
  }
}
