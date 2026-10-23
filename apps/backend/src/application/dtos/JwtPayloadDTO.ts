export interface JwtPayloadDTO {
  id: string;
  role: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}
