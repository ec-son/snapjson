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
    private document: T | Partial<T>,
    private path_id: string,
    private collectionName: string
  ) {
    Object.keys(this.document).forEach((key: string) => {
      this[key] = this.document[key as keyof T];
    });

    if ((document as { __id?: number }).__id) {
      this.id = (document as { __id?: number }).__id!;
      delete (document as { __id?: number }).__id;
    }
  }

  /**
   * Convert this document into JavaScript object.
   * @returns Converted document.
   */
  toObject(): T | Partial<T> {
    const document = this.document;

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
    const document = this.toObject();

    if ((document as { __id?: number }).__id) {
      delete (document as { __id?: number }).__id;
    }

    return (
      (await this.collection?.updateOne(document, {
        eq: { __id: this.id } as Partial<{ __id: number } & T>,
      })) !== null
    );
  }

  /**
   * Delete this document.
   * @returns Returns true if the document is successfully deleted, false otherwise.
   */
  async delete() {
    await this.init();
    return (
      (await this.collection?.deleteOne({
        eq: { __id: this.id } as Partial<{ __id: number } & T>,
      })) !== null
    );
  }
}
