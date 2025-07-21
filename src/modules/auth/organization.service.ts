// organization.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {}

  /**
   * Update organization by ID with comprehensive validation and error handling
   */
  async updateById(
    id: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    try {
      this.logger.log(`Updating organization with ID: ${id}`);

      // Validate MongoDB ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('Invalid organization ID format');
      }

      // Check if organization exists
      const existingOrganization = await this.organizationModel
        .findById(id)
        .select('_id companyName businessEmail registrationNumber kraPin')
        .lean()
        .exec();

      if (!existingOrganization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      // Check for unique field conflicts
      await this.validateUniqueFields(updateDto, id);

      // Perform the update with validation
      const updatedOrganization = await this.organizationModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              ...updateDto,
              updatedAt: new Date(),
            },
          },
          {
            new: true,
            runValidators: true,
            context: 'query',
          },
        )
        .select(
          '-password -emailVerificationPin -phoneVerificationPin -resetPin -emailVerificationPinExpires -phoneVerificationPinExpires -resetPinExpires',
        )
        .lean()
        .exec();

      if (!updatedOrganization) {
        throw new BadRequestException('Failed to update organization');
      }

      this.logger.log(
        `Successfully updated organization: ${updatedOrganization.companyName}`,
      );
      return updatedOrganization;
    } catch (error) {
      this.logger.error(
        `Error updating organization ${id}: ${error.message}`,
        error.stack,
      );

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message,
        );
        throw new BadRequestException(
          `Validation failed: ${validationErrors.join(', ')}`,
        );
      }

      if (error.code === 11000) {
        throw new ConflictException(this.handleDuplicateKeyError(error));
      }

      throw error;
    }
  }

  /**
   * Update organization by organization ID
   */
  async updateByOrganizationId(
    organizationId: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    try {
      this.logger.log(
        `Updating organization with Organization ID: ${organizationId}`,
      );

      // Validate organization ID format
      if (!organizationId || !organizationId.startsWith('ORG-')) {
        throw new BadRequestException('Invalid organization ID format');
      }

      // Check if organization exists
      const existingOrganization = await this.organizationModel
        .findOne({ organizationId })
        .select('_id companyName businessEmail registrationNumber kraPin')
        .lean()
        .exec();

      if (!existingOrganization) {
        throw new NotFoundException(
          `Organization with ID ${organizationId} not found`,
        );
      }

      // Check for unique field conflicts
      await this.validateUniqueFields(
        updateDto,
        existingOrganization._id.toString(),
      );

      // Perform the update
      const updatedOrganization = await this.organizationModel
        .findOneAndUpdate(
          { organizationId },
          {
            $set: {
              ...updateDto,
              updatedAt: new Date(),
            },
          },
          {
            new: true,
            runValidators: true,
            context: 'query',
          },
        )
        .select(
          '-password -emailVerificationPin -phoneVerificationPin -resetPin -emailVerificationPinExpires -phoneVerificationPinExpires -resetPinExpires',
        )
        .lean()
        .exec();

      if (!updatedOrganization) {
        throw new BadRequestException('Failed to update organization');
      }

      this.logger.log(
        `Successfully updated organization: ${updatedOrganization.companyName}`,
      );
      return updatedOrganization;
    } catch (error) {
      this.logger.error(
        `Error updating organization ${organizationId}: ${error.message}`,
        error.stack,
      );

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message,
        );
        throw new BadRequestException(
          `Validation failed: ${validationErrors.join(', ')}`,
        );
      }

      if (error.code === 11000) {
        throw new ConflictException(this.handleDuplicateKeyError(error));
      }

      throw error;
    }
  }

  /**
   * Validate unique fields to prevent conflicts
   */
  private async validateUniqueFields(
    updateDto: UpdateOrganizationDto,
    excludeId: string,
  ): Promise<void> {
    const uniqueFieldChecks = [];

    // Check registration number uniqueness
    if (updateDto.registrationNumber) {
      uniqueFieldChecks.push({
        field: 'registrationNumber',
        value: updateDto.registrationNumber,
        query: {
          registrationNumber: updateDto.registrationNumber,
          _id: { $ne: excludeId },
        },
      });
    }

    // Check KRA PIN uniqueness
    if (updateDto.kraPin) {
      uniqueFieldChecks.push({
        field: 'kraPin',
        value: updateDto.kraPin,
        query: { kraPin: updateDto.kraPin, _id: { $ne: excludeId } },
      });
    }

    // Check business email uniqueness
    if (updateDto.businessEmail) {
      uniqueFieldChecks.push({
        field: 'businessEmail',
        value: updateDto.businessEmail,
        query: {
          businessEmail: updateDto.businessEmail,
          _id: { $ne: excludeId },
        },
      });
    }

    // Execute all uniqueness checks in parallel
    const checkPromises = uniqueFieldChecks.map(async (check) => {
      const existing = await this.organizationModel
        .findOne(check.query)
        .select('_id')
        .lean()
        .exec();

      if (existing) {
        throw new ConflictException(
          `Organization with ${check.field} '${check.value}' already exists`,
        );
      }
    });

    await Promise.all(checkPromises);
  }

  /**
   * Handle MongoDB duplicate key errors
   */
  private handleDuplicateKeyError(error: any): string {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];

    const fieldNames = {
      registrationNumber: 'Registration Number',
      kraPin: 'KRA PIN',
      businessEmail: 'Business Email',
    };

    const friendlyFieldName = fieldNames[field] || field;
    return `${friendlyFieldName} '${value}' already exists`;
  }
}
