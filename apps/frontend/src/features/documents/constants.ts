/**
 * Client-side file upload limits and MIME specifications.
 * Directly mirrored from backend Multer and Document schema configurations.
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export const ACCEPTED_FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
};

export const ACCEPTED_EXTENSIONS_LABEL = 'PDF, DOCX, TXT';
