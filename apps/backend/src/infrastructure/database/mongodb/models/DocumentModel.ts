import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';
import {
  DocumentStatus,
  ALLOWED_MIME_TYPES,
  AllowedMimeType,
} from '../../../../domain/types/DocumentStatus';

export interface DocumentMetadataSubdocument {
  wordCount?: number;
  pageCount?: number;
  language: string;
  course?: string;
  professor?: string;
  bibliographyStyle?: string;
  [key: string]: unknown;
}

export interface DocumentDocument extends MongooseDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  originalFilename: string;
  storageUri: string;
  mimeType: AllowedMimeType;
  sizeBytes: number;
  status: DocumentStatus;
  errorMessage?: string;
  metadata: DocumentMetadataSubdocument;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentMetadataSchema = new Schema(
  {
    wordCount: {
      type: Number,
      min: 0,
      default: undefined,
    },
    pageCount: {
      type: Number,
      min: 0,
      default: undefined,
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
    course: {
      type: String,
      trim: true,
    },
    professor: {
      type: String,
      trim: true,
    },
    bibliographyStyle: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
    strict: false, // Extensibility: allows future academic metadata without database schema migrations
  },
);

const DocumentSchema = new Schema<DocumentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    storageUri: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_MIME_TYPES,
        message: '{VALUE} is not a supported document MIME type',
      },
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: [0, 'Document size in bytes cannot be negative'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: Object.values(DocumentStatus),
        message: '{VALUE} is not a valid DocumentStatus',
      },
      default: DocumentStatus.PENDING,
    },
    errorMessage: {
      type: String,
      default: undefined,
    },
    metadata: {
      type: DocumentMetadataSchema,
      default: () => ({ language: 'en' }),
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'documents',
    versionKey: false,
  },
);

// Performance & Query Optimization Indexes
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ userId: 1, isDeleted: 1 });

export const DocumentModel = model<DocumentDocument>('Document', DocumentSchema);
