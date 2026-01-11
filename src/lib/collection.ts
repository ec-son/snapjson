import { loadData } from "../utils/load-data";
import { DocumentDataType } from "../types/document-data.type";
import {
  CollectionInfoType,
  CollectionType,
  DatabaseConfigType,
  DatabaseInfoOptionType,
  OrmInfoType,
  QueryOneOptionType,
  QueryOptionType,
  QueryType,
  RelationQueryOptionType,
  RelationType,
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
  U extends T & {
    readonly __id: string;
    createdAt?: Date;
    updatedAt?: Date;
  } = {
    readonly __id: string;
  } & T
> {
  private _opt: DatabaseInfoOptionType;

  constructor(
    private readonly _collectionName: string,
    opt?: DatabaseConfigType | undefined
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

    if (opts.select && !Array.isArray(opts.select)) opts.select = [opts.select];

    let isSelectActived: string[] | null = null;
    if (opts.include && Array.isArray(opts.select) && opts.select.length > 0) {
      isSelectActived = opts.select;
      opts.select = undefined;
    }

    const queryInstance = new Query(
      query,
      structuredClone(collectionData),
      opts as any
    );
    let result = queryInstance.getData();
    if (!result) return undefined;

    if (opts.include) {
      result = await this.getRelationData(
        result,
        opts.include,
        isSelectActived
      );
      if (isSelectActived) {
        const getExtractObj = (el) => {
          const extractObj = {} as Pick<U, keyof U>;
          isSelectActived.forEach((property) => {
            if (el.hasOwnProperty(property))
              extractObj[property] = el[property];
          });
          return extractObj;
        };
        if (!Array.isArray(result)) {
          result = getExtractObj(result);
        } else result = result.map((el) => getExtractObj(el));
      }
    }

    const t = defineDocument(result, this._collectionName, this._opt) as Array<
      DocumentDataType<any>
    >;

    return opts?.type === "object"
      ? result
      : opts?.type === "json"
      ? (JSON.stringify(result) as any)
      : t;
  }

  private async getRelationData(
    data: any,
    relationOpts:
      | string
      | string[]
      | RelationQueryOptionType
      | RelationQueryOptionType[] = [],
    selectParent: string[] | null
  ) {
    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType;
    let isArray = false;

    if (!Array.isArray(data)) {
      data = [data];
      isArray = true;
    }

    if (Array.isArray(data) && data.length === 0) return [];

    if (!Array.isArray(relationOpts)) relationOpts = [relationOpts as any];
    for (let el of relationOpts) {
      if (typeof el === "string") el = { collectionName: el };

      const relation = collectionInfo?.relations?.find(
        (r) =>
          r.collectionName === (el as RelationQueryOptionType).collectionName
      );

      if (!relation) continue;

      if (Array.isArray(selectParent) && !selectParent.includes(relation.as))
        continue;

      const relationcCollection = await defineCollection(
        relation.collectionName,
        this._opt
      );

      for (const collectionData of data) {
        let collectionDataRelation: any;
        if (relation.relationType === "belongsTo") {
          collectionDataRelation =
            (await relationcCollection.findOne(
              {
                [relation.foreignKey]: collectionData[relation.localKey],
                ...el?.match,
              } as any,
              {
                select: el?.select as any,
                type: "object",
                include: el?.include as any,
              }
            )) || null;
        } else {
          if (relation.relationType === "hasOne") {
            collectionDataRelation =
              (await relationcCollection.findOne(
                {
                  [relation.localKey]: collectionData[relation.foreignKey],
                  ...el?.match,
                } as any,
                {
                  select: el?.select as any,
                  type: "object",
                  include: el?.include as any,
                }
              )) || null;
          } else {
            collectionDataRelation = await relationcCollection.find(
              {
                [relation.localKey]: collectionData[relation.foreignKey],
                ...el?.match,
              } as any,
              {
                limit: el?.limit,
                select: el?.select as any,
                type: "object",
                sort: el?.sort as any,
                include: el?.include as any,
                offset: el?.offset as any,
              }
            );
          }
        }
        collectionData[relation.as] = collectionDataRelation;
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
    const relations = await this.getAllRelations(this._collectionName, "child");

    const tab: U[] = [];

    const stringifyId = (id: any): string | string[] => {
      if (!Array.isArray(id)) return Number.isInteger(id) ? id.toString() : id;
      else
        return id.map((el) =>
          Number.isInteger(el) ? el.toString() : el
        ) as string[];
    };

    const getRelation = (data: T): T => {
      const t = {} as any;
      for (const relation of relations) {
        if (relation.localKey in data) {
          if (Array.isArray(data[relation.localKey]))
            t[relation.localKey] = stringifyId(data[relation.localKey][0]);
          else t[relation.localKey] = stringifyId(data[relation.localKey]);
        }
      }
      return t;
    };

    const getId = async () => {
      if (collectionInfo.idStrategy === "uuid") return randomUUID();

      return (
        Number.parseInt(await this._lastInsertId(collectionData)) + 1
      ).toString();
    };

    const getTimestamp = () => {
      const timestamp: { createdAt?: Date; updatedAt?: Date } = {};

      if (collectionInfo.createdAt) timestamp.createdAt = new Date();
      if (collectionInfo.updatedAt) timestamp.updatedAt = new Date();
      return timestamp;
    };

    for (const key in data) {
      const element = data[key];
      const __id = await getId();

      await this.constrain(element, collectionData);
      const _t = {
        ...element,
        __id,
        ...getRelation(element),
        ...getTimestamp(),
      } as U;
      tab.push(_t);
      collectionData.push(_t);
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

    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType;

    const queryInstance = new Query(query, structuredClone(collectionData));
    let result = queryInstance.getData() as CollectionType<U>;

    if (result.length === 0) return null;
    if (!isMany) result = result.slice(0, 1);

    const updated = [];
    const oldAndUpdatedData = [];

    const relationsAll = await this.getAllRelations(
      this._collectionName,
      "all"
    );

    const stringifyId = (id: any): string | string[] => {
      if (!Array.isArray(id)) return Number.isInteger(id) ? id.toString() : id;
      else
        return id.map((el) =>
          Number.isInteger(el) ? el.toString() : el
        ) as string[];
    };

    const getRelation = (data: Partial<T>): T => {
      const childrenRelation = relationsAll.filter((el) => el.flag === "child");
      const t = {} as any;
      for (const relation of childrenRelation) {
        if (relation.localKey in data) {
          if (Array.isArray(data[relation.localKey]))
            t[relation.localKey] = stringifyId(data[relation.localKey][0]);
          else t[relation.localKey] = stringifyId(data[relation.localKey]);
        }
      }

      return t;
    };

    const getTimestamp = () => {
      if (collectionInfo.updatedAt) return { updatedAt: new Date() };
      return {};
    };

    for (const index in collectionData) {
      const document = collectionData[index];
      const t = result.find((el) => el.__id === document.__id);
      if (!t) continue;
      if ("__id" in data) {
        const { __id, ...rest } = data;
      }

      await this.constrain(data, collectionData, document.__id);
      const _updated = {
        ...t,
        ...data,
        ...getRelation(data),
        ...getTimestamp(),
      };
      oldAndUpdatedData.push({
        oldData: collectionData[index],
        updatedData: _updated,
      });
      collectionData[index] = _updated;
      updated.push(_updated);
      if (result.length === 1) break;
    }

    const cascading = async (
      oldAndUpdatedData: {
        oldData: Record<string, number>[];
        updatedData: Record<string, number>[];
      }[],
      relations: (RelationType & {
        parent: string;
        child: string;
      })[]
    ) => {
      if (!Array.isArray(oldAndUpdatedData))
        oldAndUpdatedData = [oldAndUpdatedData];
      let isUpdatedlocalKey = false;
      for (const relation of relations) {
        for (const key in oldAndUpdatedData) {
          const { oldData, updatedData } = oldAndUpdatedData[key];

          if (oldData[relation.foreignKey] !== updatedData[relation.foreignKey])
            isUpdatedlocalKey = true;
          else oldAndUpdatedData.splice(key as any, 1);
        }
        if (isUpdatedlocalKey) break;
      }

      if (!isUpdatedlocalKey) return;

      for (const i in relations) {
        for (let j = 1; j < relations.length; j++) {
          const a = relations[i];
          const b = relations[j];

          if (
            a.child === b.child &&
            a.localKey === b.localKey &&
            a.foreignKey === b.foreignKey
          )
            relations.splice(j, 1);
        }
      }

      for (const element of oldAndUpdatedData) {
        const { oldData, updatedData } = element;
        for (const relation of relations) {
          if (relation.onUpdate === "NO ACTION") continue;

          const collectionRelation = await defineCollection(relation.child);
          if (relation.onUpdate === "CASCADE") {
            await collectionRelation.updateMany(
              { [relation.localKey]: updatedData[relation.foreignKey] },
              {
                [relation.localKey]: oldData[relation.foreignKey],
              }
            );
          } else if (relation.onUpdate === "SET NULL") {
            const t = await collectionRelation.updateMany(
              { [relation.localKey]: null },
              { [relation.localKey]: oldData[relation.foreignKey] }
            );
          } else if (relation.onUpdate === "RESTRICT") {
            throw new Error(
              "Update operation blocked: This record is referenced by another collection with an ON UPDATE RESTRICT rule. Modifying the key is not allowed."
            );
          }
        }
      }
    };

    const parentsRelation = relationsAll.filter((el) => el.flag === "parent");

    for (const key in parentsRelation) {
      if (parentsRelation[key].onUpdate === "RESTRICT")
        await cascading(
          !isMany ? oldAndUpdatedData[0] : oldAndUpdatedData,
          parentsRelation.splice(key as any, 1)
        );
    }

    await this.saveData(collectionData);
    if (parentsRelation.length > 0)
      await cascading(
        !isMany ? oldAndUpdatedData[0] : oldAndUpdatedData,
        parentsRelation
      );
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

      if (!isMany) break;
    }

    const cascading = async (
      datas: Record<string, any>,
      relations: (RelationType & {
        parent: string;
        child: string;
      })[]
    ) => {
      if (!Array.isArray(datas)) datas = [datas];

      for (const i in relations) {
        for (let j = 1; j < relations.length; j++) {
          const a = relations[i];
          const b = relations[j];

          if (
            a.child === b.child &&
            a.localKey === b.localKey &&
            a.foreignKey === b.foreignKey
          )
            relations.splice(j, 1);
        }
      }

      for (const data of datas as Array<Record<string, any>>) {
        for (const relation of relations) {
          if (relation.onDelete === "NO ACTION") continue;

          const collectionRelation = await defineCollection(relation.child);
          if (relation.onDelete === "CASCADE") {
            await collectionRelation.deleteMany({
              [relation.localKey]: data[relation.foreignKey],
            });
          } else if (relation.onDelete === "SET NULL") {
            const t = await collectionRelation.updateMany(
              { [relation.localKey]: null },
              { [relation.localKey]: data[relation.foreignKey] }
            );
          } else if (relation.onDelete === "RESTRICT") {
            throw new Error(
              "Delete operation blocked: This record is referenced by another collection with an ON DELETE RESTRICT rule. Deleting it is not allowed."
            );
          }
        }
      }
    };

    const relations = await this.getAllRelations(
      this._collectionName,
      "parent"
    );

    for (const key in relations) {
      if (relations[key].onDelete === "RESTRICT")
        await cascading(
          !isMany ? resultOfDeleted[0] : resultOfDeleted,
          relations.splice(key as any, 1)
        );
    }

    if (!isMany) {
      await this.saveData(collectionData);
      await cascading(resultOfDeleted[0], relations);
      return defineDocument(
        resultOfDeleted[0],
        this._collectionName,
        this._opt
      ) as DocumentDataType<U>;
    }

    await this.saveData(collectionData);
    await cascading(resultOfDeleted, relations);
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

  private async getAllRelations(
    collectionName: string,
    flag: "all" | "child" | "parent" = "all"
  ): Promise<
    (RelationType & {
      parent: string;
      child: string;
      flag: "child" | "parent";
    })[]
  > {
    const collectionInfos = (await loadData({
      ...this._opt,
      flag: "collection-info",
    })) as CollectionInfoType[];

    const collectionRelations: (RelationType & {
      parent: string;
      child: string;
      flag: "child" | "parent";
    })[] = [];

    const childTest = (
      collectionInfo: CollectionInfoType,
      relation: RelationType
    ) =>
      (collectionInfo.collectionName === collectionName &&
        relation.relationType === "belongsTo") ||
      (relation.collectionName === collectionName &&
        relation.relationType !== "belongsTo");

    const parentTest = (
      collectionInfo: CollectionInfoType,
      relation: RelationType
    ) =>
      (collectionInfo.collectionName === collectionName &&
        relation.relationType !== "belongsTo") ||
      (relation.collectionName === collectionName &&
        relation.relationType === "belongsTo");

    const getParentAndChild = (
      collectionInfo: CollectionInfoType,
      relation: RelationType
    ) => {
      let t: { parent: string; child: string };

      if (relation.relationType === "belongsTo")
        t = {
          parent: relation.collectionName,
          child: collectionInfo.collectionName,
        };
      else
        t = {
          parent: collectionInfo.collectionName,
          child: relation.collectionName,
        };

      return t;
    };

    for (const collectionInfo of collectionInfos) {
      for (const relation of collectionInfo.relations) {
        if (flag === "child" && childTest(collectionInfo, relation))
          collectionRelations.push({
            ...relation,
            ...getParentAndChild(collectionInfo, relation),
            flag: "child",
          });
        else if (flag === "parent" && parentTest(collectionInfo, relation))
          collectionRelations.push({
            ...relation,
            ...getParentAndChild(collectionInfo, relation),
            flag: "parent",
          });
        else if (
          flag === "all" &&
          (childTest(collectionInfo, relation) ||
            parentTest(collectionInfo, relation))
        ) {
          collectionRelations.push({
            ...relation,
            ...getParentAndChild(collectionInfo, relation),
            flag: childTest(collectionInfo, relation) ? "child" : "parent",
          });
        }
      }
    }
    return collectionRelations;
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
