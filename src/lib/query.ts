import {
  CollectionType,
  OperatorOp,
  PropOp,
  QueryOptionType,
  QueryType,
} from "../types/orm.type";
import { compare, isEqual } from "../utils/utils.func";

export class Query<U extends Object> {
  private data: CollectionType<U> | U | undefined;

  constructor(
    private query: QueryType<Partial<U>>,
    private collectionDB: CollectionType<U>,
    {
      limit,
      select,
      sort,
      offset,
    }: QueryOptionType<U> = {} as QueryOptionType<U>
  ) {
    // get data
    this.collectionDB = this.selectModel(this.query, this.collectionDB);

    // sort
    this.collectionDB = this.collectionDB.sort((a, b) =>
      this.compare(a, b, sort)
    );

    // offset
    if (offset) {
      this.collectionDB = this.collectionDB.slice(offset);
    }

    // select
    if (select)
      this.collectionDB = this.selectProperties(this.collectionDB, select);

    // limit
    this.limitDocument(limit);
  }

  private selectModel(
    query: QueryType<Partial<U>>,
    collectionDB: CollectionType<U>
  ): CollectionType<U> {
    const { $and, $or, ...$prop } = query;

    if ($and) {
      $and.forEach((el) => {
        collectionDB = this.selectModel(el, collectionDB);
      });

      return collectionDB;
    } else if ($or) {
      const resultAll: Array<CollectionType<U>> = [];
      $or.forEach((el) => {
        resultAll.push(this.selectModel(el, collectionDB));
      });

      const result: CollectionType<U> = [];
      for (const iterator of resultAll) {
        result.push(...iterator.filter((el) => !result.includes(el)));
      }
      return result;
    } else if ($prop) {
      Object.keys($prop).forEach((key) => {
        collectionDB = this.processData(
          key as keyof PropOp<U>,
          ($prop as PropOp<Partial<U>>)[key as keyof PropOp<Partial<U>>],
          collectionDB
        );
      });

      return collectionDB;
    }
    return [];
  }

