import {
  EcDbType,
  CollectionType,
  MetadataType,
  EcOp,
  EcOpArith,
  ecOptionsRequest,
} from "../type/ec_type";
import {
  defineDocument,
  formatSize,
  loadData,
  saveData,
} from "../utils/utils.func";
import { Document } from "./document";

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

  async findById(
    __id: number,
    opts?: Pick<
      ecOptionsRequest<U>,
      Exclude<keyof ecOptionsRequest<U>, "limit">
    >
  ): Promise<(Document<U> & Partial<U>) | undefined> {
    return this.select(
      { eq: { __id } as Partial<U> },
      { ...opts, limit: 1 }
    ) as Promise<(Document<U> & Partial<U>) | undefined>;
  }

  async findOne(
    query: EcOp<Partial<U>>,
    opts?: Pick<
      ecOptionsRequest<U>,
      Exclude<keyof ecOptionsRequest<U>, "limit">
    >
  ): Promise<(Document<U> & Partial<U>) | undefined> {
    return this.select(query, { ...opts, limit: 1 }) as Promise<
      (Document<U> & Partial<U>) | undefined
    >;
  }

  async findMany(
    query: EcOp<Partial<U>>,
    opts?: ecOptionsRequest<U>
  ): Promise<Array<Document<U> & Partial<U>>> {
    return this.select(query, opts) as Promise<Array<Document<U> & Partial<U>>>;
  }

  private async select(
    query: EcOp<Partial<U>>,
    opts?: ecOptionsRequest<U>
  ): Promise<
    (Document<U> & Partial<U>) | Array<Document<U> & Partial<U>> | undefined
  > {
    const limit = opts?.limit || 0;

    let result = structuredClone(await this.selectModel(query));
    result.sort((a, b) => this.compare(a, b, opts?.sort));
    if (opts?.select)
      result = this.selectProperties(result, opts.select) as U[];
    if (limit !== 1)
      return limit < 1
        ? (defineDocument(result, this.pathDB, this._collectionName) as Array<
            Document<U> & Partial<U>
          >)
        : (defineDocument(
            result.slice(0, limit),
            this.pathDB,
            this._collectionName
          ) as Array<Document<U> & Partial<U>>);
    else
      return result.length > 0
        ? (defineDocument(
            result[0],
            this.pathDB,
            this._collectionName
          ) as Document<U> & Partial<U>)
        : undefined;
  }

  private async selectModel(query: EcOp<Partial<U>>): Promise<U[]> {
    const op = this.getOp(query);
    let result: U[] = [];

    if (op === "or") {
      result = await this.orOp(query);
    } else if (op === "and") {
      result = await this.andOp(query);
    }
    return result;
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

  async inserMany(data: T[]): Promise<Array<Document<U> & U>> {
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
    query: EcOp<Partial<U>>
  ): Promise<(Document<U> & U) | null> {
    return this.update(data, query) as Promise<(Document<U> & U) | null>;
  }

  async updateMany(
    data: Partial<T>,
    query: EcOp<Partial<U>>
  ): Promise<Array<Document<U> & U> | null> {
    return this.update(data, query, true) as Promise<Array<
      Document<U> & U
    > | null>;
  }

  private async update(
    data: Partial<T>,
    query: EcOp<Partial<U>>,
    isMany?: boolean
  ): Promise<(Document<U> & U) | Array<Document<U> & U> | null> {
    const result = await this.selectModel(query);
    if (result.length === 0) return null;

    if (isMany)
      result.forEach((el, index) => {
        if ("__id" in data) delete data.__id;
        el = { ...el, ...data };
        result[index] = el;
      });
    else {
      if ("__id" in data) delete data.__id;
      result[0] = { ...result[0], ...data };
    }

    const collectionDB = await this.loadData();
    for (const index in collectionDB) {
      const document = collectionDB[index];
      const t = result.find((el) => el.__id === document.__id);

      if (!t) continue;
      await this.constrain(t, collectionDB, document.__id);

      collectionDB[index] = t;
    }

    await this.saveData(collectionDB);
    return isMany
      ? (defineDocument(result, this.pathDB, this._collectionName) as Array<
          Document<U> & U
        >)
      : (defineDocument(
          result[0],
          this.pathDB,
          this._collectionName
        ) as Document<U> & U);
  }

  async deleteOne(query: EcOp<Partial<U>>): Promise<U | null> {
    return this.delete(query) as Promise<U | null>;
  }

  async deleteMany(query: EcOp<Partial<U>>): Promise<U[] | null> {
    return this.delete(query, true) as Promise<U[] | null>;
  }

  private async delete(
    query: EcOp<Partial<U>>,
    isMany?: boolean
  ): Promise<U | U[] | null> {
    const result = await this.selectModel(query);
    const resultOfDeleted: U[] = [];
    if (result.length === 0) return null;
    const collectionDB = await this.loadData();
    for (const key in result) {
      const element = result[key];
      const index = collectionDB.findIndex((el) => el.__id === element.__id);
      resultOfDeleted.push(...collectionDB.splice(index, 1));
      if (!isMany) {
        await this.saveData(collectionDB);
        return resultOfDeleted[0];
      }
    }

    await this.saveData(collectionDB);
    return resultOfDeleted;
  }

  private async constrain(
    data: T | Partial<T>,
    collectionDB: CollectionType<U>,
    __id?: number
  ) {
    this.metadata.unique?.forEach((key) => {
      const t = collectionDB.find(
        (el) => el[key] === data[key] && el.__id !== __id
      );
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

  private getOp(opt: EcOp<Partial<U>>): EcOpArith {
    if (opt.or) return "or";
    return Object.keys(opt).length > 0 ? "and" : "no";
  }

  private compare(
    a: U,
    b: U,
    obj?: { property?: keyof U; flag?: "asc" | "desc" }
  ): number {
    let { property, flag } = obj || { property: "__id", flag: "asc" };

    property = property || "__id";

    if (typeof a[property] === "string") {
      const a1 = a[property] as string;
      const b1 = b[property] as string;
      return flag === "desc" ? b1.localeCompare(a1) : a1.localeCompare(b1);
    } else if (a[property] instanceof Date) {
      const a1 = a[property] as Date;
      const b1 = b[property] as Date;
      return flag === "desc"
        ? b1.getTime() - a1.getTime()
        : a1.getTime() - b1.getTime();
    } else {
      const a1 = a[property] as number;
      const b1 = b[property] as number;
      return flag === "desc" ? b1 - a1 : a1 - b1;
    }
  }

  private selectProperties(
    result: U[],
    select: Array<keyof U>
  ): Pick<U, keyof U>[] {
    return result.map((el) => {
      const extractObj = {} as Pick<U, keyof U>;
      select.forEach((property) => {
        if (el.hasOwnProperty(property)) extractObj[property] = el[property];
      });
      return extractObj;
    }) as Pick<U, keyof U>[];
  }

  private adapterField(obj: Partial<U>) {
    let r: {
      field: keyof U;
      value: any;
    }[] = [];

    Object.keys(obj).forEach((key) => {
      r.push({
        field: key as keyof U,
        value: obj[key as keyof Partial<U>],
      });
    });
    return r;
  }

  private async andOp(opt: EcOp<Partial<U>>): Promise<U[]> {
    const ops = Object.keys(opt);
    let collectionDB = await this.loadData();

    ["eq", "not", "lt", "gt", "lte", "gte"].forEach((op) => {
      if (ops.includes(op)) {
        const opValue = this.adapterField(
          opt[op as keyof EcOp<U>] as Partial<U>
        );

        opValue.forEach((el) => {
          collectionDB = collectionDB.filter((e) => {
            if (op === "eq") return e[el.field] === el.value;
            if (op === "not") return e[el.field] !== el.value;
            if (op === "lt") return e[el.field] < el.value;
            if (op === "gt") return e[el.field] > el.value;
            if (op === "lte") return e[el.field] <= el.value;
            if (op === "gte") return e[el.field] >= el.value;
          });
        });
      }
    });
    return collectionDB as U[];
  }

  private async orOp(opt: EcOp<Partial<U>>): Promise<U[]> {
    if (opt.or!.length < 1) return [];

    const andOp1 = opt.or![0];
    const result: U[] = await this.andOp(andOp1);

    const andOpAll = opt.or?.slice(1);
    const resultAll: U[] = [];

    for (const andOp of andOpAll!) {
      resultAll.push(...(await this.andOp(andOp)));
    }

    resultAll.forEach((el) => {
      if (!result.includes(el)) result.push(el);
    });

    return result as U[];
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
   * Count documents in this collection.
   */
  async count() {
    return (await this.loadData()).length;
  }

  private async loadData(load: boolean = true): Promise<CollectionType<U>> {
    const db = await loadData(this._pathDB);
    if (load) {
      this.loadDataLocally(db);
    }
    return db[this._collectionName] as CollectionType<U>;
  }

  private loadDataLocally(db: EcDbType) {
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
