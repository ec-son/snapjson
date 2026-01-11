import { Collection } from "./collection";
import { removeFile, sizeFile } from "../utils/utils.func";
import {
  CollectionInfoType,
  CollectionType,
  CreatingCollectionOptinType,
  DatabaseConfigType,
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

  constructor(opt?: DatabaseConfigType) {
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
    const existedCollection = await this._getCollections(collectionInfo);

    const isArray = Array.isArray(collections);
    const collectionsTab: string[] = [];
    if (!Array.isArray(collections)) collections = [collections];

    for (let collection of collections as CreatingCollectionOptinType<T>[]) {
      const newCollectionInfo: CollectionInfoType = { collectionName: "" };

      if (typeof collection === "string")
        collection = { collectionName: collection };

      // setting collection info
      newCollectionInfo.collectionName = collection.collectionName;
      newCollectionInfo.idStrategy = collection.idStrategy || "increment";
      newCollectionInfo.unique = [] as any[];
      newCollectionInfo.createdAt = collection.createdAt || false;
      newCollectionInfo.updatedAt = collection.updatedAt || false;

      // removal of duplicates
      for (const uniqueKey of collection.uniqueKeys || []) {
        if (!newCollectionInfo.unique.includes(uniqueKey as any))
          newCollectionInfo.unique.push(uniqueKey as any);
      }

      //setting Relations
      newCollectionInfo.relations = this._getRelations(
        collection.collectionName,
        [
          ...existedCollection,
          ...(collections as CreatingCollectionOptinType<T>[]).map(
            (el) => el.collectionName
          ),
        ],
        collection?.relations
      );

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
      if (this._opt.splitFile)
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
  private async _getCollections(
    collectionInfo?: CollectionInfoType[]
  ): Promise<string[]> {
    if (!collectionInfo)
      collectionInfo = (await this.loadData(
        "collection-info"
      )) as CollectionInfoType[];
    return collectionInfo.map((collection) => collection.collectionName);
  }

  async getCollections(): Promise<string[]> {
    return this._getCollections();
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
    return (await this._getCollections()).includes(collection);
  }

  async defineRelation(
    targetCollectionName: string,
    relation: string | string[] | RelationType | RelationType[],
    edit?: boolean
  ) {
    let collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType[];
    const existedCollection = await this._getCollections(collectionInfo);

    if (!existedCollection.includes(targetCollectionName))
      throw new Error(`Collection '${targetCollectionName}' doesn't exist.`);

    const index = collectionInfo.findIndex(
      (el) => el.collectionName === targetCollectionName
    );
    const collection = collectionInfo[index];

    const relations = this._getRelations(
      targetCollectionName,
      existedCollection,
      relation
    );

    for (const relation of relations) {
      const index = collection.relations.findIndex(
        (el) => el.collectionName === relation.collectionName
      );

      const oldRelation = collection.relations[index];
      if (edit) {
        if (!oldRelation)
          throw new Error(
            `Relation with this collection '${oldRelation.collectionName}' doesn't exist.`
          );
        collection.relations[index] = relation;
      } else {
        if (oldRelation)
          throw new Error(
            `Relation with this collection '${oldRelation.collectionName}' already exists.`
          );
        collection.relations.push(relation);
      }
    }

    collectionInfo[index] = collection;
    await this.saveData(collectionInfo, "collection-info");
    return relations.map((el) => el.collectionName);
  }

  async getRelations(collectionName: string) {
    let collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType[];

    const collection = collectionInfo.find(
      (el) => el.collectionName === collectionName
    );

    if (!collection)
      throw new Error(`Collection '${collectionName}' doesn't exist.`);

    return collection.relations || [];
  }

  async deleteRelation(
    targetCollectionName: string,
    sourceCollections: string | string[]
  ): Promise<string[]> {
    if (!Array.isArray(sourceCollections))
      sourceCollections = [sourceCollections];
    let collectionInfo = (await this.loadData(
      "collection-info"
    )) as CollectionInfoType[];

    const index = collectionInfo.findIndex(
      (el) => el.collectionName === targetCollectionName
    );

    const collection = collectionInfo[index];

    if (!collection)
      throw new Error(`Collection '${targetCollectionName}' doesn't exist.`);

    const deletedRelation = [];
    for (const child of sourceCollections) {
      if (collection.relations.find((el) => el.collectionName === child))
        deletedRelation.push(child);
    }

    const relations = collection.relations.filter(
      (el) => !sourceCollections.includes(el.collectionName)
    );

    collection.relations = relations;

    collectionInfo[index] = collection;
    await this.saveData(collectionInfo, "collection-info");

    return deletedRelation;
  }

  private _getRelations(
    targetCollection: string,
    existedCollections: string[],
    relations: string | string[] | RelationType | RelationType[]
  ): RelationType[] {
    if (!relations) return [];
    if (!Array.isArray(relations)) relations = [relations as any];

    const newRelations = [];

    for (const element of relations) {
      let relation: RelationType;
      if (typeof element === "string")
        relation = { collectionName: element } as RelationType;
      else relation = element;

      if (relation.collectionName === targetCollection) continue;
      if (!existedCollections.find((el) => el === relation.collectionName))
        throw new Error(
          `Collection '${relation.collectionName}' doesn't exist.`
        );

      relation.relationType ||= "hasOne";
      relation.localKey ||= `${
        relation.relationType === "belongsTo"
          ? relation.collectionName
          : targetCollection
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
