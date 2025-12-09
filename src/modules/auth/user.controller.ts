import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserFilterDto } from './dto/filter.dto';
import { Request } from 'express';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // List all users with optional filters
  // @Roles('admin', 'hr')
  @Get('/users')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all employees',
    description:
      'Returns paginated list of employees. All filters are optional.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
  })
  async findAll(@Query() filterDto: UserFilterDto, @Req() req: Request) {
    const {
      status,
      department,
      employmentType,
      page = 1,
      limit = 10,
    } = filterDto;
    return this.userService.findAll({
      status,
      department,
      employmentType,
      page,
      limit,
    });
  }

  // Get user by ID - Returns detailed user information
  @Get('/user/:id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get employee by ID',
    description: 'Returns detailed information about a specific employee',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee details retrieved successfully',
    type: CreateUserDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  // Find user by National ID
  @Get('/user/national-id/:nationalId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find user by National ID',
    description: 'Returns user information based on National ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User found successfully',
    type: CreateUserDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findByNationalId(
    @Param('nationalId') nationalId: string,
    @Req() req: any,
  ) {
    return this.userService.findByNationalId(nationalId);
  }

  // Update user details
  // @Roles('admin', 'hr')
  @Patch('/user/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update employee details',
    description:
      'Update employee information including personal and employment details',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    type: CreateUserDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.userService.update(id, updateUserDto, req);
  }

  // Delete user
  // @Roles('admin')
  @Delete('/user/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete employee',
    description: 'Permanently removes employee from the system',
  })
  @ApiResponse({
    status: 204,
    description: 'Employee deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  async remove(@Param('id') id: string, @Req() req: Request) {
    return this.userService.remove(id, req);
  }

  // Suspend user
  @Patch('/users/:id/suspend')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend a user account',
    description:
      'Suspends a user account. Suspended users cannot access the system until unsuspended.',
  })
  @ApiResponse({
    status: 200,
    description: 'User suspended successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'User is already suspended',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async suspendUser(
    @Param('id') userId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.userService.suspendUser(userId, req.user.sub, reason);
  }

  // Unsuspend user
  @Patch('/users/:id/unsuspend')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unsuspend a user account',
    description:
      'Reactivates a suspended user account. User will be able to access the system again.',
  })
  @ApiResponse({
    status: 200,
    description: 'User unsuspended successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'User is not suspended',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async unsuspendUser(@Param('id') userId: string, @Req() req: any) {
    return this.userService.unsuspendUser(userId, req.user.sub);
  }

  // Update user status
  @Patch('/users/:id/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user account status',
    description:
      'Updates user account status. Valid statuses: pending, active, inactive, suspended, terminated',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status provided',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserStatus(
    @Param('id') userId: string,
    @Body('status') status: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.userService.updateUserStatus(
      userId,
      status,
      req.user.sub,
      reason,
    );
  }
}
