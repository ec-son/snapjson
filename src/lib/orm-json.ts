import { Collection } from "./collection";
import { loadData, saveData, sizeFile } from "../utils/utils.func";
import { DataBaseType, MetadataType } from "../type/orm.type";

export class OrmJson {
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
   * @returns The name of collection
   */
  async createCollection<T>(
    collection:
      | string
      | { collectionName: string; uniqueKeys?: Array<keyof T> },
    force?: boolean
  ): Promise<string> {
    return this.creatingCollection(collection, force) as Promise<string>;
  }

  /**
   * Creates new collections.
   * @param collections Array of collection names or Array of objects, each representing a collection with the following properties:
   *  - collectionName The name of the collection.
   *  - uniqueKeys An array containing all unique keys in this collection.
   * @param force [force=false] If true, existing collection with the same name will be overwritten.
   * @returns An array of collection names.
   */
  async createCollections<T>(
    collections:
      | string[]
      | { collectionName: string; uniqueKeys?: Array<keyof T> }[],
    force?: boolean
  ): Promise<string[]> {
    return this.creatingCollection(collections, force) as Promise<string[]>;
  }

  private async creatingCollection(
    collections: any,
    force?: boolean
  ): Promise<string | string[]> {
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

    return isArray ? collectionsTab : collectionsTab[0];
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
   * @param {string} collectionName Name of collection
   * @returns {Object} Instance of the specified collection if found.
   * @throws If the collection is not found, an error will be thrown.
   */
  async collection<T extends Object>(
    collectionName: string
  ): Promise<Collection<T>> {
    if (!(await this.isExistCollection(collectionName))) {
      throw new Error(`Collection '${collectionName}' doesn't exist`);
    }
    return new Collection<T>(this._pathDB, collectionName);
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
   * const orm = new OrmJson();
   * const userExists = await orm.isExistCollection("user");
   * if (userExists) {
   *    console.log("The user collection exists.");
   * } else {
   *    console.log("The user collection does not exist.");
   * }
   */
  async isExistCollection(collection: string): Promise<boolean> {
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
    saveData(this._pathDB, data);
  }
}

/**
 * Returns instance of collection
 * @param collectionName Name of collection
 * @param path Path of database file
 * @returns Instance of the specified collection if found.
 * @throws If the collection is not found, an error will be thrown.
 */
export async function defineCollection<T extends Object>(
  collectionName: string,
  path?: string
): Promise<Collection<T>> {
  const orm = new OrmJson(path);
  return orm.collection(collectionName);
}

/**
 * Creates a new collection.
 * @param {string | { name: string; uniqueKeys?: Array<keyof T> }} collection The name of the collection or an object with the following properties:
 *  - name The name of the collection.
 *  - uniqueKeys An array containing all unique keys in this collection.
 * @param path Path of database file
 * @param force [force=false] If true, existing collection with the same name will be overwritten.
 * @returns Returns the name of collection
 */
export async function createCollection<T>(
  collection: string | { collectionName: string; uniqueKeys?: Array<keyof T> },
  path?: string,
  force?: boolean
): Promise<string>;

export async function createCollection<T>(
  collections:
    | string[]
    | { collectionName: string; uniqueKeys?: Array<keyof T> }[],
  path?: string,
  force?: boolean
): Promise<string[]>;

export async function createCollection(
  collections: any,
  path?: string,
  force?: boolean
): Promise<string | string[]> {
  const orm = new OrmJson(path);
  if (Array.isArray(collections))
    return orm.createCollections(collections, force);
  return orm.createCollection(collections, force);
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
  const orm = new OrmJson(path);
  return orm.removeCollection(collections, force);
}
