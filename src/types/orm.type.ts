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

type MetadataType = {
  databaseInfo: { splitFile: boolean };
  collectionInfo: Array<{ collectionName: string; unique: Array<string> }>;
};

type RelationQueryOptionType = {
  collectionName: string;
  limit?: number;
  select?: string | string[];
  match?: QueryType<Partial<Record<string, any>>>;
  sort?: {
    property?: string;
    flag?: "asc" | "desc";
  };
  offset?: number;
  include?:
    | string
    | string[]
    | RelationQueryOptionType
    | RelationQueryOptionType[];
};

type QueryOptionType<T, TSelect = T> = TSelect extends (infer U)[]
  ? {
      limit?: number;
      select: TSelect;
      sort?: {
        property?: keyof T;
        flag?: "asc" | "desc";
      };
      offset?: number;
      include?:
        | string
        | string[]
        | RelationQueryOptionType
        | RelationQueryOptionType[];
      type?: "document" | "object" | "json";
    }
  : {
      limit?: number;
      select?: Array<keyof TSelect>;
      sort?: {
        property?: keyof T;
        flag?: "asc" | "desc";
      };
      offset?: number;
      include?:
        | string
        | string[]
        | RelationQueryOptionType
        | RelationQueryOptionType[];
      type?: "document" | "object" | "json";
    };

type QueryOneOptionType<T, TSelect = T> = TSelect extends (infer U)[]
  ? {
      select: TSelect;
      sort?: {
        property?: keyof T;
        flag?: "asc" | "desc";
      };
      include?:
        | string
        | string[]
        | RelationQueryOptionType
        | RelationQueryOptionType[];
      type?: "document" | "object" | "json";
    }
  : {
      select?: Array<keyof TSelect>;
      sort?: {
        property?: keyof T;
        flag?: "asc" | "desc";
      };
      include?:
        | string
        | string[]
        | RelationQueryOptionType
        | RelationQueryOptionType[];
      type?: "document" | "object" | "json";
    };

interface DataBaseType {
  [key: string]: Array<Record<string, any>>;
}

type OrmInfoType = { splitFile: boolean };

type CollectionInfoType = {
  /**
   * Name of the collection
   */
  collectionName: string;
  /**
   * Choose between `"increment" (default) and `"uuid"`
   */
  idStrategy?: "uuid" | "increment";
  /**
   * Defines one or more unique key constraints for the collection.
   */
  unique?: Array<string>;
  /**
   * Enables automatic creation timestamp. Defaults to false
   */
  createdAt?: boolean;
  /**
   * Enables automatic update timestamp. Defaults to false
   */
  updatedAt?: boolean;
  relations?: RelationType[];
};

type CollectionType<T> = Array<T>;

type DatabaseInfoOptionType = {
  path_db: string;
  splitFile: boolean; // Each collection is stored in its own file
  flag: string;
  encrypted?: boolean; // Each collection is encrypted
  secretKey?: string;
  salt?: string;
  // algorithm?:
  //   | "aes-128-ccm"
  //   | "aes-128-gcm"
  //   | "aes-128-ocb"
  //   | "aes-192-ccm"
  //   | "aes-192-gcm"
  //   | "aes-192-ocb"
  //   | "aes-256-ccm"
  //   | "aes-256-gcm"
  //   | "aes-256-ocb"
  //   | "chacha20-poly1305";
  mode?: "dev" | "prod";
};

type DatabaseConfigType = {
  path_db?: string;
  splitFile?: boolean; // Each collection is stored in its own file
  encrypted?: boolean; // Each collection is encrypted
  secretKey?: string;
  salt?: string;
  mode?: "dev" | "prod";
};

/**
 * Defines a relationship between collections in the ORM
 */
type RelationType = {
  /**
   * The name of the related (target) collection
   */
  collectionName: string;

  /**
   * The key in the current collection that holds the foreign key.
   *
   */
  localKey?: string;

  /**
   * The key in the target collection that the localKey references, __id is default value
   */
  foreignKey?: string;

  /**
   * Optional alias to access the related data (e.g., 'author' for a user relation), collectionName is default value.
   */
  as?: string;

  /**
   * Type of relationship between this collection and the target collection. hasOne is default value.
   * - 'belongsTo': This collection belongs to the target collection.
   * - 'hasOne': This collection is referenced by one document in the target collection.
   * - 'hasMany': This collection is referenced by multiple documents in the target collection.
   */
  relationType?: "belongsTo" | "hasOne" | "hasMany";

  /**
   * Action to take when related record is deleted. SET NULL is default value.
   * - 'CASCADE': delete this record too.
   * - 'SET NULL': set the localKey to null.
   * - 'RESTRICT': prevent deletion if relation exists.
   * - 'NO ACTION': do nothing.
   */
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";

  /**
   * Action to take when the foreignKey is updated. CASCADE is default value.
   * - 'CASCADE': update the localKey accordingly.
   * - 'SET NULL': set the localKey to null.
   * - 'RESTRICT': prevent update if relation exists.
   * - 'NO ACTION': do nothing.
   */
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
};

type CreatingCollectionOptinType<T> = {
  /**
   * Name of the collection
   */
  collectionName: string;
  /**
   * Choose between `"increment" (default) and `"uuid"`
   */
  idStrategy?: "uuid" | "increment";
  /**
   * Defines one or more unique key constraints for the collection.
   */
  uniqueKeys?: Array<keyof T>;
  /**
   * Enables automatic creation timestamp. Default value is false.
   */
  createdAt?: boolean;
  /**
   * Enables automatic update timestamp. Default value is false.
   */
  updatedAt?: boolean;
  relations?: string | string[] | RelationType | RelationType[];
};

export {
  OrmInfoType,
  CollectionInfoType,
  OperatorOp,
  PropOp,
  QueryType,
  MetadataType,
  QueryOptionType,
  QueryOneOptionType,
  CollectionType,
  DataBaseType,
  DatabaseInfoOptionType,
  DatabaseConfigType,
  CreatingCollectionOptinType,
  RelationType,
  RelationQueryOptionType,
};
