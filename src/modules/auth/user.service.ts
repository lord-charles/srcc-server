import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {  UpdateUserDto } from './dto/user.dto';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { NotificationService } from '../notifications/services/notification.service';
import { SystemLogsService } from '../system-logs/services/system-logs.service';
import { LogSeverity } from '../system-logs/schemas/system-log.schema';
import { Request } from 'express';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
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

  /**
   * @description List all employees with optional filters
   * @param filters
   * @returns Paginated list of employees
   */
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
}