  private processData(
    key: keyof PropOp<Partial<U>>,
    value: PropOp<Partial<U>>[keyof PropOp<Partial<U>>],
    collectionDB: CollectionType<U>
  ): CollectionType<U> {
    if (
      ["number", "string", "boolean"].includes(typeof value) ||
      value instanceof RegExp ||
      value instanceof Date ||
      Array.isArray(value)
    ) {
      if (value instanceof RegExp) {
        return collectionDB.filter(
          (el) => typeof el[key] === "string" && value.test(el[key] as string)
        );
      }
      return collectionDB.filter((el) => {
        if (Array.isArray(value) && Array.isArray(el[key])) {
          return (
            value.length === (el[key] as Array<any>).length &&
            value.every((_e, i) => {
              const _tRG = this.testRegExp(_e, (el[key] as Array<any>)[i]);
              if (_tRG !== "none") return _tRG;
              return isEqual(_e, (el[key] as Array<any>)[i]);
            })
          );
        }
        return isEqual(el[key], value);
      });
    } else if (value instanceof Object) {
      (Object.keys(value) as Array<keyof PropOp<Partial<U>>[keyof U]>).forEach(
        (op) => {
          switch (op as OperatorOp) {
            case "$eq":
              if (value[op] instanceof RegExp) {
                collectionDB = collectionDB.filter(
                  (el) =>
                    typeof el[key] === "string" &&
                    (value[op] as RegExp).test(el[key] as string)
                );
              } else
                collectionDB = collectionDB.filter((el) => {
                  if (Array.isArray(value[op]) && Array.isArray(el[key])) {
                    return (
                      (value[op] as Array<any>).length ===
                        (el[key] as Array<any>).length &&
                      (value[op] as Array<any>).every((_e, i) => {
                        const _tRG = this.testRegExp(
                          _e,
                          (el[key] as Array<any>)[i]
                        );
                        if (_tRG !== "none") return _tRG;
                        return isEqual(_e, (el[key] as Array<any>)[i]);
                      })
                    );
                  }
                  return isEqual(value[op], el[key]);
                });
              break;
            case "$ne":
              if (value[op] instanceof RegExp) {
                collectionDB = collectionDB.filter(
                  (el) =>
                    !(
                      typeof el[key] === "string" &&
                      (value[op] as RegExp).test(el[key] as string)
                    )
                );
              } else
                collectionDB = collectionDB.filter((el) => {
                  if (Array.isArray(value[op]) && Array.isArray(el[key])) {
                    return !(
                      (value[op] as Array<any>).length ===
                        (el[key] as Array<any>).length &&
                      (value[op] as Array<any>).every((_e, i) => {
                        const _tRG = this.testRegExp(
                          _e,
                          (el[key] as Array<any>)[i]
                        );
                        if (_tRG !== "none") return _tRG;
                        return isEqual(_e, (el[key] as Array<any>)[i]);
                      })
                    );
                  }
                  return !isEqual(value[op], el[key]);
                });
              break;
            case "$in":
              collectionDB = collectionDB.filter(
                (el) =>
                  Array.isArray(value[op]) &&
                  (value[op] as Array<any>).find((_e) => {
                    const _tRG = this.testRegExp(_e, el[key]);
                    if (_tRG !== "none") return _tRG;
                    return isEqual(_e, el[key]);
                  }) !== undefined
              );
              break;
            case "$nin":
              collectionDB = collectionDB.filter(
                (el) =>
                  Array.isArray(value[op]) &&
                  (value[op] as Array<any>).find((_e) => {
                    const _tRG = this.testRegExp(_e, el[key]);
                    if (_tRG !== "none") return _tRG;
                    return isEqual(_e, el[key]);
                  }) === undefined
              );
              break;
            case "$contains":
              collectionDB = collectionDB.filter((el) => {
                if (Array.isArray(el[key])) {
                  if (Array.isArray(value[op])) {
                    for (const iterator of value[op] as Array<any>) {
                      if (
                        (el[key] as any).find((_e: any) => {
                          const _tRG = this.testRegExp(iterator, _e);
                          if (_tRG !== "none") return _tRG;
                          return isEqual(_e, iterator);
                        }) === undefined
                      )
                        return false;
                    }
                    return true;
                  } else
                    return (
                      (el[key] as any).find((_e: any) => {
                        const _tRG = this.testRegExp(value[op], _e);
                        if (_tRG !== "none") return _tRG;
                        return isEqual(_e, value[op]);
                      }) !== undefined
                    );
                }
              });
              break;
            case "$nocontains":
              collectionDB = collectionDB.filter((el) => {
                if (Array.isArray(el[key])) {
                  if (Array.isArray(value[op])) {
                    const isContained: boolean[] = [];
                    for (const iterator of value[op] as Array<any>) {
                      isContained.push(
                        (el[key] as any).find((_e: any) => {
                          const _tRG = this.testRegExp(iterator, _e);
                          if (_tRG !== "none") return _tRG;

                          return isEqual(_e, iterator);
                        }) !== undefined
                      );
                    }
                    return !isContained.every((el) => el);
                  } else
                    return (
                      (el[key] as any).find((_e: any) => {
                        const _tRG = this.testRegExp(value[op], _e);
                        if (_tRG !== "none") return _tRG;
                        return isEqual(_e, value[op]);
                      }) === undefined
                    );
                }
              });
              break;
            default:
              if (["$gt", "$gte", "$lt", "$lte"].includes(op as OperatorOp)) {
                const _op = (op as string).replace("$", "");
                collectionDB = collectionDB.filter((el) =>
                  compare(el[key] as any, value[op] as any, _op as any)
                );
              } else collectionDB = [];
              break;
          }
        }
      );
      return collectionDB;
    } else return [];
  }

  private selectProperties(
    result: CollectionType<U>,
    select: Array<keyof U>
  ): CollectionType<U> {
    return result.map((el) => {
      const extractObj = {} as Pick<U, keyof U>;
      select.forEach((property) => {
        if (el.hasOwnProperty(property)) extractObj[property] = el[property];
      });
      return extractObj;
    });
  }

  private testRegExp(pattern: any, text: any): boolean | "none" {
    if (!(pattern instanceof RegExp && typeof text === "string")) return "none";
    return pattern.test(text);
  }

  private compare(
    a: any,
    b: any,
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

  private limitDocument(limit?: number): void {
    if (!limit) this.data = this.collectionDB;
    else if (limit === 1) this.data = this.collectionDB[0];
    else this.data = this.collectionDB.slice(0, limit);
  }

  getData<X = U>(): CollectionType<X> | X | undefined {
    return this.data as X | CollectionType<X> | undefined;
  }
}
