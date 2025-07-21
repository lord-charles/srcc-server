import { LoginUserDto } from '../dto/login.dto';
import { LoginOrganizationDto } from '../dto/login-organization.dto';

export type LoginType = 'user' | 'organization';

export type LoginDto = LoginUserDto | LoginOrganizationDto;

export interface LoginResponse {
  user?: any;
  organization?: any;
  token: string;
  type: LoginType;
}

export interface AuthPayload {
  id: string;
  email: string;
  type: LoginType;
  roles: string[];
}
