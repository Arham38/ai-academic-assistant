/**
 * Domain interface defining the contract for physical document storage providers.
 * Decouples the application and domain layers from concrete storage mechanisms
 * (e.g., local Docker volume, AWS S3, Google Cloud Storage, Azure Blob Storage).
 */
export interface IStorageProvider {
  /**
   * Persists a raw file buffer to storage under a collision-resistant identifier.
   *
   * @param fileBuffer - Raw binary buffer of the uploaded file
   * @param mimeType - MIME type of the file
   * @param originalFilename - Original filename uploaded by the client (for extension resolution)
   * @returns Resolvable storage URI (e.g., `/uploads/<uuid>.pdf`)
   */
  saveFile(fileBuffer: Buffer, mimeType: string, originalFilename?: string): Promise<string>;

  /**
   * Deletes a file at the specified storage URI.
   * Must be idempotent and safe against non-existent files.
   *
   * @param storageUri - The storage URI previously returned by saveFile
   */
  deleteFile(storageUri: string): Promise<void>;

  /**
   * Reads and returns the binary content of a file from storage.
   *
   * @param storageUri - The storage URI previously returned by saveFile
   */
  getFile?(storageUri: string): Promise<Buffer>;

  /**
   * Checks if a file exists at the specified storage URI.
   *
   * @param storageUri - The storage URI
   */
  exists?(storageUri: string): Promise<boolean>;
}
