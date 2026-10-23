import { Model, FilterQuery } from 'mongoose';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { QueryOptions } from '../../../domain/repositories/IBaseRepository';
import { User } from '../../../domain/entities/User';
import { UserModel, UserDocument } from './models/UserModel';
import { UserMapper, RawUserPersistence } from '../mappers/UserMapper';

export class MongoUserRepository implements IUserRepository {
  private readonly model: Model<UserDocument>;

  constructor(model: Model<UserDocument> = UserModel) {
    this.model = model;
  }

  private applySoftDeleteFilter(
    filter: FilterQuery<UserDocument> = {},
    includeDeleted = false,
  ): FilterQuery<UserDocument> {
    if (includeDeleted) {
      return filter;
    }
    return { ...filter, isDeleted: { $ne: true } };
  }

  public async create(user: Partial<User>): Promise<User> {
    const rawPayload = user instanceof User ? UserMapper.toPersistence(user) : user;
    const created = await this.model.create({
      ...rawPayload,
      email: (rawPayload.email as string)?.toLowerCase().trim(),
      isDeleted: false,
    });
    return UserMapper.toDomain(created.toObject());
  }

  public async createMany(users: Partial<User>[]): Promise<User[]> {
    const payload = users.map((u) => {
      const raw = u instanceof User ? UserMapper.toPersistence(u) : u;
      return {
        ...raw,
        email: (raw.email as string)?.toLowerCase().trim(),
        isDeleted: false,
      };
    });

    const createdList = await this.model.insertMany(payload);
    return (createdList as unknown as Array<{ toObject: () => RawUserPersistence }>).map((doc) =>
      UserMapper.toDomain(doc.toObject()),
    );
  }

  public async findById(id: string, includeDeleted = false): Promise<User | null> {
    const filter = this.applySoftDeleteFilter({ _id: id }, includeDeleted);
    const doc = await this.model.findOne(filter).lean().exec();
    return doc ? UserMapper.toDomain(doc as RawUserPersistence) : null;
  }

  public async findByEmail(email: string, includePassword = false): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const filter = this.applySoftDeleteFilter({ email: normalizedEmail });

    const query = includePassword
      ? this.model.findOne(filter).select('+passwordHash')
      : this.model.findOne(filter);

    const doc = await query.lean().exec();
    return doc ? UserMapper.toDomain(doc as RawUserPersistence) : null;
  }

  public async findByEmailAndTenant(
    email: string,
    tenantId: string,
    includePassword = false,
  ): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const filter = this.applySoftDeleteFilter({ email: normalizedEmail, tenantId });

    const query = includePassword
      ? this.model.findOne(filter).select('+passwordHash')
      : this.model.findOne(filter);

    const doc = await query.lean().exec();
    return doc ? UserMapper.toDomain(doc as RawUserPersistence) : null;
  }

  public async findOne(
    filter: Record<string, unknown>,
    includeDeleted = false,
  ): Promise<User | null> {
    const query = this.applySoftDeleteFilter(filter as FilterQuery<UserDocument>, includeDeleted);
    const doc = await this.model.findOne(query).lean().exec();
    return doc ? UserMapper.toDomain(doc as RawUserPersistence) : null;
  }

  public async find(
    filter: Record<string, unknown> = {},
    options: QueryOptions = {},
  ): Promise<User[]> {
    const query = this.applySoftDeleteFilter(
      filter as FilterQuery<UserDocument>,
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
    return docs.map((doc) => UserMapper.toDomain(doc as RawUserPersistence));
  }

  public async update(id: string, item: Partial<User>): Promise<User | null> {
    const filter = { _id: id, isDeleted: { $ne: true } };
    const rawPayload = item instanceof User ? UserMapper.toPersistence(item) : item;

    const updated = await this.model
      .findOneAndUpdate(
        filter,
        {
          $set: {
            ...rawPayload,
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    return updated ? UserMapper.toDomain(updated as RawUserPersistence) : null;
  }

  public async softDelete(id: string): Promise<boolean> {
    const res = await this.model.updateOne(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, updatedAt: new Date() } },
    );
    return res.modifiedCount > 0;
  }

  public async delete(id: string): Promise<boolean> {
    const res = await this.model.deleteOne({ _id: id });
    return res.deletedCount > 0;
  }

  public async count(
    filter: Record<string, unknown> = {},
    includeDeleted = false,
  ): Promise<number> {
    const query = this.applySoftDeleteFilter(filter as FilterQuery<UserDocument>, includeDeleted);
    return this.model.countDocuments(query).exec();
  }

  public async exists(filter: Record<string, unknown>, includeDeleted = false): Promise<boolean> {
    const query = this.applySoftDeleteFilter(filter as FilterQuery<UserDocument>, includeDeleted);
    const count = await this.model.countDocuments(query).limit(1).exec();
    return count > 0;
  }

  public async existsByEmail(email: string, tenantId?: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const filter: Record<string, unknown> = { email: normalizedEmail };
    if (tenantId) {
      filter.tenantId = tenantId;
    }
    return this.exists(filter);
  }

  public async incrementTokenVersion(userId: string): Promise<number | null> {
    const updated = await this.model
      .findOneAndUpdate(
        { _id: userId, isDeleted: { $ne: true } },
        {
          $inc: { 'security.tokenVersion': 1 },
          $set: { updatedAt: new Date() },
        },
        { new: true, projection: { 'security.tokenVersion': 1 } },
      )
      .lean()
      .exec();

    return updated?.security?.tokenVersion ?? null;
  }

  public async updateAIUsage(userId: string, tokensConsumed: number): Promise<boolean> {
    const res = await this.model.updateOne(
      { _id: userId, isDeleted: { $ne: true } },
      {
        $inc: { 'aiUsage.tokensConsumed': tokensConsumed },
        $set: { updatedAt: new Date() },
      },
    );
    return res.modifiedCount > 0;
  }
}

export const mongoUserRepository = new MongoUserRepository();
