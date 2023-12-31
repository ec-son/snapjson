import { Collection } from "./collection";
import { loadData, saveData, sizeFile } from "../utils/utils.func";
import { DataBaseType, MetadataType } from "../types/orm.type";

export class SnapJson {
  private _pathDB: string;
  private _collection: string[] = [];
  private metadata: Array<MetadataType<Record<string, any>>> = [];

  constructor(path?: string) {
    this._pathDB = path || "db/db.json";
  }

  /**
   * COLLECTION
   */

  /**
   * Creates a new collection.
   * @param {string | Object} collection The name of the collection or an object with the following properties:
   *  - collectionName The name of the collection.
   *  - uniqueKeys An array containing all unique keys in this collection.
   * @param {boolean} force [force=false] If true, existing collection with the same name will be overwritten.
   * @returns Collection instance.
   */
  async createCollection<T extends Object>(
    collection:
      | string
      | { collectionName: string; uniqueKeys?: Array<keyof T> },
    force?: boolean
  ): Promise<Collection<T>> {
    return this.creatingCollection<T>(collection, force) as Promise<
      Collection<T>
    >;
  }

  /**
   * Creates new collections.
   * @param collections Array of collection names or Array of objects, each representing a collection with the following properties:
   *  - collectionName The name of the collection.
   *  - uniqueKeys An array containing all unique keys in this collection.
   * @param force [force=false] If true, existing collection with the same name will be overwritten.
   * @returns An array of collection instances
   */
  async createCollections<T extends Object>(
    collections:
      | string[]
      | { collectionName: string; uniqueKeys?: Array<keyof T> }[],
    force?: boolean
  ): Promise<Collection<T>[]> {
    return this.creatingCollection<T>(collections, force) as Promise<
      Collection<T>[]
    >;
  }

  private async creatingCollection<T extends Object>(
    collections: any,
    force?: boolean
  ): Promise<Collection<T> | Collection<T>[]> {
    const db = await this.loadData();
    const isArray = Array.isArray(collections);
    const collectionsTab: string[] = [];
    if (!Array.isArray(collections)) collections = [collections];
    if (!db["__metadata__"]) db["__metadata__"] = [];

    collections.forEach((collection: any) => {
      let name: string = "";
      let unique: string[] = [];

      if (typeof collection === "object") {
        name = collection["collectionName"];
        unique = (collection["uniqueKeys"] as Array<any>) || [];
      } else name = collection;

      if (collectionsTab.includes(name)) return;
      if (!name) throw new Error(`Connot create collection of undefined.`);

      if ("__metadata__" === name)
        throw new Error(`Connot create collection with '${name}' name.`);

      if (this._collection.includes(name) && !force)
        throw new Error(`Collection '${name}' already exists.`);
      else if (this._collection.includes(name)) {
        const index = (
          db["__metadata__"] as Array<MetadataType<Record<string, any>>>
        ).findIndex((el) => el.collectionName === name);
        if (index !== -1) db["__metadata__"].splice(index, 1);
      }

      db[name] = [];
      (db["__metadata__"] as Array<MetadataType<Record<string, any>>>).push({
        collectionName: name,
        unique,
      });
      collectionsTab.push(name);
    });

    if (collectionsTab.length > 0) {
      this.loadDataLocally(db);
      await this.saveData(db);
    }

    if (!isArray) return this.collection<T>(collectionsTab[0]);
    const col: Collection<T>[] = [];
    for (const iterator of collectionsTab) {
      const instance = await this.collection<T>(iterator);
      col.push(instance);
    }
    return col;
  }

  /**
   * Removes one or many collections.
   * @param {string | string[]} collections Name of collection to be removed. It can be either a string for single collection or an array of string for multiple collections.
   * @param force [force=false] If true, collections found with data will be removed.
   * @returns The collections(e) that have been removed.
   */
  async removeCollection(
    collections: string | string[],
    force: boolean = false
  ): Promise<typeof collections | undefined> {
    const db = await this.loadData();
    const isArray = Array.isArray(collections);
    if (!Array.isArray(collections)) collections = [collections];
    const collectionsTab: string[] = [];
    collections.forEach((collection) => {
      if (
        !this._collection.includes(collection) ||
        collection === "__metadata__"
      )
        return;
      if (db[collection].length > 0 && !force)
        throw new Error(
          `Cannot remove collection '${collection}' from database. Please try again with force argument.`
        );
      collectionsTab.push(collection);
      delete db[collection];
      const index = (
        db["__metadata__"] as Array<MetadataType<Record<string, any>>>
      ).findIndex((el) => el.collectionName === collection);
      if (index !== -1)
        (db["__metadata__"] as Array<MetadataType<Record<string, any>>>).splice(
          index,
          1
        );
    });

    if (collectionsTab.length > 0) {
      this.loadDataLocally(db);
      await this.saveData(db);
    }
    return isArray ? collectionsTab : collectionsTab[0];
  }

