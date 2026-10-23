/**
 * Document Processing State Machine and MIME Type Definitions.
 * Governs the lifecycle of an uploaded academic document.
 */

export enum DocumentStatus {
  PENDING = 'PENDING',
  PARSING = 'PARSING',
  EMBEDDING = 'EMBEDDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum DocumentMimeType {
  PDF = 'application/pdf',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT = 'text/plain',
}

export const ALLOWED_MIME_TYPES = [
  DocumentMimeType.PDF,
  DocumentMimeType.DOCX,
  DocumentMimeType.TXT,
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isValidDocumentStatus(value: unknown): value is DocumentStatus {
  return (
    typeof value === 'string' && Object.values(DocumentStatus).includes(value as DocumentStatus)
  );
}

export function isValidMimeType(value: unknown): value is AllowedMimeType {
  return typeof value === 'string' && ALLOWED_MIME_TYPES.includes(value as AllowedMimeType);
}
