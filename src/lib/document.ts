import { isEqual } from "../utils/utils.func";
import { Collection } from "./collection";
import { defineCollection } from "./orm-json";

export class Document<T extends Object> {
  private id: number = -1;
  private collection: Collection<T> | null = null;
  [key: string]: any;
  private privateProps = [
    "collectionName",
    "path_id",
    "document",
    "id",
    "collection",
    "__id",
    "privateProps",
  ];

  constructor(
    private document: T,
    private path_id: string,
    private collectionName: string
  ) {
    Object.keys(this.document).forEach((key: string) => {
      this[key] = this.document[key as keyof T];
    });

    if ((document as { __id?: number }).__id) {
      this.id = (document as { __id?: number }).__id!;
      const { __id, ...rest } = document as any;
      document = rest;
    }
  }

  /**
   * Convert this document into JavaScript object.
   * @returns Converted document.
   */
  toObject(): T {
    const document = structuredClone(this.document);

    for (const key of Object.keys(this)) {
      if (this.hasOwnProperty(key) && !this.privateProps.includes(key)) {
        document[key as keyof T] = this[key];
      }
    }

    if (this.id !== -1) (document as { __id?: number })["__id"] = this.id;
    return document;
  }

  /**
   * Convert this document into a JSON.
   * @returns String representing the document.
   */
  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  private async init() {
    if (this.collection) return;
    this.collection = await defineCollection<T>(
      this.collectionName,
      this.path_id
    );
  }

  /**
   * Update this document.
   * @returns Returns true if the document is successfully updated, false otherwise.
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
   * Delete this document.
   * @returns Returns true if the document is successfully deleted, false otherwise.
   */
  async delete() {
    await this.init();
    return (
      (await this.collection?.deleteOne({ __id: this.id } as any)) !== null
    );
  }
}
