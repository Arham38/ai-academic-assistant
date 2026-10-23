import { SystemRole } from '../../domain/types/Roles';

export interface GetUserProfileDTO {
  userId: string;
}

export interface UpdateUserProfileDTO {
  userId: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserPasswordDTO {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface UserProfileResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SystemRole;
  status: string;
  createdAt: string;
}

export interface UpdatePasswordResponseDTO {
  status: 'success';
  message: string;
}
