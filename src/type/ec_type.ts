interface EcDbType {
  [key: string]: Array<Record<string, any>>;
}

type CollectionType<T> = Array<T>;

interface EcAnd<T> {
  eq?: T;
  not?: T;
  lt?: T;
  gt?: T;
  lte?: T;
  gte?: T;
}

interface EcOp<T> extends EcAnd<T> {
  or?: Array<EcAnd<T>>;
}

type ecOptionsRequest<T> = {
  limit?: number;
  select?: Array<keyof T>;
  sort?: {
    entity?: keyof T;
    flag?: "asc" | "desc";
  };
};

type EcOpArith = "and" | "or" | "no";

type MetadataType<T> = { collectionName: string; unique: Array<keyof T> };

export {
  EcOp,
  ecOptionsRequest,
  EcDbType,
  CollectionType,
  EcOpArith,
  MetadataType,
};
