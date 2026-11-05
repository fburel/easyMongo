import type {
  Db,
  DeleteResult,
  Document,
  Filter,
  IndexDescription,
  MongoClientOptions,
  ObjectId as MongoObjectId,
  Sort,
  UpdateFilter,
  UpdateResult,
  WithId,
} from "mongodb";

/** A document as returned by the read methods: `_id` is converted to a string. */
export type Doc<T> = Omit<T, "_id"> & {
  _id: string;
  _created_at?: Date;
  _updated_at?: Date;
};

export type Id = string | MongoObjectId;

export interface Page<T> {
  size: number;
  items: Doc<T>[];
}

export interface PageWithTotal<T> extends Page<T> {
  total: number;
  pageCount: number;
}

export interface FetchPageOptions {
  /** Also compute the total number of matching documents and the page count. */
  withTotal?: boolean;
}

export interface ModelInstance<T extends Document = Document> {
  driver: CollectionDriver;

  getByIdAsync(_id: Id, project?: Document | null): Promise<Doc<T> | null>;
  findAllAsync(criteria?: Filter<T>, project?: Document, sort?: Sort, skip?: number, limit?: number): Promise<Doc<T>[]>;
  findOneAsync(criteria?: Filter<T>, projection?: Document, sort?: Sort): Promise<Doc<T> | null>;

  /** @deprecated use fetchPageAsync(match, sort, project, pageNumber, pageSize, { withTotal: true }) */
  getByPageAsync(pageNumber: number, pageSize?: number, match?: Filter<T> | null, project?: Document | null, sort?: Sort | null):
    Promise<{ pageCount: number; items: WithId<T>[] } | undefined>;

  fetchPageAsync(match: Filter<T> | null | undefined, sort: Sort | null | undefined, project: Document | null | undefined,
    pageNumber: number | undefined, pageSize: number | undefined, options: FetchPageOptions & { withTotal: true }): Promise<PageWithTotal<T>>;
  fetchPageAsync(match?: Filter<T> | null, sort?: Sort | null, project?: Document | null,
    pageNumber?: number, pageSize?: number, options?: FetchPageOptions): Promise<Page<T>>;

  saveAsync(value: T): Promise<Doc<T>>;
  /** Resolves to the inserted ids, indexed by position in the input array. */
  saveAllAsync(objects: T[]): Promise<{ [index: number]: MongoObjectId }>;

  deleteByIdAsync(_id: Id): Promise<DeleteResult>;
  deleteAllAsync(criteria?: Filter<T>): Promise<DeleteResult>;

  /** Replace the whole document identified by `value._id`. Resolves to the new document, or null if not found. */
  replaceAsync(value: Omit<T, "_id"> & { _id: Id }): Promise<Doc<T> | null>;
  updateByIdAsync(id: Id, updater: UpdateFilter<T>): Promise<UpdateResult>;
  updateManyAsync(criteria: Filter<T>, updater: UpdateFilter<T>): Promise<UpdateResult>;
  updateOneAsync(criteria: Filter<T>, updater: UpdateFilter<T>): Promise<UpdateResult>;
  setAsync(id: Id, values: Partial<T>): Promise<UpdateResult>;

  /** Insert `document` only if nothing matches `criteria`. Resolves to the matching or inserted document. */
  insertIfNotFoundAsync(criteria: Filter<T>, document: Partial<T>): Promise<WithId<T> | null>;
  /** Update the matching document, or create it. Resolves to the document after the update. */
  upsertAsync(criteria: Filter<T>, updater: UpdateFilter<T>): Promise<WithId<T> | null>;

  countAsync(query?: Filter<T>): Promise<number>;
  aggregateAsync<R extends Document = Document>(pipeline: Document[]): Promise<R[]>;
}

export interface ModelOptions {
  /** Indexes created on the collection on the first Connect, e.g. `[{ key: { email: 1 }, unique: true }]` */
  indexes?: IndexDescription[];
}

export interface ModelClass<T extends Document = Document> {
  new (driver: CollectionDriver): ModelInstance<T>;
  /** Add your own methods here. Declare them in `Models` to get them typed. */
  prototype: ModelInstance<T> & Record<string, any>;
  readonly collectionName: string;
  readonly indexes: IndexDescription[];
}

export declare class CollectionDriver {
  constructor(db: Db);
  db: Db;
  /** Ping the server. */
  isConnected(): Promise<boolean>;
  [method: string]: any;
}

/**
 * Registry of your models, to be completed with declaration merging:
 *
 * ```ts
 * declare module "myeasymongo" {
 *   interface Models {
 *     posts: ModelInstance<Post>;
 *   }
 * }
 * ```
 */
export interface Models {}

export interface Mongo extends Models {
  /** Ping the server. */
  isConnected(): Promise<boolean>;
  driver: CollectionDriver;
  /** Models registered but not declared in `Models` */
  [name: string]: any;
}

export interface ConfigureOptions {
  /** Connection string. Defaults to process.env.MONGO */
  uri?: string;
  /** Database name. Defaults to the one in the connection string */
  dbName?: string;
  /** Options for the MongoClient, applied when a new connection is opened */
  clientOptions?: MongoClientOptions;
}

export function Configure(options?: ConfigureOptions): void;

export function Model<T extends Document = Document>(table: string, options?: ModelOptions): ModelClass<T>;

export function Register(name: string, model: ModelClass<any>): void;

/**
 * Connect to the database and run `task` with the registered models.
 * If the connection fails, `task` is called with `(null, error)`.
 * Errors thrown by `task` are propagated.
 */
export function Connect<R>(task: (mongo: Mongo, error?: Error) => R | Promise<R>, keepAlive?: boolean): Promise<R>;

/** Close every open connection. */
export function Disconnect(): Promise<void>;

export declare const ObjectId: {
  /** Convert to an ObjectId. Throws a TypeError if the id is invalid. */
  from(id: Id): MongoObjectId;
  test(id: unknown): boolean;
};
