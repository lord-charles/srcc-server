import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdateUserDto } from './dto/user.dto';
import { User, UserDocument } from './schemas/user.schema';
import { SystemLogsService } from '../system-logs/services/system-logs.service';
import { LogSeverity } from '../system-logs/schemas/system-log.schema';
import { Request } from 'express';
import { UserDto } from './dto/update-consultant.dto';
import { Logger } from '@nestjs/common';
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly systemLogsService: SystemLogsService,
  ) {}

  async findByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async findAll(filters: any): Promise<{ data: User[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      status,
      department,
      employmentType,
    } = filters;

    // Build query object with only defined filters
    const query: any = {};
    if (status) query.status = status;
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;

    // Execute query with pagination
    const data = await this.userModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    const total = await this.userModel.countDocuments(query);
    return { data, total };
  }

  /**
   * @description Update an employee's details
   * @param id
   * @param updateUserDto
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    req?: Request,
  ): Promise<User> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      updateUserDto,
      { new: true },
    );
    if (!updatedUser) throw new NotFoundException('User not found');

    await this.systemLogsService.createLog(
      'User Update',
      `User ${updatedUser.firstName} ${updatedUser.lastName} details updated`,
      LogSeverity.INFO,
      updatedUser.employeeId?.toString(),
      req,
    );

    return updatedUser;
  }

  /**
   * @description Delete an employee by ID
   * @param id
   */
  async remove(id: string, req?: Request): Promise<void> {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');

    await this.systemLogsService.createLog(
      'User Deletion',
      `User ${user.firstName} ${user.lastName} was deleted`,
      LogSeverity.WARNING,
      user.employeeId?.toString(),
      req,
    );
  }

  /**
   * Find a user by National ID
   * @param nationalId National ID
   * @returns User
   */
  async findByNationalId(nationalId: string): Promise<User> {
    const user = await this.userModel.findOne({ nationalId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserById(
    id: string,
    updateUserDto: Partial<UserDto>,
  ): Promise<UserDocument> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(id)) {
        this.logger.warn(`Invalid ObjectId format: ${id}`);
        throw new BadRequestException('Invalid user ID format');
      }

      // Check if user exists first
      const existingUser = await this.userModel
        .findById(id)
        .select('_id email phoneNumber nationalId')
        .lean();

      if (!existingUser) {
        this.logger.warn(`User not found with ID: ${id}`);
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Validate unique fields if they're being updated
      await this.validateUniqueFields(id, updateUserDto);

      // Validate business rules
      this.validateBusinessRules(updateUserDto);

      // Perform the update with proper error handling
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              ...updateUserDto,
              ...(updateUserDto.email && {
                email: updateUserDto.email.toLowerCase(),
              }),
            },
          },
          {
            new: true,
            runValidators: true,
            lean: false,
          },
        )
        .select(
          '-password -passwordResetToken -passwordResetExpires -phoneVerificationPin -emailVerificationPin -phoneVerificationPinExpires -emailVerificationPinExpires',
        )
        .exec();

      if (!updatedUser) {
        this.logger.error(`Failed to update user with ID: ${id}`);
        throw new InternalServerErrorException('Failed to update user');
      }

      this.logger.log(`Successfully updated user with ID: ${id}`);
      return updatedUser;
    } catch (error) {
      this.handleUpdateError(error, id);
    }
  }

  /**
   * Validates unique field constraints
   * @private
   */
  private async validateUniqueFields(
    userId: string,
    updateData: Partial<UserDto>,
  ): Promise<void> {
    const uniqueFields = ['email', 'phoneNumber', 'nationalId'];
    const conflicts: string[] = [];

    for (const field of uniqueFields) {
      if (updateData[field]) {
        const query = {
          [field]:
            field === 'email'
              ? updateData[field].toLowerCase()
              : updateData[field],
          _id: { $ne: userId },
        };

        const existingUser = await this.userModel
          .findOne(query)
          .select('_id')
          .lean();

        if (existingUser) {
          conflicts.push(field);
        }
      }
    }

    if (conflicts.length > 0) {
      const conflictMessage = `The following fields already exist: ${conflicts.join(', ')}`;
      this.logger.warn(
        `Unique constraint violation for user ${userId}: ${conflictMessage}`,
      );
      throw new ConflictException(conflictMessage);
    }
  }

  /**
   * Validates business rules
   * @private
   */
  private validateBusinessRules(updateData: Partial<UserDto>): void {
    // Validate hourly rate
    if (updateData.hourlyRate !== undefined && updateData.hourlyRate < 0) {
      throw new BadRequestException('Hourly rate cannot be negative');
    }

    // Validate years of experience
    if (
      updateData.yearsOfExperience !== undefined &&
      updateData.yearsOfExperience < 0
    ) {
      throw new BadRequestException('Years of experience cannot be negative');
    }

    // Validate certifications expiry dates
    if (updateData.certifications) {
      for (const cert of updateData.certifications) {
        if (
          cert.expiryDate &&
          cert.dateIssued &&
          cert.expiryDate <= cert.dateIssued
        ) {
          throw new BadRequestException(
            `Certification ${cert.name} expiry date must be after issue date`,
          );
        }
      }
    }

    // Validate date of birth (must be in the past and reasonable)
    if (updateData.dateOfBirth) {
      const birthDate = new Date(updateData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (birthDate >= today) {
        throw new BadRequestException('Date of birth must be in the past');
      }

      if (age > 100 || age < 16) {
        throw new BadRequestException(
          'Invalid age: must be between 16 and 100 years',
        );
      }
    }

    // Validate preferred work types (no duplicates)
    if (
      updateData.preferredWorkTypes &&
      updateData.preferredWorkTypes.length > 0
    ) {
      const uniqueWorkTypes = [...new Set(updateData.preferredWorkTypes)];
      if (uniqueWorkTypes.length !== updateData.preferredWorkTypes.length) {
        throw new BadRequestException(
          'Duplicate preferred work types are not allowed',
        );
      }
    }

    // Validate skills (no duplicate skill names)
    if (updateData.skills && updateData.skills.length > 0) {
      const skillNames = updateData.skills.map((skill) =>
        skill.name.toLowerCase(),
      );
      const uniqueSkillNames = [...new Set(skillNames)];
      if (uniqueSkillNames.length !== skillNames.length) {
        throw new BadRequestException('Duplicate skills are not allowed');
      }
    }
  }

  /**
   * Handles and transforms errors appropriately
   * @private
   */
  private handleUpdateError(error: any, userId: string): never {
    this.logger.error(`Error updating user ${userId}:`, error.stack);

    // Re-throw custom exceptions
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors)
        .map((err: any) => err.message)
        .join(', ');
      throw new BadRequestException(`Validation failed: ${validationErrors}`);
    }

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
      throw new ConflictException(`${duplicateField} already exists`);
    }

    // Handle MongoDB cast errors
    if (error.name === 'CastError') {
      throw new BadRequestException(
        `Invalid data type for field: ${error.path}`,
      );
    }

    // Handle other database errors
    throw new InternalServerErrorException(
      'An unexpected error occurred while updating user',
    );
  }

  /**
   * Retrieves user by ID with proper error handling
   * @param id - User ID
   * @returns Promise<UserDocument> - User document
   */
  async findUserById(id: string): Promise<UserDocument> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const user = await this.userModel
        .findById(id)
        .select(
          '-password -passwordResetToken -passwordResetExpires -phoneVerificationPin -emailVerificationPin -phoneVerificationPinExpires -emailVerificationPinExpires',
        )
        .exec();

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error finding user ${id}:`, error.stack);
      throw new InternalServerErrorException(
        'An error occurred while retrieving user',
      );
    }
  }

  /**
   * Checks if user exists by ID
   * @param id - User ID
   * @returns Promise<boolean> - Whether user exists
   */
  async userExists(id: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return false;
      }

      const user = await this.userModel.findById(id).select('_id').lean();
      return !!user;
    } catch (error) {
      this.logger.error(`Error checking user existence ${id}:`, error.stack);
      return false;
    }
  }

  /**
   * Suspend a user account
   * @param userId - User ID to suspend
   * @param adminId - Admin performing the action
   * @param reason - Reason for suspension
   * @returns Promise<User> - Updated user
   */
  async suspendUser(
    userId: string,
    adminId: string,
    reason?: string,
  ): Promise<User> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.status === 'suspended') {
        throw new BadRequestException('User is already suspended');
      }

      user.status = 'suspended';
      await user.save();

      this.logger.warn(
        `User ${user.email} (ID: ${userId}) suspended by admin ${adminId}. Reason: ${reason || 'Not provided'}`,
      );

      return user;
    } catch (error) {
      this.logger.error(`Error suspending user ${userId}:`, error.stack);
      throw error;
    }
  }

  /**
   * Unsuspend a user account (reactivate)
   * @param userId - User ID to unsuspend
   * @param adminId - Admin performing the action
   * @returns Promise<User> - Updated user
   */
  async unsuspendUser(userId: string, adminId: string): Promise<User> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.status !== 'suspended') {
        throw new BadRequestException('User is not suspended');
      }

      user.status = 'active';
      await user.save();

      this.logger.log(
        `User ${user.email} (ID: ${userId}) unsuspended by admin ${adminId}`,
      );

      return user;
    } catch (error) {
      this.logger.error(`Error unsuspending user ${userId}:`, error.stack);
      throw error;
    }
  }

  /**
   * Update user status
   * @param userId - User ID
   * @param status - New status
   * @param adminId - Admin performing the action
   * @param reason - Reason for status change
   * @returns Promise<User> - Updated user
   */
  async updateUserStatus(
    userId: string,
    status: string,
    adminId: string,
    reason?: string,
  ): Promise<User> {
    try {
      const validStatuses = [
        'pending',
        'active',
        'inactive',
        'suspended',
        'terminated',
      ];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        );
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const oldStatus = user.status;
      user.status = status;
      await user.save();

      this.logger.log(
        `User ${user.email} (ID: ${userId}) status changed from ${oldStatus} to ${status} by admin ${adminId}. Reason: ${reason || 'Not provided'}`,
      );

      return user;
    } catch (error) {
      this.logger.error(`Error updating user status ${userId}:`, error.stack);
      throw error;
    }
  }
}
