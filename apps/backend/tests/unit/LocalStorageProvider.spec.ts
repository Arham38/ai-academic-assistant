import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LocalStorageProvider } from '../../src/infrastructure/storage/LocalStorageProvider';

describe('LocalStorageProvider Unit Tests', () => {
  let tempDir: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    provider = new LocalStorageProvider(tempDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('should save a valid PDF buffer and return /uploads/<uuid>.pdf URI', async () => {
    const buffer = Buffer.from('%PDF-1.4 test document content');
    const uri = await provider.saveFile(buffer, 'application/pdf', 'my-thesis.pdf');

    expect(uri).toMatch(/^\/uploads\/[0-9a-f-]{36}\.pdf$/);
    const exists = await provider.exists(uri);
    expect(exists).toBe(true);

    const retrieved = await provider.getFile(uri);
    expect(retrieved.toString()).toBe('%PDF-1.4 test document content');
  });

  it('should mitigate path traversal attacks by ignoring malicious filenames', async () => {
    const buffer = Buffer.from('malicious payload');
    const maliciousName = '../../../../etc/passwd.pdf';

    const uri = await provider.saveFile(buffer, 'application/pdf', maliciousName);

    expect(uri).toMatch(/^\/uploads\/[0-9a-f-]{36}\.pdf$/);
    expect(uri).not.toContain('..');

    const absolutePath = provider.getAbsolutePath(uri);
    expect(absolutePath.startsWith(tempDir)).toBe(true);
    expect(fs.existsSync(absolutePath)).toBe(true);
  });

  it('should map extension correctly when filename has no extension or disallowed extension', async () => {
    const buffer = Buffer.from('docx content');
    const uri = await provider.saveFile(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'thesis.exe',
    );

    // .exe is not in safe extensions, fallback to MIME map .docx
    expect(uri.endsWith('.docx')).toBe(true);
  });

  it('should delete a persisted file and become non-existent', async () => {
    const buffer = Buffer.from('sample text content');
    const uri = await provider.saveFile(buffer, 'text/plain', 'notes.txt');

    expect(await provider.exists(uri)).toBe(true);

    await provider.deleteFile(uri);
    expect(await provider.exists(uri)).toBe(false);
  });

  it('should silently handle deletion of a non-existent file without throwing (idempotency)', async () => {
    await expect(provider.deleteFile('/uploads/non-existent-uuid.pdf')).resolves.toBeUndefined();
  });
});
