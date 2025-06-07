import { Collection } from "../lib/collection";
import { Document } from "../lib/document";
import { SnapJson } from "../lib/snapjson";
import { DocumentDataType } from "../types/document-data.type";
import {
  CreatingCollectionOptinType,
  DatabaseInfoOptionType,
} from "../types/orm.type";

/**
 * Returns instance of collection
 * @param collectionName Name of collection
 * @param opt - with properties:
 *  - path_db [path_db="db"]: Path of database dir
 *  - splitFile [splitFile=false]:
 *  - encrypted [encrypted=false]:
 *  - secretKey:
 *  - salt:
 *  - mode [mode="dev"] "dev" | "prod";
 *  - force [force=false]: If true, create collection when it doesn't exist.
 * @returns Instance of the specified collection if found.
 * @throws If the collection is not found, an error will be thrown.
 */
export async function defineCollection<T extends Object>(
  collectionName: string,
  opt: Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  > & { force?: boolean }
): Promise<Collection<T>>;

/**
 * Returns instance of collection
 * @param collectionName Name of collection
 * @param {boolean} force [force=false] Create collection when it doesn't exist.
 * @returns Instance of the specified collection if found.
 * @throws If the collection is not found, an error will be thrown.
 */

export async function defineCollection<T extends Object>(
  collectionName: string,
  force?: boolean
): Promise<Collection<T>>;

export async function defineCollection<T extends Object>(
  collectionName: string,
  opt: any
): Promise<Collection<T>> {
  let force = false;
  if (typeof opt === "boolean") {
    force = opt;
    opt = {};
  } else force = opt?.force;

  const orm = new SnapJson({ ...opt });
  return orm.collection(collectionName, force);
}

/**
 * Creates a new collection.
 * @param {string | { name: string; uniqueKeys?: Array<keyof T> }} collection The name of the collection or an object with the following properties:
 *  - name The name of the collection.
 *  - uniqueKeys An array containing all unique keys in this collection.
 * @param opt - with properties:
 *  - path_db [path_db="db"]: Path of database dir
 *  - splitFile [splitFile=false]:
 *  - encrypted [encrypted=false]:
 *  - secretKey:
 *  - salt:
 *  - mode [mode="dev"] "dev" | "prod";
 *  - force [force=false]: If true, existing collection with the same name will be overwritten.
 * @returns Collection instance(s).
 */
export async function createCollection<T extends Object>(
  collection: string | CreatingCollectionOptinType<T>,
  opt?: Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  > & { force?: boolean }
): Promise<Collection<T>>;

export async function createCollection<T extends Object>(
  collections: string[] | CreatingCollectionOptinType<T>[],
  opt?: Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  > & { force?: boolean }
): Promise<Collection<T>[]>;

export async function createCollection<T extends Object>(
  collections: any,
  opt?: Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  > & { force?: boolean }
): Promise<Collection<T> | Collection<T>[]> {
  const orm = new SnapJson(opt);
  if (Array.isArray(collections))
    return orm.createCollections<T>(collections, opt?.force);
  return orm.createCollection<T>(collections, opt?.force);
}

/**
 * Removes one or many collections.
 * @param {string | string[]} collections Name of collection to be removed. It can be either a string for single collection or an array of string for multiple collections.
 * @param opt - with properties:
 *  - path_db [path_db="db"]: Path of database dir
 *  - splitFile [splitFile=false]:
 *  - encrypted [encrypted=false]:
 *  - secretKey:
 *  - salt:
 *  - mode [mode="dev"] "dev" | "prod";
 *  - force [force=false]: If true, existing collection with the same name will be overwritten.
 * @returns The collections(e) that have been removed.
 */
export async function removeCollection(
  collections: string | string[],
  opt?: Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  > & { force?: boolean }
): Promise<typeof collections | undefined> {
  const orm = new SnapJson(opt);
  return orm.removeCollection(collections, opt?.force);
}

/**
 * Creates instance of document.
 * @param documents one document or array of documents.
 * @param path_id path to the database file.
 * @param collectionName name of the collection.
 * @returns Returns instance of document or an array of documents.
 */
export function defineDocument<T extends Object>(
  documents: T | T[],
  collectionName: string,
  opt: Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  >
): DocumentDataType<T> | Array<DocumentDataType<T>> {
  if (!Array.isArray(documents))
    return new Document<T>(
      structuredClone(documents),
      collectionName,
      opt
    ) as unknown as DocumentDataType<T>;
  else
    return documents.map(
      (el) =>
        new Document<T>(
          structuredClone(el),
          collectionName,
          opt
        ) as unknown as DocumentDataType<T>
    );
}
