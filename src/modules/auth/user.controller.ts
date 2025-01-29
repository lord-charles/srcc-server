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
  @UseGuards(JwtAuthGuard)
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
}
