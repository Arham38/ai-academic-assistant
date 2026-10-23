import { JwtPayloadDTO } from '../../application/dtos/JwtPayloadDTO';

/**
 * Domain port for cryptographic token issuance and verification.
 * Decouples the application layer from specific token algorithms and libraries.
 */
export interface ITokenProvider {
  /**
   * Generates a signed cryptographic JWT access token.
   * @param payload The non-sensitive user identity payload.
   * @returns A signed JWT string.
   */
  generateAccessToken(payload: Omit<JwtPayloadDTO, 'iat' | 'exp'>): string;

  /**
   * Cryptographically verifies a token string and returns the decoded payload.
   * @param token The raw JWT string.
   * @returns The verified payload claims.
   */
  verifyToken(token: string): JwtPayloadDTO;
}
