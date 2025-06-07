import { loadData } from "../utils/load-data";
import { DocumentDataType } from "../types/document-data.type";
import {
  CollectionInfoType,
  CollectionType,
  DatabaseInfoOptionType,
  OrmInfoType,
  QueryOneOptionType,
  QueryOptionType,
  QueryType,
  RelationQueryOptionType,
} from "../types/orm.type";
import { formatSize } from "../utils/utils.func";
import { Query } from "./query";
import { SnapJson } from "./snapjson";
import { saveData } from "../utils/save-data";
import { defineCollection, defineDocument } from "../utils/shortcutFunc";
import { getOpts } from "../utils/opts.func";
import { randomUUID } from "node:crypto";

export class Collection<
  T extends Object,
  U extends T & { readonly __id: string } = { readonly __id: string } & T
> {
  private _opt: DatabaseInfoOptionType;

  constructor(
    private readonly _collectionName: string,
    opt?:
      | Partial<
          Pick<
            DatabaseInfoOptionType,
            Exclude<keyof DatabaseInfoOptionType, "flag">
          >
        >
      | undefined
  ) {
    if ("__metadata__" === _collectionName)
      throw new Error("Connot create collection with '__metadata__' name.");

    this._opt = { ...getOpts(opt), flag: _collectionName };

    const orm = new SnapJson({ ...this._opt });
    if (!orm.isExistCollection(this._collectionName))
      throw new Error(`Collection '${this._collectionName}' doesn't exist.`);
  }

  //SELECT

  async findById(__id: string): Promise<DocumentDataType<U> | undefined>;

  async findById<
    X extends Array<keyof U> | undefined = undefined,
    Y extends Object = X extends Array<keyof U>
      ? { [K in X[number]]: K extends keyof U ? U[K] : never }
      : U
  >(
    __id: string,
    opts: X extends undefined ? QueryOneOptionType<U> : QueryOneOptionType<U, X>
  ): Promise<DocumentDataType<Y & Record<string, any>> | undefined>;

  async findById(__id: string, opts?: any): Promise<any> {
    return this.select({ __id } as QueryType<Partial<U>>, {
      ...opts,
      limit: -1,
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
  ): Promise<DocumentDataType<Y & Record<string, any>> | undefined>;

  async findOne(
    query: QueryType<any>,
    opts?: any
  ): Promise<DocumentDataType<any> | undefined> {
    return this.select(query, {
      ...opts,
      limit: -1,
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
  ): Promise<Array<DocumentDataType<Y & Record<string, any>>>>;

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
    const collectionData = (await this.loadData(
      this._collectionName
    )) as CollectionType<any>;
    const queryInstance = new Query(
      query,
      structuredClone(collectionData),
      opts as any
    );
    let result = queryInstance.getData();
    if (!result) return undefined;

    if (opts?.include)
      result = await this.getRelationData(result, opts.include);

    const t = defineDocument(result, this._collectionName, this._opt) as Array<
      DocumentDataType<any>
    >;

    return opts?.type === "object"
      ? result
      : opts?.type === "json"
      ? JSON.stringify(result)
      : t;
  }

  private async getRelationData(
    data: any,
    relationOpts:
      | string
      | string[]
      | RelationQueryOptionType
      | RelationQueryOptionType[] = []
  ) {
    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType;
    let isArray = false;

    if (!Array.isArray(data)) {
      data = [data];
      isArray = true;
    }

    const result = data;

    for (const collectionData of data) {
      if (!Array.isArray(relationOpts)) relationOpts = [relationOpts as any];
      for (let el of relationOpts) {
        if (typeof el === "string") el = { collectionName: el };

        const relation = collectionInfo?.relations?.find(
          (r) =>
            r.collectionName === (el as RelationQueryOptionType).collectionName
        );

        if (!relation) continue;

        const relationcCollection = await defineCollection(
          relation.collectionName,
          this._opt
        );

        const collectionDataRelation = await relationcCollection.find(
          {
            [relation.foreignKey]: collectionData[relation.localKey],
            ...el?.match,
          } as any,
          { limit: el?.limit, select: el?.select as any, type: "object" }
        );

        if (relation.type === "ONE_TO_ONE") {
          if (collectionDataRelation.length === 0)
            collectionData[relation.as] = null;
          else collectionData[relation.as] = collectionDataRelation[0];
        } else collectionData[relation.as] = collectionDataRelation;
      }
    }

    return !isArray ? data : data[0];
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

    const collectionData = (await this.loadData(
      this._collectionName
    )) as CollectionType<any>;
    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType;
    const relations = collectionInfo.relations || [];

    const tab: U[] = [];

    const getRelations = (data: T): T => {
      const t = {} as any;
      for (const relation of relations) {
        if (relation.localKey in data) {
          if (
            relation.type === "ONE_TO_ONE" &&
            Array.isArray(data[relation.localKey])
          )
            t[relation.localKey] = data[relation.localKey][0];
          else if (
            relation.type === "ONE_TO_MANY" &&
            !Array.isArray(data[relation.localKey])
          )
            t[relation.localKey] = [data[relation.localKey]];
          else t[relation.localKey] = data[relation.localKey];
        }
      }

      return t;
    };

    const getId = async () => {
      if (collectionInfo.idStrategy === "increment") {
        return (
          Number.parseInt(await this._lastInsertId(collectionData)) + 1
        ).toString();
      }

      return randomUUID();
    };

    for (const key in data) {
      const element = data[key];
      const __id = await getId();

      await this.constrain(element, collectionData);
      tab.push({ ...element, __id, ...getRelations(element) } as U);
      collectionData.push({ ...element, __id } as U);
    }

    await this.saveData(collectionData);
    return isArray
      ? (defineDocument(tab, this._collectionName, this._opt) as Array<
          DocumentDataType<U>
        >)
      : (defineDocument(
          tab[0],
          this._collectionName,
          this._opt
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
    const collectionData = (await this.loadData(
      this._collectionName
    )) as CollectionType<any>;
    const queryInstance = new Query(query, structuredClone(collectionData));
    let result = queryInstance.getData() as CollectionType<U>;

    if (result.length === 0) return null;
    if (!isMany) result = result.slice(0, 1);

    const updated = [];

    for (const index in collectionData) {
      const document = collectionData[index];
      const t = result.find((el) => el.__id === document.__id);
      if (!t) continue;
      if ("__id" in data) {
        const { __id, ...rest } = data;
        data = rest as any;
      }

      await this.constrain(data, collectionData, document.__id);
      collectionData[index] = { ...t, ...data };
      updated.push(collectionData[index]);
      if (result.length === 1) break;
    }

    await this.saveData(collectionData);
    return isMany
      ? (defineDocument(updated, this._collectionName, this._opt) as Array<
          DocumentDataType<U>
        >)
      : (defineDocument(
          updated[0],
          this._collectionName,
          this._opt
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
    const collectionData = (await this.loadData(
      this._collectionName
    )) as CollectionType<any>;
    const queryInstance = new Query(query, structuredClone(collectionData));
    const result = queryInstance.getData() as CollectionType<U>;

    const resultOfDeleted: U[] = [];
    if (result.length === 0) return null;
    for (const key in result) {
      const element = result[key];
      const index = collectionData.findIndex((el) => el.__id === element.__id);
      resultOfDeleted.push(...collectionData.splice(index, 1));
      if (!isMany) {
        await this.saveData(collectionData);
        return defineDocument(
          resultOfDeleted[0],
          this._collectionName,
          this._opt
        ) as DocumentDataType<U>;
      }
    }

    await this.saveData(collectionData);
    return defineDocument(
      resultOfDeleted,
      this._collectionName,
      this._opt
    ) as Array<DocumentDataType<U>>;
  }

  private async constrain(
    data: T | Partial<T>,
    collectionData: CollectionType<U>,
    __id?: string
  ) {
    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType;

    collectionInfo?.unique?.forEach((key) => {
      const t = collectionData.find((el) => {
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
  async lastInsertId(): Promise<string> {
    return this._lastInsertId();
  }

  private async _lastInsertId(
    collectionData?: CollectionType<U>
  ): Promise<string> {
    collectionData =
      collectionData ||
      ((await this.loadData(this._collectionName)) as CollectionType<any>);
    return collectionData.length > 0
      ? collectionData[collectionData.length - 1].__id
      : "0";
  }

  /**
   * Adds unique key.
   * @param keyName Name of unique key.
   * @returns Returns the unique key.
   */

  async addUniqueKey(
    keyName: keyof T | Array<keyof T>
  ): Promise<typeof keyName> {
    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType;
    const isArray = Array.isArray(keyName);
    let isAddedKey = false;

    if (!Array.isArray(keyName)) keyName = [keyName];
    for (const iterator of keyName as Array<string>) {
      if (collectionInfo?.unique?.includes(iterator)) continue;
      collectionInfo?.unique?.push(iterator);
      isAddedKey = true;
    }
    if (isAddedKey) await this.saveData(collectionInfo, "collection-info");
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
    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType;
    const isArray = Array.isArray(uniqueKey);

    if (!Array.isArray(uniqueKey)) uniqueKey = [uniqueKey];
    const savedKeyName: Array<keyof T> = [];

    for (const iterator of uniqueKey) {
      const index = collectionInfo?.unique?.findIndex((el) => el === iterator);
      if (index === -1) continue;
      collectionInfo?.unique?.splice(index, 1);
      savedKeyName.push(iterator);
    }

    if (savedKeyName.length > 0)
      await this.saveData(collectionInfo, "collection-info");
    return isArray ? savedKeyName : savedKeyName[0];
  }

  /**
   * Removes all unique keys
   */
  async removeAllUniqueKeys(): Promise<Array<keyof T>> {
    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType;
    const keys = collectionInfo.unique || [];
    collectionInfo.unique = [];
    await this.saveData(collectionInfo, "collection-info");
    return keys as Array<keyof T>;
  }

  /**
   * Returns all unique keys.
   */
  async getUniqueKeys(): Promise<Array<keyof T>> {
    return (
      (((await this.loadData("collection-info")) as CollectionInfoType)
        .unique as Array<keyof T>) || []
    );
  }

  get collectionName(): string {
    return this._collectionName;
  }

  get pathDB(): string {
    return this._opt.path_db;
  }

  /**
   * DATA BASE
   */

  /**
   * Returns size of this collection.
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
    if (!query) return ((await this.loadData()) as CollectionType<any>).length;

    const data = await this.find(query);
    return data.length;
  }

  private async saveData(
    data: CollectionInfoType | CollectionType<U>,
    flag?: string
  ) {
    if (!flag) flag = this._collectionName;
    if (flag === "collection-info") {
      const collectionInfo = (await loadData({
        ...this._opt,
        flag,
      })) as CollectionInfoType[];
      const findIndex = collectionInfo.findIndex(
        (el) => el.collectionName === this._collectionName
      );

      if (findIndex === -1) collectionInfo.push(data as CollectionInfoType);
      else collectionInfo[findIndex] = data as CollectionInfoType;
      await saveData(collectionInfo as CollectionType<any>, {
        ...this._opt,
        flag,
      });
    } else await saveData(data as CollectionType<any>, { ...this._opt, flag });
  }

  private async loadData(
    flag?: string
  ): Promise<OrmInfoType | CollectionInfoType | CollectionType<T>> {
    if (!flag) flag = this._collectionName;
    if (flag === "collection-info")
      return (
        ((await loadData({ ...this._opt, flag })) as CollectionInfoType[]).find(
          (collectionInfo) =>
            collectionInfo.collectionName === this._collectionName
        ) || { collectionName: this._collectionName, unique: [] }
      );
    return (await loadData({ ...this._opt, flag })) as
      | OrmInfoType
      | CollectionType<T>;
  }
}
