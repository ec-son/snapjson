import { defineCollection } from "../utils/shortcutFunc";
import { isEqual } from "../utils/utils.func";
import { Collection } from "./collection";
import { DatabaseConfigType, DatabaseInfoOptionType } from "../types/orm.type";
import { getOpts } from "../utils/opts.func";

export class Document<T extends Object> {
  private id: number = -1;
  private collection: Collection<T> | null = null;
  [key: string]: any;
  private _opt: DatabaseInfoOptionType;

  constructor(
    private document: T,
    private collectionName: string,
    opt: DatabaseConfigType
  ) {
    for (const key of Object.keys(document)) {
      this[key] = document[key as keyof T];
    }

    if ((document as { __id?: number }).__id) {
      const { __id, ...rest } = document as any;
      this.id = __id;
      this.document = rest;
    }

    this._opt = { ...getOpts(opt), flag: collectionName };
  }

  /**
   * Converts this document into JavaScript object.
   * @returns Converted document.
   */
  toObject(): T {
    const document: typeof this.document = {} as any;

    for (const key of Object.keys(this.document)) {
      document[key as keyof T] = this[key];
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

    for (const key of Object.keys(this.document)) {
      if (!isEqual(this.document[key], document[key]))
        data[key] = document[key];
    }
    if (!data || Object.keys(data).length < 1) return false;

    const saved =
      (await this.collection?.updateOne(data, { __id: this.id } as any)) !==
      null;

    if (saved) {
      for (const key of Object.keys(data)) {
        this.document[key] = data[key];
      }
    }
    return saved;
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
    if (!obj || Object.keys(obj).length < 1) return false;

    for (const key of Object.keys(obj)) {
      if (
        !isEqual(this[key], obj[key]) &&
        Object.keys(this.document).includes(key)
      )
        // updating properties
        this[key] = obj[key] as any;
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
