import { Model, Types, FilterQuery, UpdateQuery } from 'mongoose';
import {
  IDocumentRepository,
  PaginatedDocuments,
} from '../../../domain/repositories/IDocumentRepository';
import { Document } from '../../../domain/entities/Document';
import { DocumentStatus } from '../../../domain/types/DocumentStatus';
import { DocumentModel, DocumentDocument } from './models/DocumentModel';
import { DocumentMapper, RawDocumentPersistence } from '../mappers/DocumentMapper';

export class MongoDocumentRepository implements IDocumentRepository {
  private readonly model: Model<DocumentDocument>;

  constructor(model: Model<DocumentDocument> = DocumentModel) {
    this.model = model;
  }

  private applySoftDeleteFilter(
    filter: FilterQuery<DocumentDocument> = {},
    includeDeleted = false,
  ): FilterQuery<DocumentDocument> {
    if (includeDeleted) {
      return filter;
    }
    return { ...filter, isDeleted: { $ne: true } };
  }

  /**
   * Persists a new document record.
   */
  public async create(document: Partial<Document> | Document): Promise<Document> {
    const rawPayload =
      document instanceof Document
        ? DocumentMapper.toPersistence(document)
        : {
            ...document,
            userId:
              document.userId && Types.ObjectId.isValid(document.userId)
                ? new Types.ObjectId(document.userId)
                : document.userId,
          };

    const created = await this.model.create({
      ...rawPayload,
      isDeleted: false,
    });

    return DocumentMapper.toDomain(created.toObject() as RawDocumentPersistence);
  }

  /**
   * Fetches a document by its ID asserting strict user ownership.
   * If User B attempts to query User A's document, this returns null.
   */
  public async findByIdAndOwner(
    documentId: string,
    userId: string,
    includeDeleted = false,
  ): Promise<Document | null> {
    if (!Types.ObjectId.isValid(documentId) || !Types.ObjectId.isValid(userId)) {
      return null;
    }

    const filter = this.applySoftDeleteFilter(
      {
        _id: new Types.ObjectId(documentId),
        userId: new Types.ObjectId(userId),
      },
      includeDeleted,
    );

    const doc = await this.model.findOne(filter).lean().exec();
    return doc ? DocumentMapper.toDomain(doc as RawDocumentPersistence) : null;
  }

  /**
   * Queries paginated documents belonging strictly to a specified user.
   * Leverages the compound index { userId: 1, createdAt: -1 }.
   */
  public async findByUserIdPaginated(
    userId: string,
    page = 1,
    limit = 10,
    includeDeleted = false,
  ): Promise<PaginatedDocuments> {
    const normalizedPage = Math.max(1, Math.floor(page || 1));
    const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit || 10)));
    const skip = (normalizedPage - 1) * normalizedLimit;

    if (!Types.ObjectId.isValid(userId)) {
      return {
        data: [],
        total: 0,
        page: normalizedPage,
        totalPages: 0,
      };
    }

    const filter = this.applySoftDeleteFilter(
      { userId: new Types.ObjectId(userId) },
      includeDeleted,
    );

    const [total, docs] = await Promise.all([
      this.model.countDocuments(filter).exec(),
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .lean()
        .exec(),
    ]);

    const totalPages = Math.ceil(total / normalizedLimit) || 0;
    const data = docs.map((doc) => DocumentMapper.toDomain(doc as RawDocumentPersistence));

    return {
      data,
      total,
      page: normalizedPage,
      totalPages,
    };
  }

  /**
   * Updates a document scoped strictly to its owner.
   */
  public async update(
    documentId: string,
    userId: string,
    updateData: Partial<Document>,
  ): Promise<Document | null> {
    if (!Types.ObjectId.isValid(documentId) || !Types.ObjectId.isValid(userId)) {
      return null;
    }

    const filter: FilterQuery<DocumentDocument> = {
      _id: new Types.ObjectId(documentId),
      userId: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    };

    let rawPayload: Record<string, unknown>;
    if (updateData instanceof Document) {
      rawPayload = DocumentMapper.toPersistence(updateData);
      delete rawPayload._id;
      delete rawPayload.userId;
    } else {
      rawPayload = { ...updateData };
      delete rawPayload.id;
      delete rawPayload._id;
      delete rawPayload.userId;
    }

    const updateQuery: UpdateQuery<DocumentDocument> = {
      $set: {
        ...rawPayload,
        updatedAt: new Date(),
      },
    };

    const updated = await this.model
      .findOneAndUpdate(filter, updateQuery, { new: true })
      .lean()
      .exec();

    return updated ? DocumentMapper.toDomain(updated as RawDocumentPersistence) : null;
  }

  /**
   * Soft-deletes a document asserting user ownership.
   */
  public async softDelete(documentId: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(documentId) || !Types.ObjectId.isValid(userId)) {
      return false;
    }

    const filter: FilterQuery<DocumentDocument> = {
      _id: new Types.ObjectId(documentId),
      userId: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    };

    const res = await this.model.updateOne(filter, {
      $set: { isDeleted: true, updatedAt: new Date() },
    });

    return res.modifiedCount > 0;
  }

  /**
   * Queries pending documents across the system for background AI workers.
   * Actively utilizes the { status: 1 } index.
   */
  public async findPendingDocuments(limit = 10): Promise<Document[]> {
    const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit || 10)));
    const filter: FilterQuery<DocumentDocument> = {
      status: DocumentStatus.PENDING,
      isDeleted: { $ne: true },
    };

    const docs = await this.model
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(normalizedLimit)
      .lean()
      .exec();

    return docs.map((doc) => DocumentMapper.toDomain(doc as RawDocumentPersistence));
  }

  /**
   * Counts active documents for a given user.
   */
  public async countByUserId(userId: string, includeDeleted = false): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) {
      return 0;
    }

    const filter = this.applySoftDeleteFilter(
      { userId: new Types.ObjectId(userId) },
      includeDeleted,
    );

    return this.model.countDocuments(filter).exec();
  }

  /**
   * Checks whether a document exists and belongs to the given user.
   */
  public async existsByIdAndOwner(
    documentId: string,
    userId: string,
    includeDeleted = false,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(documentId) || !Types.ObjectId.isValid(userId)) {
      return false;
    }

    const filter = this.applySoftDeleteFilter(
      {
        _id: new Types.ObjectId(documentId),
        userId: new Types.ObjectId(userId),
      },
      includeDeleted,
    );

    const count = await this.model.countDocuments(filter).limit(1).exec();
    return count > 0;
  }

  /**
   * @deprecated IDOR Security Safeguard: Direct findById without asserting userId ownership is prohibited.
   * Call findByIdAndOwner(documentId, userId) instead.
   */
  public async findById(_id: string): Promise<never> {
    throw new Error(
      'IDOR Security Safeguard: findById without userId is prohibited. Use findByIdAndOwner(documentId, userId) instead.',
    );
  }
}

export const mongoDocumentRepository = new MongoDocumentRepository();
