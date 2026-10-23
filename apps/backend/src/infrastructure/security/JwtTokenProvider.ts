import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { ITokenProvider } from '../../domain/providers/ITokenProvider';
import { JwtPayloadDTO } from '../../application/dtos/JwtPayloadDTO';

/**
 * Concrete implementation of ITokenProvider using jsonwebtoken with HMAC-SHA256.
 * Enforces algorithm hardening (algorithms: ['HS256']) to prevent algorithm substitution attacks.
 */
export class JwtTokenProvider implements ITokenProvider {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = '15m',
  ) {}

  public generateAccessToken(payload: Omit<JwtPayloadDTO, 'iat' | 'exp'>): string {
    const signOptions: SignOptions = {
      algorithm: 'HS256',
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, this.secret, signOptions);
  }

  public verifyToken(token: string): JwtPayloadDTO {
    const verifyOptions: VerifyOptions = {
      algorithms: ['HS256'],
    };

    const decoded = jwt.verify(token, this.secret, verifyOptions);
    return decoded as JwtPayloadDTO;
  }
}
