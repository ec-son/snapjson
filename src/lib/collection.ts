import {
  CollectionType,
  DataBaseType,
  MetadataType,
  QueryOneOptionType,
  QueryOptionType,
  QueryType,
} from "../type/orm.type";
import {
  defineDocument,
  formatSize,
  loadData,
  saveData,
} from "../utils/utils.func";
import { Document } from "./document";
import { Query } from "./query";

export class Collection<
  T extends Object,
  U extends T & { readonly __id: number } = { readonly __id: number } & T
> {
  private metadata: MetadataType<T>;

  constructor(
    private readonly _pathDB: string,
    private readonly _collectionName: string
  ) {
    this.metadata = { collectionName: _collectionName, unique: [] };
  }

  //SELECT

  async findById(__id: number): Promise<(Document<U> & U) | undefined>;

  async findById<
    X extends Array<keyof U> | undefined = undefined,
    Y extends Object = X extends Array<keyof U>
      ? { [K in X[number]]: K extends keyof U ? U[K] : never }
      : U
  >(
    __id: number,
    opts: X extends undefined ? QueryOneOptionType<U> : QueryOneOptionType<U, X>
  ): Promise<(Document<Y> & Y) | undefined>;

  async findById(__id: number, opts?: any): Promise<any> {
    return this.select({ __id } as QueryType<Partial<U>>, {
      ...opts,
      limit: 1,
    }) as Promise<(Document<any> & any) | undefined>;
  }

  async findOne(
    query: QueryType<Partial<U>>
  ): Promise<(Document<U> & U) | undefined>;

  async findOne<
    X extends Array<keyof U> | undefined = undefined,
    Y extends Object = X extends Array<keyof U>
      ? { [K in X[number]]: K extends keyof U ? U[K] : never }
      : U
  >(
    query: QueryType<Partial<U>>,
    opts: X extends undefined ? QueryOneOptionType<U> : QueryOneOptionType<U, X>
  ): Promise<(Document<Y> & Y) | undefined>;

  async findOne(
    query: QueryType<any>,
    opts?: any
  ): Promise<(Document<any> & any) | undefined> {
    return this.select(query, {
      ...opts,
      limit: 1,
    } as QueryOptionType<any>) as Promise<(Document<any> & any) | undefined>;
  }

  async findMany(query: QueryType<Partial<U>>): Promise<Array<Document<U> & U>>;

  async findMany<
    X extends Array<keyof U> | undefined = undefined,
    Y extends Object = X extends Array<keyof U>
      ? { [K in X[number]]: K extends keyof U ? U[K] : never }
      : U
  >(
    query: QueryType<Partial<U>>,
    opts: X extends undefined ? QueryOptionType<U> : QueryOptionType<U, X>
  ): Promise<Array<Document<Y> & Y>>;

  async findMany(
    query: QueryType<Partial<U>>,
    opts?: any
  ): Promise<Array<Document<any> & any>> {
    return this.select(query, opts) as Promise<Array<Document<any> & any>>;
  }

  private async select(
    query: QueryType<any>,
    opts?: QueryOptionType<any>
  ): Promise<(Document<any> & any) | Array<Document<any> & any> | undefined> {
    const collectionDB = await this.loadData();
    const queryInstance = new Query(
      query,
      structuredClone(collectionDB),
      opts as any
    );
    const result = queryInstance.getData();
    if (!result) return undefined;
    return defineDocument(result, this.pathDB, this._collectionName) as Array<
      Document<any> & any
    >;
  }

  // INSERT

  async add(data: T): Promise<Document<U> & U> {
    return this.insert(data) as Promise<Document<U> & U>;
  }

  async create(data: T): Promise<Document<U> & U> {
    return this.insert(data) as Promise<Document<U> & U>;
  }

  async insertOne(data: T): Promise<Document<U> & U> {
    return this.insert(data) as Promise<Document<U> & U>;
  }

  async insertMany(data: T[]): Promise<Array<Document<U> & U>> {
    return this.insert(data) as Promise<Array<Document<U> & U>>;
  }

  private async insert(
    data: T[] | T
  ): Promise<(Document<U> & U) | Array<Document<U> & U>> {
    const isArray = Array.isArray(data);
    if (!Array.isArray(data)) data = [data];
    const collectionDB = await this.loadData();
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
          Document<U> & U
        >)
      : (defineDocument(
          tab[0],
          this.pathDB,
          this._collectionName
        ) as Document<U> & U);
  }

  // UPDATE

  async updateOne(
    data: Partial<T>,
    query: QueryType<Partial<U>>
  ): Promise<(Document<U> & U) | null> {
    return this.update(data, query) as Promise<(Document<U> & U) | null>;
  }

  async updateMany(
    data: Partial<T>,
    query: QueryType<Partial<U>>
  ): Promise<Array<Document<U> & U> | null> {
    return this.update(data, query, true) as Promise<Array<
      Document<U> & U
    > | null>;
  }

  private async update(
    data: Partial<T>,
    query: QueryType<Partial<U>>,
    isMany?: boolean
  ): Promise<(Document<U> & U) | Array<Document<U> & U> | null> {
    const collectionDB = await this.loadData();
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
          Document<U> & U
        >)
      : (defineDocument(
          updated[0],
          this.pathDB,
          this._collectionName
        ) as Document<U> & U);
  }

  async deleteOne(
    query: QueryType<Partial<U>>
  ): Promise<(Document<U> & U) | null> {
    return this.delete(query) as Promise<(Document<U> & U) | null>;
  }

  async deleteMany(
    query: QueryType<Partial<U>>
  ): Promise<Array<Document<U> & U> | null> {
    return this.delete(query, true) as Promise<Array<Document<U> & U> | null>;
  }

  private async delete(
    query: QueryType<Partial<U>>,
    isMany?: boolean
  ): Promise<(Document<U> & U) | Array<Document<U> & U> | null> {
    const collectionDB = await this.loadData();
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
        ) as Document<U> & U;
      }
    }

    await this.saveData(collectionDB);
    return defineDocument(
      resultOfDeleted,
      this.pathDB,
      this._collectionName
    ) as Array<Document<U> & U>;
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
   * Get the last id inserted. If no document found, it returns 0
   */
  async lastIdInsert(): Promise<number> {
    return this._lastIdInsert();
  }

  private async _lastIdInsert(
    collectionDB?: CollectionType<U>
  ): Promise<number> {
    collectionDB = collectionDB || (await this.loadData());
    return collectionDB.length > 0
      ? collectionDB[collectionDB.length - 1].__id
      : 0;
  }

  /**
   * Add unique key.
   * @param keyName Name of unique key.
   * @returns Returns the unique key.
   */

  async addUniqueKey(
    keyName: keyof T | Array<keyof T>
  ): Promise<typeof keyName> {
    await this.loadData();
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
   * Remove unique key.
   * @param uniqueKey Name of unique key.
   * @returns Returns the unique key.
   */
  async removeUniqueKey(
    uniqueKey: keyof T | Array<keyof T>
  ): Promise<typeof uniqueKey | undefined> {
    await this.loadData();

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
   * Remove all unique keys
   */
  async removeAllUniqueKeys(): Promise<Array<keyof T>> {
    await this.loadData();
    const keys = this.metadata.unique;
    this.metadata.unique = [];
    await this.saveMetadata();
    return keys;
  }

  /**
   * Get all unique keys.
   */
  async getUniqueKeys(): Promise<Array<keyof T>> {
    await this.loadData();
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
   * Return size of this collection.
   */
  async size(): Promise<string> {
    const collectionString = JSON.stringify(await this.loadData());
    const blob = new Blob([collectionString]);
    return formatSize(blob.size);
  }

  /**
   * Counts documents in this collection.
   */
  async count(query?: QueryType<Partial<U>>) {
    if (!query) return (await this.loadData()).length;

    const data = await this.findMany(query);
    return data.length;
  }

  private async loadData(load: boolean = true): Promise<CollectionType<U>> {
    const db = await loadData(this._pathDB);
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
    const db = await loadData(this._pathDB);
    db[this._collectionName] = data as Record<string, any>[];
    await saveData(this._pathDB, db);
  }

  private async saveMetadata() {
    const db = await loadData(this._pathDB);
    const index = (db["__metadata__"] as Array<MetadataType<T>>).findIndex(
      (metadata) => metadata.collectionName === this.collectionName
    );

    if (index === -1) return;

    (db["__metadata__"] as Array<MetadataType<T>>)[index].unique =
      this.metadata.unique;
    await saveData(this._pathDB, db);
  }
}