  /**
   * Returns instance of the specified collection
   * @param {string} collectionName Name of collection.
   * @param {boolean} force [force=false] Create collection when it doesn't exist.
   * @returns {Object} Instance of the specified collection if found.
   * @throws If the collection is not found, an error will be thrown.
   */
  async collection<T extends Object>(
    collectionName: string,
    force: boolean = false
  ): Promise<Collection<T>> {
    if (!(await this.isExistCollection(collectionName))) {
      if (!force)
        throw new Error(`Collection '${collectionName}' doesn't exist.`);
      return this.createCollection(collectionName);
    }
    return new Collection<T>(collectionName, this._pathDB);
  }

  /**
   *  Returns an array of collection names
   */
  async getCollections(): Promise<string[]> {
    if (this._collection.length === 0) await this.loadData();
    return this._collection;
  }

  /**
   * Checks if the specified collection exists in the database.
   * @param {string} collection The name of collection.
   * @returns {Promise<boolean>} Returns true if the collection exists in the database, otherwise returns false.
   *
   * @example
   * // Suppose we have a database containing user collection
   * // Here's how to use the isExistCollection method to check if the user collection exists.
   * const orm = new SnapJson();
   * const userExists = await orm.isExistCollection("user");
   * if (userExists) {
   *    console.log("The user collection exists.");
   * } else {
   *    console.log("The user collection doesn't exist.");
   * }
   */
  async isExistCollection(collection: string): Promise<boolean> {
    if (!collection && collection === "__metadata__") return false;
    if (this._collection.length === 0) await this.loadData();
    return this._collection.includes(collection);
  }

  /**
   * DATA BASE
   */

  /**
   * Returns size of the database
   */
  async size(): Promise<string> {
    return sizeFile(this.pathDB);
  }

  get pathDB(): string {
    return this._pathDB;
  }

  private async loadData(load: boolean = true): Promise<DataBaseType> {
    const db = await loadData(this._pathDB);
    if (load) {
      this.loadDataLocally(db);
    }
    return db;
  }

  private loadDataLocally(db: DataBaseType) {
    this._collection = Object.keys(db);
    const findIndex = this._collection.findIndex(
      (collectionName) => collectionName === "__metadata__"
    );
    if (findIndex !== -1) this._collection.splice(findIndex, 1);
    this.metadata =
      (db["__metadata__"] as Array<MetadataType<Record<string, any>>>) || [];
  }

  private async saveData(data: DataBaseType) {
    await saveData(this._pathDB, data);
  }
}

/**
 * Returns instance of collection
 * @param collectionName Name of collection
 * @param path Path of database file
 * @param {boolean} force [force=false] Create collection when it doesn't exist.
 * @returns Instance of the specified collection if found.
 * @throws If the collection is not found, an error will be thrown.
 */
export async function defineCollection<T extends Object>(
  collectionName: string,
  path?: string,
  force: boolean = false
): Promise<Collection<T>> {
  const orm = new SnapJson(path);
  return orm.collection(collectionName, force);
}

/**
 * Creates a new collection.
 * @param {string | { name: string; uniqueKeys?: Array<keyof T> }} collection The name of the collection or an object with the following properties:
 *  - name The name of the collection.
 *  - uniqueKeys An array containing all unique keys in this collection.
 * @param path Path of database file
 * @param force [force=false] If true, existing collection with the same name will be overwritten.
 * @returns Collection instance(s).
 */
export async function createCollection<T extends Object>(
  collection: string | { collectionName: string; uniqueKeys?: Array<keyof T> },
  path?: string,
  force?: boolean
): Promise<Collection<T>>;

export async function createCollection<T extends Object>(
  collections:
    | string[]
    | { collectionName: string; uniqueKeys?: Array<keyof T> }[],
  path?: string,
  force?: boolean
): Promise<Collection<T>[]>;

export async function createCollection<T extends Object>(
  collections: any,
  path?: string,
  force?: boolean
): Promise<Collection<T> | Collection<T>[]> {
  const orm = new SnapJson(path);
  if (Array.isArray(collections))
    return orm.createCollections<T>(collections, force);
  return orm.createCollection<T>(collections, force);
}

/**
 * Removes one or many collections.
 * @param {string | string[]} collections Name of collection to be removed. It can be either a string for single collection or an array of string for multiple collections.
 * @param path Path of database file
 * @param force [force=false] If true, collections found with data will be removed.
 * @returns The collections(e) that have been removed.
 */
export async function removeCollection(
  collections: string | string[],
  path?: string,
  force: boolean = false
): Promise<typeof collections | undefined> {
  const orm = new SnapJson(path);
  return orm.removeCollection(collections, force);
}
