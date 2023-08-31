export type DocumentDataType<T extends Object> = {
  [key in keyof T]: T[key];
} & {
  /**
   * Converts this document into JavaScript object.
   * @returns Converted document.
   */
  toObject(): T;
  /**
   * Converts this document into JSON.
   * @returns String representing the document.
   */
  toJSON(): string;

  /**
   * Updates this document.
   * @returns Returns true if the document is successfully updated, false otherwise.
   */
  save(): Promise<boolean>;
  /**
   * Deletes this document.
   * @returns Returns true if the document is successfully deleted, false otherwise.
   */
  delete(): Promise<boolean>;
};
