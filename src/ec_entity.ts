import {
  EcDbType,
  EcEntityType,
  EcMetadata,
  EcOp,
  EcOpArith,
  ecOptionsRequest,
} from "./ec_type";
import { loadData, saveData } from "./utils/utils.func";

export class EcEntity<
  T extends Object,
  U extends T & { __id: number } = { __id: number } & T
> {
  private metadata: EcMetadata<T>;

  constructor(
    private readonly _pathDB: string,
    private readonly _entity: string
  ) {
    this.metadata = { entity: _entity, unique: [] };
  }

  //SELECT

  async findById(
    __id: number,
    opts?: Pick<
      ecOptionsRequest<U>,
      Exclude<keyof ecOptionsRequest<U>, "limit">
    >
  ): Promise<U | undefined> {
    return this.select(
      { eq: { __id } as Partial<U> },
      { ...opts, limit: 1 }
    ) as Promise<U | undefined>;
  }

  async findOne(
    query: EcOp<Partial<U>>,
    opts?: Pick<
      ecOptionsRequest<U>,
      Exclude<keyof ecOptionsRequest<U>, "limit">
    >
  ): Promise<U | undefined> {
    return this.select(query, { ...opts, limit: 1 }) as Promise<U | undefined>;
  }

  async findMany(
    query: EcOp<Partial<U>>,
    opts?: ecOptionsRequest<U>
  ): Promise<U[]> {
    return this.select(query, opts) as Promise<U[]>;
  }

  private async select(
    query: EcOp<Partial<U>>,
    opts?: ecOptionsRequest<U>
  ): Promise<U | U[] | undefined> {
    const limit = opts?.limit || 0;

    let result = structuredClone(await this.selectModel(query));
    result.sort((a, b) => this.compare(a, b, opts?.sort));
    if (opts?.select)
      result = this.selectProperties(result, opts.select) as U[];
    if (limit !== 1) return limit < 1 ? result : result.slice(0, limit);
    else return result.length > 0 ? result[0] : undefined;
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

  async add(data: T): Promise<U> {
    return this.insert(data) as Promise<U>;
  }

  async create(data: T): Promise<U> {
    return this.insert(data) as Promise<U>;
  }

  async insertOne(data: T): Promise<U> {
    return this.insert(data) as Promise<U>;
  }

  async inserMany(data: T[]): Promise<U[]> {
    return this.insert(data) as Promise<U[]>;
  }

  private async insert(data: T[] | T): Promise<U | U[]> {
    const isArray = Array.isArray(data);
    if (!Array.isArray(data)) data = [data];
    const entityDB = await this.loadData();
    const tab: U[] = [];
    for (const key in data) {
      const element = data[key];
      const __id = (await this.lastIdInsert(entityDB)) + 1;

      await this.constrain(element, entityDB);
      tab.push({ ...element, __id } as U);
      entityDB.push({ ...element, __id } as U);
    }

    await this.saveData(entityDB);
    return isArray ? tab : tab[0];
  }

  // UPDATE

  async updateOne(
    data: Partial<T>,
    query: EcOp<Partial<U>>
  ): Promise<U | null> {
    return this.update(data, query) as Promise<U | null>;
  }

  async updateMany(
    data: Partial<T>,
    query: EcOp<Partial<U>>
  ): Promise<U[] | null> {
    return this.update(data, query, true) as Promise<U[] | null>;
  }

  private async update(
    data: Partial<T>,
    query: EcOp<Partial<U>>,
    isMany?: boolean
  ): Promise<U | U[] | null> {
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

    const entityDB = await this.loadData();
    for (const index in entityDB) {
      const entity = entityDB[index];
      const t = result.find((el) => el.__id === entity.__id);

      if (!t) continue;
      await this.constrain(t, entityDB, entity.__id);

      entityDB[index] = t;
    }

    await this.saveData(entityDB);
    return isMany ? result : result[0];
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
    const entityDB = await this.loadData();
    for (const key in result) {
      const element = result[key];
      const index = entityDB.findIndex((el) => el.__id === element.__id);
      resultOfDeleted.push(...entityDB.splice(index, 1));
      if (!isMany) {
        await this.saveData(entityDB);
        return resultOfDeleted[0];
      }
    }

    await this.saveData(entityDB);
    return resultOfDeleted;
  }

  private async constrain(
    data: T | Partial<T>,
    entityDB: EcEntityType<U>,
    __id?: number
  ) {
    this.metadata.unique?.forEach((key) => {
      const t = entityDB.find(
        (el) => el[key] === data[key] && el.__id !== __id
      );
      if (t)
        throw new Error(
          `Connot duplicate ${key as string} field as unique key`
        );
    });
  }

  async lastIdInsert(entityDB?: EcEntityType<U>): Promise<number> {
    entityDB = entityDB || (await this.loadData());
    return entityDB.length > 0 ? entityDB[entityDB.length - 1].__id : 0;
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
    let entityDB = await this.loadData();

    ["eq", "not", "lt", "gt", "lte", "gte"].forEach((op) => {
      if (ops.includes(op)) {
        const opValue = this.adapterField(
          opt[op as keyof EcOp<U>] as Partial<U>
        );

        opValue.forEach((el) => {
          entityDB = entityDB.filter((e) => {
            if (op === "eq") return e[el.field] === el.value;
            if (op === "not") return e[el.field] !== el.value;
            // look for this
            if (op === "lt") return e[el.field] < el.value;
            if (op === "gt") return e[el.field] > el.value;
            if (op === "lte") return e[el.field] <= el.value;
            if (op === "gte") return e[el.field] >= el.value;

            // if (op === "lt") return e[el.field] < (el.value as any);
            // if (op === "gt") return e[el.field] > (el.value as any);
            // if (op === "lte") return e[el.field] <= (el.value as any);
            // if (op === "gte") return e[el.field] >= (el.value as any);
          });
        });
      }
    });
    return entityDB as U[];
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

  get entity(): string {
    return this._entity;
  }

  get pathDB(): string {
    return this._pathDB;
  }

  /**
   * DATA BASE
   */

  private async loadData(load: boolean = true): Promise<EcEntityType<U>> {
    const db = await loadData(this._pathDB);
    if (load) {
      this.loadDataLocally(db);
    }
    return db[this._entity] as EcEntityType<U>;
  }

  private loadDataLocally(db: EcDbType) {
    this.metadata =
      ((db["__metadata__"] as Array<EcMetadata<{}>>).find(
        (entity) => entity.entity === this._entity
      ) as EcMetadata<T>) || this.metadata;
  }

  private async saveData(data: EcEntityType<U>) {
    const db = await loadData(this._pathDB);
    db[this._entity] = data as Record<string, any>[];
    saveData(this._pathDB, db);
  }
}
