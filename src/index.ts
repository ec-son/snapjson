import { QueryType as query } from "./types/orm.type";
export * from "./lib/collection";
export * from "./lib/snapjson";
export * from "./utils/shortcutFunc";

export type QueryType<T> = query<Partial<T & { __id: number }>>;
