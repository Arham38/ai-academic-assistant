import { SystemRole } from '../../domain/types/Roles';

export interface JwtPayloadDTO {
  id: string;
  role: SystemRole;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}
