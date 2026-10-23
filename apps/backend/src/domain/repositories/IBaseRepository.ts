/**
 * Generic Clean Architecture repository contract.
 * Strictly decoupled from any database implementation (Mongoose, PostgreSQL, etc.).
 * IDs and filters are pure domain primitives (strings/records), not driver ObjectIds.
 */

export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  includeDeleted?: boolean;
}

export interface IBaseRepository<T> {
  create(item: Partial<T>): Promise<T>;
  createMany(items: Partial<T>[]): Promise<T[]>;
  findById(id: string, includeDeleted?: boolean): Promise<T | null>;
  findOne(filter: Record<string, unknown>, includeDeleted?: boolean): Promise<T | null>;
  find(filter?: Record<string, unknown>, options?: QueryOptions): Promise<T[]>;
  update(id: string, item: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
  count(filter?: Record<string, unknown>, includeDeleted?: boolean): Promise<number>;
  exists(filter: Record<string, unknown>, includeDeleted?: boolean): Promise<boolean>;
}
