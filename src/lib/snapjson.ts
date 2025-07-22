import { Collection } from "./collection";
import { removeFile, sizeFile } from "../utils/utils.func";
import {
  CollectionInfoType,
  CollectionType,
  CreatingCollectionOptinType,
  DatabaseInfoOptionType,
  OrmInfoType,
  RelationType,
} from "../types/orm.type";
import { loadData } from "../utils/load-data";
import { saveData } from "../utils/save-data";
import { join } from "path";
import { getOpts } from "../utils/opts.func";

export class SnapJson {
  private _opt: Pick<
    DatabaseInfoOptionType,
    Exclude<keyof DatabaseInfoOptionType, "flag">
  >;

  constructor(
    opt?: Partial<
      Pick<
        DatabaseInfoOptionType,
        Exclude<keyof DatabaseInfoOptionType, "flag">
      >
    >
  ) {
    this._opt = getOpts(opt);
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
  async createCollection<T>(
    collection: string | CreatingCollectionOptinType<T>,
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
  async createCollections<T>(
    collections: string[] | CreatingCollectionOptinType<T>[],
    force?: boolean
  ): Promise<Collection<T>[]> {
    return this.creatingCollection<T>(collections, force) as Promise<
      Collection<T>[]
    >;
  }

  private async creatingCollection<T>(
    collections: any,
    force?: boolean
  ): Promise<Collection<T> | Collection<T>[]> {
    let collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType[];
    const existedCollection = await this.getCollections(collectionInfo);

    const isArray = Array.isArray(collections);
    const collectionsTab: string[] = [];
    if (!Array.isArray(collections)) collections = [collections];

    for (let collection of collections as CreatingCollectionOptinType<T>[]) {
      const newCollectionInfo: CollectionInfoType = { collectionName: "" };

      if (typeof collection === "string")
        collection = { collectionName: collection };

      newCollectionInfo.collectionName = collection.collectionName;
      newCollectionInfo.idStrategy = collection.idStrategy || "increment";
      newCollectionInfo.unique = (collection.uniqueKeys as any[]) || [];
      newCollectionInfo.createdAt = collection.createdAt || false;
      newCollectionInfo.updatedAt = collection.updatedAt || false;

      const getRelations = (
        relations: string | string[] | RelationType | RelationType[]
      ): RelationType[] => {
        if (!relations) return [];
        if (!Array.isArray(relations)) relations = [relations as any];
        const newRelations = [];

        for (const element of relations) {
          let relation: RelationType;
          if (typeof element === "string")
            relation = { collectionName: element } as RelationType;
          else relation = element;

          if (relation.collectionName === collection.collectionName) continue;
          if (
            !collectionInfo.find(
              (el) => el.collectionName === relation.collectionName
            ) &&
            !(collections as CreatingCollectionOptinType<T>[]).find(
              (el) => el.collectionName === relation.collectionName
            )
          )
            throw new Error(
              `Collection '${relation.collectionName}' doesn't exist.`
            );

          relation.relationType ||= "hasOne";
          relation.localKey ||= `${
            relation.relationType === "belongsTo"
              ? relation.collectionName
              : collection.collectionName
          }Id`;

          const newRelation: RelationType = {
            collectionName: relation.collectionName,
            localKey: relation.localKey,
            foreignKey: relation.foreignKey || "__id",
            as: relation.as || relation.collectionName,
            onDelete: relation.onDelete || "SET NULL",
            onUpdate: relation.onUpdate || "CASCADE",
            relationType: relation.relationType,
          };

          newRelations.push(newRelation);
        }
        return newRelations;
      };

      newCollectionInfo.relations = getRelations(collection?.relations);

      if (collectionsTab.includes(newCollectionInfo.collectionName)) break;
      if (!newCollectionInfo.collectionName)
        throw new Error(`Connot create collection of undefined.`);

      if ("__metadata__" === newCollectionInfo.collectionName)
        throw new Error(`Connot create collection with '${name}' name.`);

      if (
        existedCollection.includes(newCollectionInfo.collectionName) &&
        !force
      )
        throw new Error(
          `Collection '${newCollectionInfo.collectionName}' already exists.`
        );
      else if (existedCollection.includes(newCollectionInfo.collectionName)) {
        collectionInfo = collectionInfo.filter(
          (el) => el.collectionName !== newCollectionInfo.collectionName
        );
        await saveData([], {
          ...this._opt,
          flag: newCollectionInfo.collectionName,
        });
      }

      collectionInfo.push(newCollectionInfo);
      collectionsTab.push(newCollectionInfo.collectionName);
    }
    if (collectionsTab.length > 0)
      await this.saveData(collectionInfo, "collection-info");

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
   * @param {string | string[]} collectionNames Name of collection to be removed. It can be either a string for single collection or an array of string for multiple collections.
   * @param force [force=false] If true, collections found with data will be removed.
   * @returns The collections(e) that have been removed.
   */
  async removeCollection(
    collectionNames: string | string[],
    force: boolean = false
  ): Promise<typeof collectionNames | undefined> {
    const collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType[];
    const existedCollection = collectionInfo.map(
      (collection) => collection.collectionName
    );

    const isArray = Array.isArray(collectionNames);

    if (!Array.isArray(collectionNames)) collectionNames = [collectionNames];
    const collectionsTab: string[] = [];
    for await (const collectionName of collectionNames) {
      if (!existedCollection.includes(collectionName)) return;

      const collectionData = (await loadData({
        ...this._opt,
        flag: collectionName,
      })) as CollectionType<any>;
      if (collectionData.length > 0 && !force)
        throw new Error(
          `Cannot remove collection '${collectionName}' from database. Please try again with force argument.`
        );

      collectionsTab.push(collectionName);
      removeFile(join(this._opt.path_db, collectionName));
      const index = collectionInfo.findIndex(
        (collection) => collection.collectionName === collectionName
      );
      if (index !== -1) collectionInfo.splice(index, 1);
    }

    if (collectionsTab.length > 0)
      await this.saveData(collectionInfo, "collection-info");

    return isArray ? collectionsTab : collectionsTab[0];
  }

  /**
   * Returns instance of the specified collection
   * @param {string} collectionName Name of collection.
   * @param {boolean} force [force=false] Create collection when it doesn't exist.
   * @returns {Object} Instance of the specified collection if found.
   * @throws If the collection is not found, an error will be thrown.
   */
  async collection<T>(
    collectionName: string,
    force: boolean = false
  ): Promise<Collection<T>> {
    if (!(await this.isExistCollection(collectionName))) {
      if (!force)
        throw new Error(`Collection '${collectionName}' doesn't exist.`);
      return this.createCollection(collectionName);
    }
    return new Collection<T>(collectionName, this._opt);
  }

  /**
   *  Returns an array of collection names
   */
  async getCollections(
    collectionInfo?: CollectionInfoType[]
  ): Promise<string[]> {
    if (!collectionInfo)
      collectionInfo = (await this.loadData(
        "collection-info"
      )) as CollectionInfoType[];
    return collectionInfo.map((collection) => collection.collectionName);
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
    return (await this.getCollections()).includes(collection);
  }

  /**
   * DATA BASE
   */

  /**
   * Returns size of the database
   */
  async size(): Promise<string> {
    return sizeFile({ ...this._opt, flag: "orm-info" });
  }

  get pathDB(): string {
    return this._opt.path_db;
  }

  private async loadData(
    flag: "orm-info" | "collection-info"
  ): Promise<OrmInfoType | CollectionInfoType[]> {
    return (await loadData({ ...this._opt, flag })) as
      | OrmInfoType
      | CollectionInfoType[];
  }

  private async saveData(
    data: OrmInfoType | CollectionInfoType[],
    flag: "orm-info" | "collection-info"
  ) {
    await saveData(data, { ...this._opt, flag });
  }
}
