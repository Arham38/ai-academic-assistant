export interface RegisterUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  tenantId?: string;
}

export interface LoginUserDTO {
  email: string;
  password: string;
  tenantId?: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface LoginUserResponseDTO {
  accessToken: string;
  rawRefreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface RefreshSessionResponseDTO {
  accessToken: string;
  rawRefreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}
