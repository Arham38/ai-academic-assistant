import bcrypt from 'bcryptjs';
import { IHashProvider } from '../../domain/providers/IHashProvider';

/**
 * Concrete implementation of IHashProvider using bcryptjs.
 * Operates in pure JavaScript to prevent native compilation issues across containerized environments.
 */
export class BcryptHashProvider implements IHashProvider {
  private readonly saltRounds: number;

  constructor(saltRounds = 12) {
    this.saltRounds = saltRounds;
  }

  public async hash(plaintext: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.saltRounds);
    return bcrypt.hash(plaintext, salt);
  }

  public async compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
