import { EcEntity } from "./ec_entity";
import { EcDbType, EcMetadata } from "./ec_type";
import { isExistFile, loadData, saveData } from "./utils/utils.func";

export class EcOrmJson {
  private _pathDB: string;
  private _entities: string[] = [];
  private metadata: Array<EcMetadata<{}>> = [];

  constructor(path?: string) {
    this._pathDB = path || "db/db.json";
  }

  /**
   * ENTITY INSTANCE
   */

  async createEntity<T extends Object>(entity: string): Promise<EcEntity<T>> {
    if (!(await this.isExistEntity(entity))) {
      throw new Error(`${entity} Entity doesn't exist`);
    }
    return new EcEntity<T>(this._pathDB, entity);
  }

  /**
   * ENTITY
   */

  async addEntity<T>(
    entity: string | { name: string; uniqueProperties?: Array<keyof T> },
    force?: boolean
  ): Promise<string> {
    return this.addingEntity(entity, force) as Promise<string>;
  }

  async addEntities<T>(
    entities: string[] | { name: string; uniqueProperties?: Array<keyof T> }[],
    force?: boolean
  ): Promise<string[]> {
    return this.addingEntity(entities, force) as Promise<string[]>;
  }

  private async addingEntity(
    entities: any,
    force?: boolean
  ): Promise<string | string[]> {
    const db = await this.loadData();
    const isArray = Array.isArray(entities);
    const entitiesTab: string[] = [];
    if (!Array.isArray(entities)) entities = [entities];
    if (!db["__metadata__"]) db["__metadata__"] = [];

    entities.forEach((entity: any) => {
      let name: string = "";
      let unique: string[] = [];

      if (typeof entity === "object") {
        name = entity["name"];
        unique = entity["uniqueProperties"] || [];
      } else name = entity;

      if (entitiesTab.includes(name)) return;
      if (!name) throw new Error(`connot create entity of undefined.`);

      if ("__metadata__" === name)
        throw new Error(`connot create entity with ${name} name.`);

      if (this._entities.includes(name) && !force)
        throw new Error(`Entity ${name} already exists.`);
      else if (this._entities.includes(name)) {
        const index = db["__metadata__"].findIndex((el) => el.entity === name);
        if (index !== -1) db["__metadata__"].splice(index, 1);
      }

      db[name] = [];
      db["__metadata__"].push({ entity: name, unique });
      entitiesTab.push(name);
    });

    if (entitiesTab.length > 0) {
      this.loadDataLocally(db);
      await this.saveData(db);
    }

    return isArray ? entitiesTab : entitiesTab[0];
  }

  async removeEntity(
    entities: string | string[],
    force: boolean = false
  ): Promise<typeof entities | undefined> {
    const db = await this.loadData();
    const isArray = Array.isArray(entities);
    if (!Array.isArray(entities)) entities = [entities];
    const entitiesTab: string[] = [];
    entities.forEach((entity) => {
      if (!this._entities.includes(entity) || entity === "__metadata__") return;
      if (db[entity].length > 0 && !force)
        throw new Error(
          `Cannot remove entity '${entity}' from database. Please try again with force argument.`
        );
      entitiesTab.push(entity);
      delete db[entity];
      const index = db["__metadata__"].findIndex((el) => el.entity === entity);
      if (index !== -1) db["__metadata__"].splice(index, 1);
    });

    if (entitiesTab.length > 0) {
      this.loadDataLocally(db);
      await this.saveData(db);
    }
    return isArray ? entitiesTab : entitiesTab[0];
  }

  async geEntities(): Promise<string[]> {
    if (this._entities.length === 0) await this.loadData();
    return this._entities;
  }

  /**
   * Checks if the specified entity exists in the database.
   * @param {string} entity The name of the entity to check in the database.
   * @returns {Promise<boolean>} Returns true if the entity exists in the database, otherwise returns false.
   *
   * @example
   * // Suppose we have a database containing user entity
   * // Here's how to use the isExistEntity method to check if the user entity exists in the database.
   * const orm = new OrmJson();
   * const userExists = await orm.isExistEntity("user");
   * if (userExists) {
   *    console.log("The user entity exists in the database.");
   * } else {
   *    console.log("The user entity does not exist in the database.");
   * }
   */
  async isExistEntity(entity: string): Promise<boolean> {
    if (this._entities.length === 0) await this.loadData();
    return this._entities.includes(entity);
  }

  /**
   * DATA BASE
   */

  testDatabase(path_db?: string): Promise<boolean> {
    return isExistFile(path_db || this._pathDB, true);
  }

  get pathDB(): string {
    return this._pathDB;
  }

  private async loadData(load: boolean = true): Promise<EcDbType> {
    const db = await loadData(this._pathDB);
    if (load) {
      this.loadDataLocally(db);
    }
    return db;
  }

  private loadDataLocally(db: EcDbType) {
    this._entities = Object.keys(db);
    this.metadata = (db["__metadata__"] as Array<EcMetadata<{}>>) || [];
  }

  private async saveData(data: EcDbType) {
    saveData(this._pathDB, data);
  }
}
