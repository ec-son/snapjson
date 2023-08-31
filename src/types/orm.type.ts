type OperatorOp =
  | "$eq"
  | "$ne"
  | "$lt"
  | "$lte"
  | "$gt"
  | "$gte"
  | "$in"
  | "$nin"
  | "$contains"
  | "$nocontains"
  | "$unkown";

type GenOp<T> = {
  $eq?: T extends string ? string | RegExp : T;
  $ne?: T extends string ? string | RegExp : T;
  $in?: T extends string ? Array<string | RegExp> : Array<T>;
  $nin?: T extends string ? Array<string | RegExp> : Array<T>;
};

type NumberOp<T = number> = {
  $lt?: T;
  $lte?: T;
  $gt?: T;
  $gte?: T;
} & GenOp<T>;

type DateOp = NumberOp<Date>;

type StringOp = GenOp<string>;

type ArrayOp<T> = {
  $eq?: T extends `${string & T}`
    ? T | RegExp | T[] | Array<string | RegExp>
    : T | T[];
  $ne?: ArrayOp<T>["$eq"];
  $contains?: ArrayOp<T>["$eq"];
  $nocontains?: ArrayOp<T>["$eq"];
};

type PropOp<T> = {
  [K in keyof T]: Required<T>[K] extends number
    ? T[K] | NumberOp
    : Required<T>[K] extends string
    ? T[K] | StringOp | RegExp
    : Required<T>[K] extends Date
    ? T[K] | DateOp
    : Required<T>[K] extends (infer U)[]
    ? U extends string
      ? Array<string | RegExp> | ArrayOp<U>
      : T[K] | ArrayOp<U>
    : T[K];
};

type OrOp<T> = Array<QueryType<T>>;
type AndOp<T> = Array<QueryType<T>>;

type QueryType<T> = { $and?: AndOp<T>; $or?: OrOp<T> } & PropOp<T>;

type MetadataType<T> = { collectionName: string; unique: Array<keyof T> };

type QueryOptionType<T, TSelect = T> = TSelect extends (infer U)[]
  ? {
      limit?: number;
      select: TSelect;
      sort?: {
        property?: keyof T;
        flag?: "asc" | "desc";
      };
      offset?: number;
    }
  : {
      limit?: number;
      select?: Array<keyof TSelect>;
      sort?: {
        property?: keyof T;
        flag?: "asc" | "desc";
      };
      offset?: number;
    };

type QueryOneOptionType<T, TSelect = T> = TSelect extends (infer U)[]
  ? {
      select: TSelect;
      sort?: {
        property?: keyof T;
        flag?: "asc" | "desc";
      };
    }
  : {
      select?: Array<keyof TSelect>;
      sort?: {
        property?: keyof T;
        flag?: "asc" | "desc";
      };
    };

interface DataBaseType {
  [key: string]: Array<Record<string, any>>;
}

type CollectionType<T> = Array<T>;

export {
  OperatorOp,
  PropOp,
  QueryType,
  MetadataType,
  QueryOptionType,
  QueryOneOptionType,
  CollectionType,
  DataBaseType,
};
