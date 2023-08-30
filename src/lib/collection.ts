import { DocumentDataType } from "../types/document-data.type";
import {
  CollectionType,
  DataBaseType,
  MetadataType,
  QueryOneOptionType,
  QueryOptionType,
  QueryType,
} from "../types/orm.type";
import {
  defineDocument,
  formatSize,
  loadData,
  saveData,
} from "../utils/utils.func";
import { Query } from "./query";

export class Collection<
  T extends Object,
  U extends T & { readonly __id: number } = { readonly __id: number } & T
> {
  private _pathDB: string;
  private metadata: MetadataType<T>;

  constructor(
    private readonly _collectionName: string,
    private readonly path?: string
  ) {
    this._pathDB = path || "db/db.json";
    this.metadata = { collectionName: _collectionName, unique: [] };
  }

  //SELECT

  async findById(__id: number): Promise<DocumentDataType<U> | undefined>;

  async findById<
    X extends Array<keyof U> | undefined = undefined,
    Y extends Object = X extends Array<keyof U>
      ? { [K in X[number]]: K extends keyof U ? U[K] : never }
      : U
  >(
    __id: number,
    opts: X extends undefined ? QueryOneOptionType<U> : QueryOneOptionType<U, X>
  ): Promise<DocumentDataType<Y> | undefined>;

  async findById(__id: number, opts?: any): Promise<any> {
    return this.select({ __id } as QueryType<Partial<U>>, {
      ...opts,
      limit: 1,
    }) as Promise<DocumentDataType<any> | undefined>;
  }

  async findOne(
    query: QueryType<Partial<U>>
  ): Promise<DocumentDataType<U> | undefined>;

  async findOne<
    X extends Array<keyof U> | undefined = undefined,
    Y extends Object = X extends Array<keyof U>
      ? { [K in X[number]]: K extends keyof U ? U[K] : never }
      : U
  >(
    query: QueryType<Partial<U>>,
    opts: X extends undefined ? QueryOneOptionType<U> : QueryOneOptionType<U, X>
  ): Promise<DocumentDataType<Y> | undefined>;

  async findOne(
    query: QueryType<any>,
    opts?: any
  ): Promise<DocumentDataType<any> | undefined> {
    return this.select(query, {
      ...opts,
      limit: 1,
    } as QueryOptionType<any>) as Promise<DocumentDataType<any> | undefined>;
  }

  async find(query: QueryType<Partial<U>>): Promise<Array<DocumentDataType<U>>>;

  async find<
    X extends Array<keyof U> | undefined = undefined,
    Y extends Object = X extends Array<keyof U>
      ? { [K in X[number]]: K extends keyof U ? U[K] : never }
      : U
  >(
    query: QueryType<Partial<U>>,
    opts: X extends undefined ? QueryOptionType<U> : QueryOptionType<U, X>
  ): Promise<Array<DocumentDataType<Y>>>;

  async find(
    query: QueryType<Partial<U>>,
    opts?: any
  ): Promise<Array<DocumentDataType<any>>> {
    return this.select(query, opts) as Promise<Array<DocumentDataType<any>>>;
  }

  private async select(
    query: QueryType<any>,
    opts?: QueryOptionType<any>
  ): Promise<DocumentDataType<any> | Array<DocumentDataType<any>> | undefined> {
    const collectionDB = await this.loadCollectionData();
    const queryInstance = new Query(
      query,
      structuredClone(collectionDB),
      opts as any
    );
    const result = queryInstance.getData();
    if (!result) return undefined;
    return defineDocument(result, this.pathDB, this._collectionName) as Array<
      DocumentDataType<any>
    >;
  }

  // INSERT

  async add(data: T): Promise<DocumentDataType<U>> {
    return this.insert(data) as Promise<DocumentDataType<U>>;
  }

  async create(data: T): Promise<DocumentDataType<U>> {
    return this.insert(data) as Promise<DocumentDataType<U>>;
  }

  async insertOne(data: T): Promise<DocumentDataType<U>> {
    return this.insert(data) as Promise<DocumentDataType<U>>;
  }

  async insertMany(data: T[]): Promise<Array<DocumentDataType<U>>> {
    return this.insert(data) as Promise<Array<DocumentDataType<U>>>;
  }

  private async insert(
    data: T[] | T
  ): Promise<DocumentDataType<U> | Array<DocumentDataType<U>>> {
    const isArray = Array.isArray(data);
    if (!Array.isArray(data)) data = [data];
    const collectionDB = await this.loadCollectionData();
    const tab: U[] = [];
    for (const key in data) {
      const element = data[key];
      const __id = (await this._lastIdInsert(collectionDB)) + 1;

      await this.constrain(element, collectionDB);
      tab.push({ ...element, __id } as U);
      collectionDB.push({ ...element, __id } as U);
    }

    await this.saveData(collectionDB);
    return isArray
      ? (defineDocument(tab, this.pathDB, this._collectionName) as Array<
          DocumentDataType<U>
        >)
      : (defineDocument(
          tab[0],
          this.pathDB,
          this._collectionName
        ) as DocumentDataType<U>);
  }

  // UPDATE

  async updateOne(
    data: Partial<T>,
    query: QueryType<Partial<U>>
  ): Promise<DocumentDataType<U> | null> {
    return this.update(data, query) as Promise<DocumentDataType<U> | null>;
  }

  async updateMany(
    data: Partial<T>,
    query: QueryType<Partial<U>>
  ): Promise<Array<DocumentDataType<U>> | null> {
    return this.update(data, query, true) as Promise<Array<
      DocumentDataType<U>
    > | null>;
  }

  private async update(
    data: Partial<T>,
    query: QueryType<Partial<U>>,
    isMany?: boolean
  ): Promise<DocumentDataType<U> | Array<DocumentDataType<U>> | null> {
    const collectionDB = await this.loadCollectionData();
    const queryInstance = new Query(query, structuredClone(collectionDB));
    let result = queryInstance.getData() as CollectionType<U>;

    if (result.length === 0) return null;
    if (!isMany) result = result.slice(0, 1);

    const updated = [];

    for (const index in collectionDB) {
      const document = collectionDB[index];
      const t = result.find((el) => el.__id === document.__id);
      if (!t) continue;
      if ("__id" in data) {
        const { __id, ...rest } = data;
        data = rest as any;
      }

      await this.constrain(data, collectionDB, document.__id);
      collectionDB[index] = { ...t, ...data };
      updated.push(collectionDB[index]);
      if (result.length === 1) break;
    }

    await this.saveData(collectionDB);
    return isMany
      ? (defineDocument(updated, this.pathDB, this._collectionName) as Array<
          DocumentDataType<U>
        >)
      : (defineDocument(
          updated[0],
          this.pathDB,
          this._collectionName
        ) as DocumentDataType<U>);
  }

  async deleteOne(
    query: QueryType<Partial<U>>
  ): Promise<DocumentDataType<U> | null> {
    return this.delete(query) as Promise<DocumentDataType<U> | null>;
  }

  async deleteMany(
    query: QueryType<Partial<U>>
  ): Promise<Array<DocumentDataType<U>> | null> {
    return this.delete(query, true) as Promise<Array<
      DocumentDataType<U>
    > | null>;
  }

  private async delete(
    query: QueryType<Partial<U>>,
    isMany?: boolean
  ): Promise<DocumentDataType<U> | Array<DocumentDataType<U>> | null> {
    const collectionDB = await this.loadCollectionData();
    const queryInstance = new Query(query, structuredClone(collectionDB));
    const result = queryInstance.getData() as CollectionType<U>;

    const resultOfDeleted: U[] = [];
    if (result.length === 0) return null;
    for (const key in result) {
      const element = result[key];
      const index = collectionDB.findIndex((el) => el.__id === element.__id);
      resultOfDeleted.push(...collectionDB.splice(index, 1));
      if (!isMany) {
        await this.saveData(collectionDB);
        return defineDocument(
          resultOfDeleted[0],
          this.pathDB,
          this._collectionName
        ) as DocumentDataType<U>;
      }
    }

    await this.saveData(collectionDB);
    return defineDocument(
      resultOfDeleted,
      this.pathDB,
      this._collectionName
    ) as Array<DocumentDataType<U>>;
  }

  private async constrain(
    data: T | Partial<T>,
    collectionDB: CollectionType<U>,
    __id?: number
  ) {
    this.metadata.unique?.forEach((key) => {
      const t = collectionDB.find((el) => {
        if (!el[key] && !data[key]) return false;
        return el[key] === data[key] && el.__id !== __id;
      });

      if (t)
        throw new Error(
          `Connot duplicate '${key as string}' field as unique key`
        );
    });
  }

  /**
   * Returns the last id inserted. If no document found, it returns 0
   */
  async lastIdInsert(): Promise<number> {
    return this._lastIdInsert();
  }

  private async _lastIdInsert(
    collectionDB?: CollectionType<U>
  ): Promise<number> {
    collectionDB = collectionDB || (await this.loadCollectionData());
    return collectionDB.length > 0
      ? collectionDB[collectionDB.length - 1].__id
      : 0;
  }

  /**
   * Adds unique key.
   * @param keyName Name of unique key.
   * @returns Returns the unique key.
   */

  async addUniqueKey(
    keyName: keyof T | Array<keyof T>
  ): Promise<typeof keyName> {
    await this.loadCollectionData();
    const isArray = Array.isArray(keyName);
    let isAddedKey = false;
    if (!Array.isArray(keyName)) keyName = [keyName];
    for (const iterator of keyName) {
      if (this.metadata.unique.includes(iterator)) continue;
      this.metadata.unique.push(iterator);
      isAddedKey = true;
    }
    if (isAddedKey) await this.saveMetadata();
    return isArray ? keyName : keyName[0];
  }

  /**
   * Removes unique key.
   * @param uniqueKey Name of unique key.
   * @returns Returns the unique key.
   */
  async removeUniqueKey(
    uniqueKey: keyof T | Array<keyof T>
  ): Promise<typeof uniqueKey | undefined> {
    await this.loadCollectionData();

    const isArray = Array.isArray(uniqueKey);
    if (!Array.isArray(uniqueKey)) uniqueKey = [uniqueKey];
    const savedKeyName: Array<keyof T> = [];
    for (const iterator of uniqueKey) {
      const index = this.metadata.unique.findIndex((el) => el === iterator);
      if (index === -1) continue;
      this.metadata.unique.splice(index, 1);
      savedKeyName.push(iterator);
    }
    await this.saveMetadata();
    return isArray ? savedKeyName : savedKeyName[0];
  }

  /**
   * Removes all unique keys
   */
  async removeAllUniqueKeys(): Promise<Array<keyof T>> {
    await this.loadCollectionData();
    const keys = this.metadata.unique;
    this.metadata.unique = [];
    await this.saveMetadata();
    return keys;
  }

  /**
   * Returns all unique keys.
   */
  async getUniqueKeys(): Promise<Array<keyof T>> {
    await this.loadCollectionData();
    return this.metadata.unique;
  }

  get collectionName(): string {
    return this._collectionName;
  }

  get pathDB(): string {
    return this._pathDB;
  }

  /**
   * DATA BASE
   */

  /**
   * Returns size of this collection.
   */
  async size(): Promise<string> {
    const collectionString = JSON.stringify(await this.loadCollectionData());
    const blob = new Blob([collectionString]);
    return formatSize(blob.size);
  }

  /**
   * Counts documents in this collection.
   */
  async count(query?: QueryType<Partial<U>>) {
    if (!query) return (await this.loadCollectionData()).length;

    const data = await this.find(query);
    return data.length;
  }

  private async loadCollectionData(
    load: boolean = true
  ): Promise<CollectionType<U>> {
    const db = await this.loadData();
    if (load) {
      this.loadDataLocally(db);
    }
    return db[this._collectionName] as CollectionType<U>;
  }

  private loadDataLocally(db: DataBaseType) {
    this.metadata =
      ((db["__metadata__"] as Array<MetadataType<{}>>).find(
        (collection) => collection.collectionName === this._collectionName
      ) as MetadataType<T>) || this.metadata;
  }

  private async saveData(data: CollectionType<U>) {
    const db = await this.loadData();
    db[this._collectionName] = data as Record<string, any>[];
    await saveData(this._pathDB, db);
  }

  private async loadData(): Promise<DataBaseType> {
    if (!this._collectionName || this._collectionName === "__metadata__")
      throw new Error(`Collection '${this._collectionName}' doesn't exist.`);
    const db = await loadData(this._pathDB);
    if (!(this._collectionName in db))
      throw new Error(`Collection '${this._collectionName}' doesn't exist.`);
    return db;
  }

  private async saveMetadata() {
    const db = await this.loadData();
    const index = (db["__metadata__"] as Array<MetadataType<T>>).findIndex(
      (metadata) => metadata.collectionName === this.collectionName
    );

    if (index === -1) return;

    (db["__metadata__"] as Array<MetadataType<T>>)[index].unique =
      this.metadata.unique;
    await saveData(this._pathDB, db);
  }
}
