import { describe, it, expect } from 'vitest';
import { Document } from '../../src/domain/entities/Document';
import { DocumentStatus, DocumentMimeType } from '../../src/domain/types/DocumentStatus';

describe('Document Domain Entity', () => {
  const validProps = {
    userId: '507f1f77bcf86cd799439011',
    originalFilename: 'quantum_computing_survey.pdf',
    storageUri: 's3://academic-bucket/papers/quantum_computing_survey.pdf',
    mimeType: DocumentMimeType.PDF,
    sizeBytes: 1048576, // 1 MB
  };

  describe('Instantiation & Validation', () => {
    it('should successfully instantiate a Document with valid properties and defaults', () => {
      const doc = new Document(validProps);

      expect(doc.userId).toBe('507f1f77bcf86cd799439011');
      expect(doc.originalFilename).toBe('quantum_computing_survey.pdf');
      expect(doc.title).toBe('quantum_computing_survey.pdf');
      expect(doc.storageUri).toBe('s3://academic-bucket/papers/quantum_computing_survey.pdf');
      expect(doc.mimeType).toBe(DocumentMimeType.PDF);
      expect(doc.sizeBytes).toBe(1048576);
      expect(doc.status).toBe(DocumentStatus.PENDING);
      expect(doc.errorMessage).toBeUndefined();
      expect(doc.metadata.language).toBe('en');
      expect(doc.isDeleted).toBe(false);
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow custom title when provided', () => {
      const doc = new Document({
        ...validProps,
        title: 'Quantum Computing Comprehensive Review 2026',
      });

      expect(doc.title).toBe('Quantum Computing Comprehensive Review 2026');
    });

    it('should reject missing or empty userId', () => {
      expect(() => new Document({ ...validProps, userId: '' })).toThrow(/userId is required/);
      expect(() => new Document({ ...validProps, userId: '   ' })).toThrow(/userId is required/);
    });

    it('should reject missing or empty originalFilename', () => {
      expect(() => new Document({ ...validProps, originalFilename: '' })).toThrow(
        /originalFilename is required/,
      );
    });

    it('should reject missing or empty storageUri', () => {
      expect(() => new Document({ ...validProps, storageUri: '' })).toThrow(
        /storageUri is required/,
      );
    });

    it('should reject negative sizeBytes', () => {
      expect(() => new Document({ ...validProps, sizeBytes: -1 })).toThrow(
        /sizeBytes must be a non-negative number/,
      );
    });

    it('should reject unsupported MIME types', () => {
      expect(() => new Document({ ...validProps, mimeType: 'application/x-msdownload' })).toThrow(
        /Unsupported MIME type/,
      );
    });

    it('should accept all supported MIME types (PDF, DOCX, TXT)', () => {
      const pdfDoc = new Document({ ...validProps, mimeType: DocumentMimeType.PDF });
      const docxDoc = new Document({ ...validProps, mimeType: DocumentMimeType.DOCX });
      const txtDoc = new Document({ ...validProps, mimeType: DocumentMimeType.TXT });

      expect(pdfDoc.mimeType).toBe(DocumentMimeType.PDF);
      expect(docxDoc.mimeType).toBe(DocumentMimeType.DOCX);
      expect(txtDoc.mimeType).toBe(DocumentMimeType.TXT);
    });

    it('should throw invariant error if instantiated as COMPLETED without a valid wordCount', () => {
      expect(
        () =>
          new Document({
            ...validProps,
            status: DocumentStatus.COMPLETED,
            metadata: { pageCount: 10 },
          }),
      ).toThrow(/Document cannot be in COMPLETED status without a valid non-negative wordCount/);
    });
  });

  describe('State Machine Transitions', () => {
    it('should transition through standard lifecycle: PENDING -> PARSING -> EMBEDDING -> COMPLETED', () => {
      const doc = new Document(validProps);
      expect(doc.status).toBe(DocumentStatus.PENDING);
      expect(doc.isProcessing()).toBe(false);

      // 1. PENDING -> PARSING
      doc.startParsing();
      expect(doc.status).toBe(DocumentStatus.PARSING);
      expect(doc.isProcessing()).toBe(true);

      // 2. PARSING -> EMBEDDING
      doc.startEmbedding();
      expect(doc.status).toBe(DocumentStatus.EMBEDDING);
      expect(doc.isProcessing()).toBe(true);

      // 3. EMBEDDING -> COMPLETED
      doc.completeProcessing({ wordCount: 4500, pageCount: 12 });
      expect(doc.status).toBe(DocumentStatus.COMPLETED);
      expect(doc.isProcessing()).toBe(false);
      expect(doc.metadata.wordCount).toBe(4500);
      expect(doc.metadata.pageCount).toBe(12);
    });

    it('should prevent invalid jump from PENDING directly to COMPLETED', () => {
      const doc = new Document(validProps);
      expect(() => doc.completeProcessing({ wordCount: 2000 })).toThrow(
        /Invalid state transition: Cannot transition document from PENDING to COMPLETED/,
      );
    });

    it('should prevent invalid jump from PENDING directly to EMBEDDING', () => {
      const doc = new Document(validProps);
      expect(() => doc.startEmbedding()).toThrow(
        /Invalid state transition: Cannot transition document from PENDING to EMBEDDING/,
      );
    });

    it('should prevent invalid jump from PARSING directly to COMPLETED', () => {
      const doc = new Document(validProps);
      doc.startParsing();
      expect(() => doc.completeProcessing({ wordCount: 1500 })).toThrow(
        /Invalid state transition: Cannot transition document from PARSING to COMPLETED/,
      );
    });

    it('should reject completeProcessing if wordCount is missing or negative', () => {
      const doc = new Document(validProps);
      doc.startParsing();
      doc.startEmbedding();

      expect(() => doc.completeProcessing({ wordCount: undefined })).toThrow(
        /Document cannot be marked COMPLETED without a valid non-negative wordCount/,
      );
      expect(() => doc.completeProcessing({ wordCount: -50 })).toThrow(
        /Document cannot be marked COMPLETED without a valid non-negative wordCount/,
      );
    });

    it('should transition to FAILED and record errorMessage from active states', () => {
      const doc = new Document(validProps);
      doc.startParsing();

      doc.markAsFailed('Corrupted PDF header: unable to extract text stream');
      expect(doc.status).toBe(DocumentStatus.FAILED);
      expect(doc.errorMessage).toBe('Corrupted PDF header: unable to extract text stream');
      expect(doc.isProcessing()).toBe(false);
    });

    it('should reject markAsFailed with empty or whitespace reason', () => {
      const doc = new Document(validProps);
      expect(() => doc.markAsFailed('')).toThrow(/A non-empty failure reason is required/);
      expect(() => doc.markAsFailed('   ')).toThrow(/A non-empty failure reason is required/);
    });

    it('should prevent transitioning an already COMPLETED document to FAILED', () => {
      const doc = new Document(validProps);
      doc.startParsing();
      doc.startEmbedding();
      doc.completeProcessing({ wordCount: 3000 });

      expect(() => doc.markAsFailed('Belated error')).toThrow(
        /Cannot mark an already COMPLETED document as FAILED/,
      );
    });
  });

  describe('Entity Mutation Helpers', () => {
    it('should update document title with validation', () => {
      const doc = new Document(validProps);
      doc.updateTitle('New Title for Document');
      expect(doc.title).toBe('New Title for Document');

      expect(() => doc.updateTitle('')).toThrow(/Title cannot be empty/);
    });

    it('should update academic metadata and preserve existing fields', () => {
      const doc = new Document(validProps);
      doc.updateMetadata({
        course: 'CS-8803: Advanced AI Systems',
        professor: 'Dr. Alan Turing',
        bibliographyStyle: 'IEEE',
      });

      expect(doc.metadata.course).toBe('CS-8803: Advanced AI Systems');
      expect(doc.metadata.professor).toBe('Dr. Alan Turing');
      expect(doc.metadata.bibliographyStyle).toBe('IEEE');
      expect(doc.metadata.language).toBe('en');
    });

    it('should perform soft-delete on the entity', () => {
      const doc = new Document(validProps);
      expect(doc.isDeleted).toBe(false);

      doc.softDelete();
      expect(doc.isDeleted).toBe(true);
    });
  });
});
