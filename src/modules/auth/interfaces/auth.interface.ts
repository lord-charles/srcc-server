import { User } from '../schemas/user.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  position?: string;
  department?: string;
  registrationStatus?: string;
}

export interface AuthResponse {
  user: Partial<User>;
  token: string;
}

export interface TokenPayload {
  token: string;
  expiresIn: number;
}
