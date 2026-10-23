/**
 * Domain port for password hashing and verification.
 * Decouples the domain and application layers from specific cryptographic libraries.
 */
export interface IHashProvider {
  /**
   * Hashes a plaintext password string.
   * @param plaintext The unhashed password string.
   * @returns The generated cryptographic hash string.
   */
  hash(plaintext: string): Promise<string>;

  /**
   * Securely compares a plaintext password with a cryptographic hash.
   * @param plaintext The unhashed password string.
   * @param hash The stored cryptographic hash.
   * @returns True if the plaintext matches the hash, false otherwise.
   */
  compare(plaintext: string, hash: string): Promise<boolean>;
}
