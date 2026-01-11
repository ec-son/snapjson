import { defineCollection } from "../utils/shortcutFunc";
import { isEqual } from "../utils/utils.func";
import { Collection } from "./collection";
import { DatabaseInfoOptionType } from "../types/orm.type";

export class Document<T extends Object> {
  private id: number = -1;
  private collection: Collection<T> | null = null;
  [key: string]: any;
  private privateProps = [
    "collectionName",
    "path_db",
    "document",
    "id",
    "collection",
    "__id",
    "privateProps",
  ];
  private _opt: DatabaseInfoOptionType = {
    path_db: "db",
    mode: "dev",
    splitFile: false,
    flag: "",
  };

  constructor(
    private document: T,
    private collectionName: string,
    opt: Partial<
      Pick<
        DatabaseInfoOptionType,
        Exclude<keyof DatabaseInfoOptionType, "flag">
      >
    >
  ) {
    Object.keys(this.document).forEach((key: string) => {
      this[key] = this.document[key as keyof T];
    });

    if ((document as { __id?: number }).__id) {
      this.id = (document as { __id?: number }).__id!;
      const { __id, ...rest } = document as any;
      document = rest;
    }

    this._opt = { ...(opt as any), flag: collectionName };
  }

  /**
   * Converts this document into JavaScript object.
   * @returns Converted document.
   */
  toObject(): T {
    const document = structuredClone(this.document);

    for (const key of Object.keys(this)) {
      if (this.hasOwnProperty(key) && !this.privateProps.includes(key)) {
        if (key === "_opt") continue;
        document[key as keyof T] = this[key];
      }
    }

    if (this.id !== -1) (document as { __id?: number })["__id"] = this.id;
    return document;
  }

  /**
   * Converts this document into JSON.
   * @returns String representing the document.
   */
  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  private async init() {
    if (this.collection) return;
    this.collection = await defineCollection<T>(this.collectionName, this._opt);
  }

  /**
   * Saves this document.
   * @returns Returns true if the document is successfully saved, false otherwise.
   */
  async save() {
    await this.init();
    let document = this.toObject();

    let data: T = {} as T;
    (Object.keys(this.document) as Array<keyof T>).forEach((key) => {
      if (!isEqual(this.document[key], document[key]))
        data[key] = document[key];
    });

    if ((data as { __id?: number }).__id) {
      const { __id, ...rest } = data as any;
      data = rest;
    }

    return (
      (await this.collection?.updateOne(data, { __id: this.id } as any)) !==
      null
    );
  }

  /**
   * Updates this document.
   *
   * Updates the properties of the document and updates the document in the database if the `save` flag is set to true.
   *
   * @param obj - The properties to update.
   * @param save - If true the document will be saved in the database.
   * @returns - Returns true if the document is successfully updated, false otherwise.
   */
  async update(obj: Partial<T>, save?: boolean): Promise<boolean> {
    const { __id, ...rest } = obj as any;
    obj = rest;
    if (!obj && Object.keys(obj).length < 1) return true;

    // updating properties
    for (const key of Object.keys(obj)) {
      if (
        Object.keys(this.document).includes(key) &&
        !isEqual(this.document[key], obj[key])
      ) {
        // updating the document properties
        this.document[key] = obj[key];
        // updating the document object properties
        this[key] = obj[key] as any;
      }
    }

    if (save) {
      // saving the updated document to the database
      return await this.save();
    }

    return true;
  }

  /**
   * Deletes this document.
   * @returns Returns true if the document is successfully deleted, false otherwise.
   */
  async delete() {
    await this.init();
    return (
      (await this.collection?.deleteOne({ __id: this.id } as any)) !== null
    );
  }
}
