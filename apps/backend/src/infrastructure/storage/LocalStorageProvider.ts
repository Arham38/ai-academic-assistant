import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { IStorageProvider } from '../../domain/providers/IStorageProvider';

const MIME_TO_EXT_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

const SAFE_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);

/**
 * Concrete storage provider persisting uploaded documents to local disk or Docker volume.
 * Incorporates strict path traversal mitigations and collision-resistant UUID naming.
 */
export class LocalStorageProvider implements IStorageProvider {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
  }

  /**
   * Resolves the safe extension from original filename and MIME type.
   */
  private resolveExtension(originalFilename?: string, mimeType?: string): string {
    if (originalFilename) {
      const ext = path.extname(originalFilename).toLowerCase();
      if (SAFE_EXTENSIONS.has(ext)) {
        return ext;
      }
    }

    if (mimeType && MIME_TO_EXT_MAP[mimeType]) {
      return MIME_TO_EXT_MAP[mimeType];
    }

    return '.bin';
  }

  /**
   * Persists binary buffer to local disk under a generated UUID filename.
   */
  public async saveFile(
    fileBuffer: Buffer,
    mimeType: string,
    originalFilename?: string,
  ): Promise<string> {
    await fs.promises.mkdir(this.baseDir, { recursive: true });

    const extension = this.resolveExtension(originalFilename, mimeType);
    const uniqueFilename = `${crypto.randomUUID()}${extension}`;
    const destinationPath = path.join(this.baseDir, uniqueFilename);

    await fs.promises.writeFile(destinationPath, fileBuffer);

    return `/uploads/${uniqueFilename}`;
  }

  /**
   * Safely deletes a file from local storage using path basename sanitization.
   */
  public async deleteFile(storageUri: string): Promise<void> {
    if (!storageUri) return;

    const safeFilename = path.basename(storageUri);
    const targetPath = path.join(this.baseDir, safeFilename);

    try {
      await fs.promises.unlink(targetPath);
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Reads raw buffer from local storage.
   */
  public async getFile(storageUri: string): Promise<Buffer> {
    const safeFilename = path.basename(storageUri);
    const targetPath = path.join(this.baseDir, safeFilename);
    return fs.promises.readFile(targetPath);
  }

  /**
   * Asserts whether a file exists in local storage.
   */
  public async exists(storageUri: string): Promise<boolean> {
    const safeFilename = path.basename(storageUri);
    const targetPath = path.join(this.baseDir, safeFilename);
    try {
      await fs.promises.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the absolute path on the host filesystem for internal services.
   */
  public getAbsolutePath(storageUri: string): string {
    const safeFilename = path.basename(storageUri);
    return path.join(this.baseDir, safeFilename);
  }
}

export const localStorageProvider = new LocalStorageProvider();
