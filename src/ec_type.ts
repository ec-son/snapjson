interface EcDbType {
  [key: string]: Array<Record<string, any>>;
}

type EcEntityType<T> = Array<T>;

// type eq_not = Record<string, string | number | boolean | Date>;
// type lt_gt = Record<string, number | Date>;

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
  // entity?: string | null;
  select?: Array<keyof T>;
  sort?: {
    entity?: keyof T;
    flag?: "asc" | "desc";
  };
};

type EcOpArith = "and" | "or" | "no";

type EcMetadata<T> = { entity: string; unique?: Array<keyof T> };

// type EcCreateEntity<T> = { name: string; uniqueProperties?: Array<keyof T> };

export {
  EcOp,
  ecOptionsRequest,
  EcDbType,
  EcEntityType,
  EcOpArith,
  EcMetadata,

  // EcCreateEntity,
};
