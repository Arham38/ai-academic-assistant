import { Model, FilterQuery, UpdateQuery } from 'mongoose';
import { IBaseRepository, QueryOptions } from '../../../domain/repositories/IBaseRepository';

export interface BaseEntity {
  id?: string;
  _id?: unknown;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface MongooseDocumentLike {
  toObject?: () => Record<string, unknown>;
}

export abstract class BaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  protected readonly model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  private applySoftDeleteFilter(
    filter: FilterQuery<T> = {},
    includeDeleted = false,
  ): FilterQuery<T> {
    if (includeDeleted) {
      return filter;
    }
    return { ...filter, isDeleted: { $ne: true } };
  }

  protected normalizeDocument(doc: unknown): T {
    if (!doc || typeof doc !== 'object') {
      return doc as T;
    }

    const obj = { ...(doc as Record<string, unknown>) };

    // Map MongoDB _id to domain id string
    if (obj._id && !obj.id) {
      obj.id = String(obj._id);
    }

    return obj as unknown as T;
  }

  public async create(item: Partial<T>): Promise<T> {
    const created = await this.model.create({
      ...item,
      isDeleted: false,
    });
    const docLike = created as unknown as MongooseDocumentLike;
    const raw = typeof docLike?.toObject === 'function' ? docLike.toObject() : created;
    return this.normalizeDocument(raw);
  }

  public async createMany(items: Partial<T>[]): Promise<T[]> {
    const payload = items.map((item) => ({ ...item, isDeleted: false }));
    const createdList = await this.model.insertMany(payload);
    return (createdList as unknown as MongooseDocumentLike[]).map((doc) =>
      this.normalizeDocument(typeof doc?.toObject === 'function' ? doc.toObject() : doc),
    );
  }

  public async findById(id: string, includeDeleted = false): Promise<T | null> {
    const filter = this.applySoftDeleteFilter({ _id: id } as FilterQuery<T>, includeDeleted);
    const doc = await this.model.findOne(filter).lean().exec();
    return doc ? this.normalizeDocument(doc) : null;
  }

  public async findOne(filter: Record<string, unknown>, includeDeleted = false): Promise<T | null> {
    const query = this.applySoftDeleteFilter(filter as FilterQuery<T>, includeDeleted);
    const doc = await this.model.findOne(query).lean().exec();
    return doc ? this.normalizeDocument(doc) : null;
  }

  public async find(
    filter: Record<string, unknown> = {},
    options: QueryOptions = {},
  ): Promise<T[]> {
    const query = this.applySoftDeleteFilter(
      filter as FilterQuery<T>,
      options.includeDeleted ?? false,
    );

    let dbQuery = this.model.find(query).lean();

    if (options.sort) {
      dbQuery = dbQuery.sort(options.sort as Record<string, 1 | -1>);
    }

    if (options.skip !== undefined) {
      dbQuery = dbQuery.skip(options.skip);
    }

    if (options.limit !== undefined) {
      dbQuery = dbQuery.limit(options.limit);
    }

    const docs = await dbQuery.exec();
    return docs.map((doc) => this.normalizeDocument(doc));
  }

  public async update(id: string, item: Partial<T>): Promise<T | null> {
    const filter = { _id: id, isDeleted: { $ne: true } } as FilterQuery<T>;
    const updatePayload = {
      $set: {
        ...item,
        updatedAt: new Date(),
      },
    } as UpdateQuery<T>;

    const updated = await this.model
      .findOneAndUpdate(filter, updatePayload, { new: true })
      .lean()
      .exec();

    return updated ? this.normalizeDocument(updated) : null;
  }

  public async softDelete(id: string): Promise<boolean> {
    const filter = { _id: id, isDeleted: { $ne: true } } as FilterQuery<T>;
    const res = await this.model.updateOne(filter, {
      $set: { isDeleted: true, updatedAt: new Date() },
    });
    return res.modifiedCount > 0;
  }

  public async delete(id: string): Promise<boolean> {
    const res = await this.model.deleteOne({ _id: id } as FilterQuery<T>);
    return res.deletedCount > 0;
  }

  public async count(
    filter: Record<string, unknown> = {},
    includeDeleted = false,
  ): Promise<number> {
    const query = this.applySoftDeleteFilter(filter as FilterQuery<T>, includeDeleted);
    return this.model.countDocuments(query).exec();
  }

  public async exists(filter: Record<string, unknown>, includeDeleted = false): Promise<boolean> {
    const query = this.applySoftDeleteFilter(filter as FilterQuery<T>, includeDeleted);
    const count = await this.model.countDocuments(query).limit(1).exec();
    return count > 0;
  }
}
